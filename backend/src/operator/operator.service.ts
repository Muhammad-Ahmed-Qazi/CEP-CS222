import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as oracledb from 'oracledb';

@Injectable()
export class OperatorService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getAssignedKiosk(
    conn: oracledb.Connection,
    userId: number,
  ): Promise<number | null> {
    const result = await conn.execute(
      `SELECT Assigned_Kiosk FROM OPERATOR WHERE User_ID = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const rows = result.rows as any[];
    return rows.length > 0 ? rows[0].ASSIGNED_KIOSK : null;
  }

  async getQueue(userId: number) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      let query = `SELECT * FROM V_JOB_DETAILS WHERE Status_Name IN ('Pending', 'Printing')`;
      const binds: Record<string, any> = {};

      if (kioskId) {
        // Assuming jobs belong to a kiosk conceptually or all pending jobs are returned to all operators if not bound.
        // Usually, jobs are assigned to bins/kiosks later, so pending jobs might be global until printed.
        // We will fetch all relevant ones based on requirement.
      }

      query += ` ORDER BY Priority_level DESC, Collection_slot ASC`;
      const result = await conn.execute(query, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      // Basic camelCase mapper
      return (result.rows as Record<string, unknown>[]).map((row) => {
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

  async getBins(userId: number) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      if (!kioskId)
        throw new BadRequestException('No kiosk assigned to operator');

      const result = await conn.execute(
        `SELECT b.Kiosk_ID, b.Bin_ID, b.Max_page_capacity, b.Bin_status, 
                p.Job_ID as current_job_id, v.Status_Name as current_job_status
         FROM COLLECTION_BINS b
         LEFT JOIN PLACED_IN p ON b.Kiosk_ID = p.Kiosk_ID AND b.Bin_ID = p.Bin_ID
         LEFT JOIN V_JOB_DETAILS v ON p.Job_ID = v.Job_ID
         WHERE b.Kiosk_ID = :kioskId`,
        { kioskId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows as Record<string, unknown>[]).map((row) => ({
        kioskId: row.KIOSK_ID as number,
        binId: row.BIN_ID as string,
        maxPageCapacity: row.MAX_PAGE_CAPACITY as number,
        binStatus: row.BIN_STATUS as string,
        currentJobId: row.CURRENT_JOB_ID as number | null,
        currentJobStatus: row.CURRENT_JOB_STATUS as string | null,
      }));
    } finally {
      await conn.close();
    }
  }

  async updateBin(userId: number, binId: string, binStatus: string) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      if (!kioskId) throw new BadRequestException('No kiosk assigned');

      await conn.execute(
        `UPDATE COLLECTION_BINS SET Bin_status = :status WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { status: binStatus, kioskId, binId },
        { autoCommit: true },
      );
      return { message: 'Bin updated', kioskId, binId, binStatus };
    } finally {
      await conn.close();
    }
  }

  async assignBin(userId: number, jobId: number, binId: string) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      if (!kioskId) throw new BadRequestException('No kiosk assigned');

      await conn.execute(
        `INSERT INTO PLACED_IN (Job_ID, Kiosk_ID, Bin_ID) VALUES (:jobId, :kioskId, :binId)`,
        { jobId, kioskId, binId },
        { autoCommit: false },
      );
      await conn.execute(
        `UPDATE COLLECTION_BINS SET Bin_status = 'occupied' WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { kioskId, binId },
        { autoCommit: false },
      );
      await conn.execute(
        `UPDATE KIOSK SET Current_load = Current_load + 1 WHERE Kiosk_ID = :kioskId`,
        { kioskId },
        { autoCommit: false },
      );

      await conn.commit();
      return { message: 'Job assigned to bin', kioskId, binId, jobId };
    } catch (e) {
      await conn.rollback();
      throw new InternalServerErrorException(e.message);
    } finally {
      await conn.close();
    }
  }

  async handoverJob(userId: number, jobId: number, binId: string) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);
      if (!kioskId) throw new BadRequestException('No kiosk assigned');

      await conn.execute(
        `BEGIN SP_CONFIRM_HANDOVER(:jobId, :kioskId, :binId); END;`,
        { jobId, kioskId, binId },
        { autoCommit: false },
      );

      await conn.execute(
        `UPDATE COLLECTION_BINS SET Bin_status = 'available' WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { kioskId, binId },
        { autoCommit: false },
      );
      await conn.execute(
        `UPDATE KIOSK SET Current_load = Current_load - 1 WHERE Kiosk_ID = :kioskId`,
        { kioskId },
        { autoCommit: false },
      );

      await conn.commit();
      return { message: 'Handover confirmed', jobId };
    } catch (e) {
      await conn.rollback();
      throw new InternalServerErrorException(e.message);
    } finally {
      await conn.close();
    }
  }

  async discardJob(userId: number, jobId: number) {
    const conn = await this.db.getConnection();
    try {
      const kioskId = await this.getAssignedKiosk(conn, userId);

      // Get Job owner ID to notify
      const jobOwnerRes = await conn.execute(
        `SELECT User_ID FROM SUBMITS WHERE Job_ID = :jobId`,
        { jobId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const ownerId = (jobOwnerRes.rows as any[])[0]?.USER_ID;

      // Status mapping: Assuming Discarded has a Status_ID, typically we insert into HAS_STATUS
      // Here using a direct update or inserting a new record into HAS_STATUS
      await conn.execute(
        `INSERT INTO HAS_STATUS (Job_ID, Status_ID) 
         SELECT :jobId, Status_ID FROM JOB_STATUS WHERE Status_name = 'Discarded'`,
        { jobId },
        { autoCommit: false },
      );

      // Check if it was in a bin to clean up
      const binCheck = await conn.execute(
        `SELECT Bin_ID FROM PLACED_IN WHERE Job_ID = :jobId AND Kiosk_ID = :kioskId`,
        { jobId, kioskId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      if (binCheck.rows && binCheck.rows.length > 0) {
        const binId = (binCheck.rows as any[])[0].BIN_ID;
        await conn.execute(
          `DELETE FROM PLACED_IN WHERE Job_ID = :jobId`,
          { jobId },
          { autoCommit: false },
        );
        await conn.execute(
          `UPDATE COLLECTION_BINS SET Bin_status = 'available' WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
          { kioskId, binId },
          { autoCommit: false },
        );
        await conn.execute(
          `UPDATE KIOSK SET Current_load = Current_load - 1 WHERE Kiosk_ID = :kioskId`,
          { kioskId },
          { autoCommit: false },
        );
      }

      await conn.commit();

      if (ownerId) {
        // Pass arguments positionally: userId, title, message, type, jobId
        await this.notifications.createNotification(
          ownerId,
          'Job Discarded',
          `Your print job #${jobId} was not collected in time and has been discarded.`,
          'job_discarded',
          jobId, // This matches the 5th optional argument
        );
      }

      return { message: 'Job discarded', jobId };
    } catch (e) {
      await conn.rollback();
      throw new InternalServerErrorException(e.message);
    } finally {
      await conn.close();
    }
  }

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
