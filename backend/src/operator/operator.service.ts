import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LoggingService } from '../logging/logging.service';
import * as oracledb from 'oracledb';

interface JobRow {
  PAGE_COUNT: number;
  COPIES: number;
  JOB_ID?: number;
}

interface BinRow {
  MAX_PAGE_CAPACITY: number;
  USED_PAGES: number;
}

@Injectable()
export class OperatorService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
    private readonly loggingService: LoggingService,
  ) { }

  private async getAssignedKiosk(
    conn: oracledb.Connection,
    userId: number,
  ): Promise<number | null> {
    const result = await conn.execute(
      `SELECT Assigned_Kiosk FROM OPERATOR WHERE User_ID = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const rows = result.rows as Record<string, unknown>[];
    return rows.length > 0 ? (rows[0].ASSIGNED_KIOSK as number) : null;
  }

  // --- Helper: Get Current Status ---
  async getJobCurrentStatus(jobId: number): Promise<string> {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT Status_Name FROM V_JOB_DETAILS WHERE Job_ID = :jobId`,
        { jobId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const rows = result.rows as any[];
      return rows.length > 0 ? rows[0].STATUS_NAME : 'Unknown';
    } finally {
      await conn.close();
    }
  }

  // --- GET: Operator Queue (FIXED SCHEMA ISOLATION) ---
  async getQueue(userId: number) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      if (!kioskId) {
        throw new BadRequestException(
          'Operator account contains no verified active kiosk machine node routing assignment.',
        );
      }

      // Capture assigned binned items OR completely unassigned pending/printing jobs
      const query = `
      SELECT * FROM V_JOB_DETAILS 
      WHERE (Status_Name IN ('Pending', 'Printing') AND Kiosk_ID IS NULL)
         OR (Kiosk_ID = :kioskId AND Status_Name IN ('Printing', 'Binned'))
      ORDER BY Priority_level DESC, Collection_slot ASC
    `;

      const result = await conn.execute(
        query,
        { kioskId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return (result.rows as any[]).map((row: any) => {
        const obj: any = {};
        for (const key in row) {
          const camelKey = key
            .toLowerCase()
            .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          obj[camelKey] = row[key];
        }
        return obj;
      });
    } finally {
      await conn.close();
    }
  }

  // --- GET: Kiosk Bins ---
  async getBins(userId: number) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      if (!kioskId)
        throw new BadRequestException('No kiosk assigned to operator');

      const result = await conn.execute(
        `SELECT b.Kiosk_ID, b.Bin_ID, b.Max_page_capacity, b.used_pages, b.Bin_status
         FROM COLLECTION_BINS b
         WHERE b.Kiosk_ID = :kioskId`,
        { kioskId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return (result.rows as Record<string, unknown>[] | any).map(
        (row: any) => ({
          kioskId: row.KIOSK_ID as number,
          binId: row.BIN_ID as string,
          maxPageCapacity: row.MAX_PAGE_CAPACITY as number,
          usedPages: row.USED_PAGES as number,
          remainingCapacity:
            (row.MAX_PAGE_CAPACITY as number) - (row.USED_PAGES as number),
          binStatus: row.BIN_STATUS as string,
        }),
      );
    } finally {
      await conn.close();
    }
  }

  // --- TASK 1: Assign Bin with Capacity Tracking ---
  async assignBin(userId: number, jobId: number, binId: string) {
    const oldStatus = await this.getJobCurrentStatus(jobId);
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      if (!kioskId) throw new BadRequestException('No kiosk assigned');

      // 1. Calculate effective pages
      const jobRes = await conn.execute(
        `SELECT Page_count, copies FROM PRINT_JOB WHERE Job_ID = :jobId`,
        { jobId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const jobRow = (jobRes.rows as JobRow[])[0];
      if (!jobRow) throw new NotFoundException('Job not found');

      const effectivePages = jobRow.PAGE_COUNT * jobRow.COPIES;

      // 2. Lock and check bin capacity
      const binRes = await conn.execute(
        `SELECT Max_page_capacity, used_pages FROM COLLECTION_BINS 
         WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId FOR UPDATE`,
        { kioskId, binId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const binRow = (binRes.rows as BinRow[])[0];
      if (!binRow) throw new NotFoundException('Bin not found');

      if (binRow.USED_PAGES + effectivePages > binRow.MAX_PAGE_CAPACITY) {
        throw new BadRequestException(
          'Bin does not have sufficient capacity for this job',
        );
      }

      // 3. Execute Updates in Transaction
      await conn.execute(
        `UPDATE COLLECTION_BINS SET used_pages = used_pages + :effectivePages 
         WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { effectivePages, kioskId, binId },
        { autoCommit: false },
      );

      await conn.execute(
        `INSERT INTO PLACED_IN (Job_ID, Kiosk_ID, Bin_ID) VALUES (:jobId, :kioskId, :binId)`,
        { jobId, kioskId, binId },
        { autoCommit: false },
      );

      await conn.execute(
        `UPDATE KIOSK SET Current_load = Current_load + :effectivePages WHERE Kiosk_ID = :kioskId`,
        { effectivePages, kioskId },
        { autoCommit: false },
      );

      await conn.execute(
        `UPDATE HAS_STATUS 
          SET Status_ID = (SELECT Status_ID FROM JOB_STATUS WHERE Status_Name = 'Printing')
          WHERE Job_ID = :jobId`,
        { jobId },
        { autoCommit: false },
      );

      await conn.commit();

      await this.loggingService.logAction(
        userId,
        'STATUS_UPDATE',
        'PRINT_JOB',
        String(jobId),
        oldStatus,
        'Printing',
      );
      return {
        message: 'Job assigned to bin',
        kioskId,
        binId,
        jobId,
        effectivePages,
      };
    } catch (e: any) {
      await conn.rollback();
      throw e instanceof BadRequestException || e instanceof NotFoundException
        ? e
        : new InternalServerErrorException(e.message);
    } finally {
      await conn.close();
    }
  }

  // --- TASK 2: Handover Job (Release Capacity) ---
  async handoverJob(userId: number, jobId: number) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      if (!kioskId) throw new BadRequestException('No kiosk assigned');

      const placementRes = await conn.execute(
        `SELECT pj.Page_count, pj.copies, pi.Bin_ID 
         FROM PRINT_JOB pj 
         JOIN PLACED_IN pi ON pj.Job_ID = pi.Job_ID 
         WHERE pj.Job_ID = :jobId AND pi.Kiosk_ID = :kioskId FOR UPDATE`,
        { jobId, kioskId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const row = (placementRes.rows as any[])[0];
      if (!row)
        throw new NotFoundException(
          'Job not found in your assigned kiosk bins',
        );

      const effectivePages = row.PAGE_COUNT * row.COPIES;
      const binId = row.BIN_ID;

      await conn.execute(
        `UPDATE COLLECTION_BINS SET used_pages = used_pages - :effectivePages 
         WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { effectivePages, kioskId, binId },
        { autoCommit: false },
      );

      await conn.execute(
        `UPDATE KIOSK SET Current_load = Current_load - :effectivePages WHERE Kiosk_ID = :kioskId`,
        { effectivePages, kioskId },
        { autoCommit: false },
      );

      await conn.execute(
        `BEGIN SP_CONFIRM_HANDOVER(:jobId, :kioskId, :binId); END;`,
        { jobId, kioskId, binId },
        { autoCommit: false },
      );

      await conn.commit();
      await this.loggingService.logAction(
        userId,
        'JOB_COLLECTED',
        'PRINT_JOB',
        String(jobId),
      );
      return {
        message: 'Handover confirmed',
        jobId,
        releasedPages: effectivePages,
      };
    } catch (e: any) {
      await conn.rollback();
      throw e instanceof BadRequestException || e instanceof NotFoundException
        ? e
        : new InternalServerErrorException(e.message);
    } finally {
      await conn.close();
    }
  }

  // --- TASK 3: Discard Job (Release Capacity) ---
  async discardJob(userId: number, jobId: number) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);

      const placementRes = await conn.execute(
        `SELECT pj.Page_count, pj.copies, pi.Bin_ID, s.User_ID as OWNER_ID
         FROM PRINT_JOB pj 
         JOIN PLACED_IN pi ON pj.Job_ID = pi.Job_ID 
         JOIN SUBMITS s ON pj.Job_ID = s.Job_ID
         WHERE pj.Job_ID = :jobId AND pi.Kiosk_ID = :kioskId FOR UPDATE`,
        { jobId, kioskId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const row = (placementRes.rows as any[])[0];
      if (!row) throw new NotFoundException('Job not found in kiosk bins');

      const effectivePages = row.PAGE_COUNT * row.COPIES;
      const binId = row.BIN_ID;
      const ownerId = row.OWNER_ID;

      await conn.execute(
        `UPDATE COLLECTION_BINS SET used_pages = used_pages - :effectivePages 
         WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { effectivePages, kioskId, binId },
        { autoCommit: false },
      );

      await conn.execute(
        `UPDATE KIOSK SET Current_load = Current_load - :effectivePages WHERE Kiosk_ID = :kioskId`,
        { effectivePages, kioskId },
        { autoCommit: false },
      );

      await conn.execute(
        `DELETE FROM PLACED_IN WHERE Job_ID = :jobId`,
        { jobId },
        { autoCommit: false },
      );

      await conn.execute(
        `UPDATE HAS_STATUS 
          SET Status_ID = (SELECT Status_ID FROM JOB_STATUS WHERE Status_Name = 'Discarded')
          WHERE Job_ID = :jobId`,
        { jobId },
        { autoCommit: false },
      );

      await conn.commit();
      await this.loggingService.logAction(
        userId,
        'JOB_DISCARDED',
        'PRINT_JOB',
        String(jobId),
      );

      if (ownerId) {
        await this.notifications.createNotification(
          ownerId,
          'Job Discarded',
          `Your print job #${jobId} was discarded.`,
          'job_discarded',
          jobId,
        );
      }

      return { message: 'Job discarded', jobId, releasedPages: effectivePages };
    } catch (e: any) {
      await conn.rollback();
      throw e instanceof BadRequestException || e instanceof NotFoundException
        ? e
        : new InternalServerErrorException(e.message);
    } finally {
      await conn.close();
    }
  }

  // --- TASK 4: QR Token Lookup ---
  async getJobByQrToken(token: string) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT j.Job_ID, u.First_Name, u.Last_Name, u.EMail, v.Status_Name, 
                j.Page_count, j.copies, j.Job_type, v.Collection_slot, v.Expiry_time, 
                pi.Kiosk_ID, k.Location_name, pi.Bin_ID
         FROM PRINT_JOB j
         JOIN SUBMITS s ON j.Job_ID = s.Job_ID
         JOIN APP_USER u ON s.User_ID = u.User_ID
         JOIN V_JOB_DETAILS v ON j.Job_ID = v.Job_ID
         LEFT JOIN PLACED_IN pi ON j.Job_ID = pi.Job_ID
         LEFT JOIN KIOSK k ON pi.Kiosk_ID = k.Kiosk_ID
         WHERE j.QR_Secure_Token = :token`,
        { token },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const row: any = (result.rows as any[])[0];
      if (!row) throw new NotFoundException('Invalid or expired QR token');
      if (row.STATUS_NAME !== 'Binned')
        throw new BadRequestException('Job is not ready for collection');

      const isExpired = new Date() > new Date(row.EXPIRY_TIME);

      return {
        jobId: row.JOB_ID,
        userFirstName: row.FIRST_NAME,
        userLastName: row.LAST_NAME,
        userEmail: row.EMAIL,
        statusName: row.STATUS_NAME,
        pageCount: row.PAGE_COUNT,
        copies: row.COPIES,
        jobType: row.JOB_TYPE,
        collectionSlot: row.COLLECTION_SLOT,
        expiryTime: row.EXPIRY_TIME,
        kioskId: row.KIOSK_ID,
        locationName: row.LOCATION_NAME,
        binId: row.BIN_ID,
        isExpired,
      };
    } finally {
      await conn.close();
    }
  }

  // --- UPDATE: Bin Maintenance Status ---
  async updateBin(userId: number, binId: string, binStatus: string) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      if (!kioskId) throw new BadRequestException('No kiosk assigned');

      const oldBinStatusRes = await conn.execute(
        `SELECT Bin_status FROM COLLECTION_BINS WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { kioskId, binId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const oldStatus =
        (oldBinStatusRes.rows as any[])[0]?.BIN_STATUS || 'Unknown';

      await conn.execute(
        `UPDATE COLLECTION_BINS SET Bin_status = :status WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { status: binStatus, kioskId, binId },
        { autoCommit: true },
      );

      await this.loggingService.logAction(
        userId,
        'BIN_STATUS_UPDATE',
        'COLLECTION_BINS',
        `${kioskId}_${binId}`,
        oldStatus,
        binStatus,
      );
      return { message: 'Bin updated', kioskId, binId, binStatus };
    } finally {
      await conn.close();
    }
  }

  // --- GET: Operator Profile ---
  async getProfile(userId: number) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT v.*, o.Assigned_kiosk, k.Location_name, k.Status as Kiosk_status
         FROM V_USER_PROFILE v
         JOIN OPERATOR o ON v.User_ID = o.User_ID
         LEFT JOIN KIOSK k ON o.Assigned_kiosk = k.Kiosk_ID
         WHERE v.User_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const row = (result.rows as any[])[0];
      if (!row) throw new BadRequestException('Profile not found');

      return {
        userId: row.USER_ID,
        name: row.NAME,
        email: row.EMAIL,
        role: row.ROLE,
        assignedKiosk: row.ASSIGNED_KIOSK,
        kioskLocation: row.LOCATION_NAME,
        kioskStatus: row.KIOSK_STATUS,
      };
    } finally {
      await conn.close();
    }
  }
}
