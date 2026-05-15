import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as oracledb from 'oracledb';
import { v4 as uuidv4 } from 'uuid';
import { calculateJobDetails, PricingParams } from './pricing.engine';
import { LoggingService } from 'src/logging/logging.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly db: DbService,
    private readonly notificationsService: NotificationsService,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Internal helper to map Oracle UPPER_CASE keys to camelCase
   */
  private mapResponse(row: any) {
    if (!row) return null;
    const mapped: any = {};
    Object.keys(row).forEach((key) => {
      const camelKey = key
        .toLowerCase()
        .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      mapped[camelKey] = row[key];
    });
    return mapped;
  }

  async submitJob(
    userId: number,
    role: string,
    file: Express.Multer.File,
    jobData: any,
  ) {
    const conn = await this.db.getConnection();
    try {
      // 1. Prepare parameters for the Pricing Engine
      const pricingParams: PricingParams = {
        pages: parseInt(jobData.pageCount, 10),
        copies: parseInt(jobData.copies || '1', 10),
        jobType: jobData.jobType as 'normal' | 'bulk',
        printMode: jobData.printMode as 'bw' | 'colour',
        printSide: jobData.printSide as 'single' | 'double',
        collectionSlot: jobData.collectionSlot,
      };

      // 2. Call the Pricing Engine
      const pricing = calculateJobDetails(pricingParams);

      // Derived values for the Stored Procedure
      const priority = role === 'faculty' ? 2 : 1;
      const qrToken = uuidv4();
      const pricePerPage =
        pricing.totalCost / (pricingParams.pages * pricingParams.copies);

      // 3. Check balance before calling SP
      const balanceRes = await conn.execute(
        `SELECT Account_balance FROM NORMAL_USER WHERE User_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rows = balanceRes.rows as any[];
      const currentBalance = rows?.[0]?.ACCOUNT_BALANCE || 0;

      if (pricing.totalCost > currentBalance) {
        throw new BadRequestException(
          `Insufficient balance. Job cost: Rs. ${pricing.totalCost}, Current Balance: Rs. ${currentBalance}`,
        );
      }

      // 4. Call SP_SUBMIT_JOB
      const result = await conn.execute(
        `BEGIN 
            SP_SUBMIT_JOB(
                :p_user_id, :p_document, :p_page_count, :p_copies, :p_job_type,
                :p_print_mode, :p_print_side, :p_collection_slot, :p_description,
                :p_qr_token, :p_priority, :p_price_per_page, :p_total_cost,
                :p_expiry_time, :p_job_id, :p_new_balance
            ); 
        END;`,
        {
          p_user_id: userId,
          p_document: jobData.savedPath,
          p_page_count: pricingParams.pages,
          p_copies: pricingParams.copies,
          p_job_type: pricingParams.jobType,
          p_print_mode: pricingParams.printMode,
          p_print_side: pricingParams.printSide,
          p_collection_slot: pricing.calculatedSlot,
          p_description: jobData.description || null,
          p_qr_token: qrToken,
          p_priority: priority,
          p_price_per_page: pricePerPage,
          p_total_cost: pricing.totalCost,
          p_expiry_time: pricing.expiryTime,
          p_job_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          p_new_balance: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: true },
      );

      const outBinds = result.outBinds as any;
      const newBalance = outBinds.p_new_balance[0];

      // 5. Post-Commit Low Balance Warning Check
      if (newBalance < 50) {
        await this.notificationsService.createNotification(
          Number(userId),
          'Low Balance Warning',
          'Your balance is below PKR 50. Top up soon to continue printing.',
          'low_balance',
        );
      }

      return {
        message: 'Job submitted successfully',
        jobId: outBinds.p_job_id[0],
        qrToken: qrToken,
        totalCost: pricing.totalCost,
        newBalance: newBalance,
        estimatedTime:
          pricingParams.jobType === 'bulk'
            ? 'By tomorrow 10:30 AM'
            : '5-10 minutes',
      };
    } catch (error) {
      console.error('Submit Job Error:', error);
      throw new InternalServerErrorException(
        error.message || 'Failed to submit job',
      );
    } finally {
      await conn.close();
    }
  }

  /**
   * Task 1: Use V_JOB_DETAILS view
   */
  async findAll(userId: number) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT * FROM V_JOB_DETAILS WHERE User_ID = :userId ORDER BY Submission_Time DESC`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rows = result.rows as any[];
      return (rows || []).map((row) => this.mapResponse(row));
    } finally {
      await conn.close();
    }
  }

  /**
   * Task 1: Use V_JOB_DETAILS view for single job
   */
  async findOne(jobId: number, userId: number) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT * FROM V_JOB_DETAILS WHERE Job_Id = :jobId AND User_ID = :userId`,
        { jobId, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        throw new NotFoundException('Job not found');
      }

      return this.mapResponse(rows[0]);
    } finally {
      await conn.close();
    }
  }

  /**
   * Task 1: Cancel Job & Issue Refund
   */
  async cancelJob(jobId: number, userId: number) {
    const conn = await this.db.getConnection();
    try {
      // 1. Verify ownership and status with a lock to prevent race conditions
      const jobRes = await conn.execute(
        `SELECT Status_Name, total_cost FROM V_JOB_DETAILS 
         WHERE Job_Id = :jobId AND User_ID = :userId FOR UPDATE`,
        { jobId, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const job = (jobRes.rows as any[])?.[0];
      if (!job)
        throw new ForbiddenException('Job not found or does not belong to you');
      if (job.STATUS_NAME !== 'Pending') {
        throw new BadRequestException('Only pending jobs can be cancelled');
      }

      const cost = job.TOTAL_COST;

      // 2. Execute refund transaction
      const refundRes = await conn.execute(
        `UPDATE NORMAL_USER 
         SET Account_balance = Account_balance + :cost 
         WHERE User_ID = :userId 
         RETURNING Account_balance INTO :new_balance`,
        {
          cost,
          userId,
          new_balance: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
      );
      const newBalance = (refundRes.outBinds as any).new_balance[0];

      // 3. Log Financial Transaction
      const transRes = await conn.execute(
        `INSERT INTO FINANCIAL_TRANSACTION (Amount, transaction_type, User_ID, balance_after) 
         VALUES (:cost, 'refund', :userId, :newBalance) 
         RETURNING Transaction_ID INTO :trans_id`,
        {
          cost,
          userId,
          newBalance,
          trans_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
      );
      const transId = (transRes.outBinds as any).trans_id[0];

      // 4. Link transaction to job
      await conn.execute(
        `INSERT INTO GENERATES (Job_Id, Transaction_ID) VALUES (:jobId, :transId)`,
        { jobId, transId },
      );

      // 5. Update Status
      await conn.execute(
        `UPDATE HAS_STATUS 
         SET Status_ID = (SELECT Status_ID FROM JOB_STATUS WHERE Status_Name = 'Discarded') 
         WHERE Job_Id = :jobId`,
        { jobId },
      );

      await conn.commit();

      // 6. Notify
      await this.notificationsService.createNotification(
        Number(userId),
        'Job Cancelled',
        `Your print job #${jobId} has been cancelled and PKR ${cost} has been refunded`,
        'job_cancelled',
        jobId,
      );

      return { message: 'Job cancelled', refundAmount: cost, newBalance };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      await conn.close();
    }
  }

  /**
   * Task 2: Reprint Job
   */
  async reprintJob(
    originalJobId: number,
    userId: number,
    newCollectionSlot: string,
  ) {
    const conn = await this.db.getConnection();
    try {
      // 1. Fetch original job details
      const jobRes = await conn.execute(
        `SELECT * FROM V_JOB_DETAILS WHERE Job_Id = :jobId AND User_ID = :userId`,
        { jobId: originalJobId, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const job = (jobRes.rows as any[])?.[0];
      if (!job) throw new ForbiddenException('Original job not found');

      // 2. Prepare parameters for the Pricing Engine using original job data
      const pricingParams: PricingParams = {
        pages: job.PAGE_COUNT,
        copies: job.COPIES,
        jobType: job.JOB_TYPE.toLowerCase() as 'normal' | 'bulk',
        printMode: job.PRINT_MODE.toLowerCase() as 'bw' | 'colour',
        printSide: job.PRINT_SIDE.toLowerCase() as 'single' | 'double',
        collectionSlot: newCollectionSlot,
      };

      // 3. Call the Pricing Engine
      const pricing = calculateJobDetails(pricingParams);

      // 4. Fetch user profile for priority
      const profileRes = await conn.execute(
        `SELECT Role FROM V_USER_PROFILE WHERE User_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const role = (profileRes.rows as any[])?.[0]?.ROLE || 'student';
      const priority = role === 'faculty' ? 2 : 1;

      // 5. Check balance
      const balanceRes = await conn.execute(
        `SELECT Account_balance FROM NORMAL_USER WHERE User_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const currentBalance =
        (balanceRes.rows as any[])?.[0]?.ACCOUNT_BALANCE || 0;

      if (pricing.totalCost > currentBalance) {
        throw new BadRequestException(
          `Insufficient balance for reprint. Required: Rs. ${pricing.totalCost}, Available: Rs. ${currentBalance}`,
        );
      }

      const qrToken = uuidv4();
      const pricePerPage =
        pricing.totalCost / (pricingParams.pages * pricingParams.copies);

      // 6. Submit via SP
      const spResult = await conn.execute(
        `BEGIN 
            SP_SUBMIT_JOB(
                :p_user_id, :p_document, :p_page_count, :p_copies, :p_job_type,
                :p_print_mode, :p_print_side, :p_collection_slot, :p_description,
                :p_qr_token, :p_priority, :p_price_per_page, :p_total_cost,
                :p_expiry_time, :p_job_id, :p_new_balance
            ); 
        END;`,
        {
          p_user_id: userId,
          p_document: job.DOCUMENT,
          p_page_count: pricingParams.pages,
          p_copies: pricingParams.copies,
          p_job_type: pricingParams.jobType,
          p_print_mode: pricingParams.printMode,
          p_print_side: pricingParams.printSide,
          p_collection_slot: pricing.calculatedSlot,
          p_description: `Reprint of Job #${originalJobId}`,
          p_qr_token: qrToken,
          p_priority: priority,
          p_price_per_page: pricePerPage,
          p_total_cost: pricing.totalCost,
          p_expiry_time: pricing.expiryTime,
          p_job_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          p_new_balance: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: true },
      );

      const outBinds = spResult.outBinds as any;
      const newBalance = outBinds.p_new_balance[0];

      // 7. Post-Commit Reprint Low Balance Warning Check
      if (newBalance < 50) {
        await this.notificationsService.createNotification(
          Number(userId),
          'Low Balance Warning',
          'Your balance is below PKR 50. Top up soon to continue printing.',
          'low_balance',
        );
      }

      return {
        message: 'Job reprinted successfully',
        jobId: outBinds.p_job_id[0],
        qrToken: qrToken,
        totalPages: pricing.totalPages,
        pricePerPage: pricePerPage,
        totalCost: pricing.totalCost,
        collectionSlot: pricing.calculatedSlot,
        expiryTime: pricing.expiryTime,
      };
    } finally {
      await conn.close();
    }
  }

  /**
   * Task 3: Operator Job Status Update
   */
  async updateJobStatus(operatorId: number, jobId: number, newStatus: string) {
    const conn = await this.db.getConnection();
    try {
      const jobRes = await conn.execute(
        `SELECT Status_Name, User_ID, expiry_time FROM V_JOB_DETAILS WHERE Job_Id = :jobId FOR UPDATE`,
        { jobId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const job = (jobRes.rows as any[])?.[0];
      if (!job) throw new BadRequestException('Job not found');

      const currentStatus = job.STATUS_NAME;
      const userId = job.USER_ID;

      // Validate Transitions
      let isValid = false;
      if (currentStatus === 'Pending' && newStatus === 'Printing')
        isValid = true;
      if (currentStatus === 'Printing' && newStatus === 'Binned')
        isValid = true;
      if (currentStatus === 'Pending' && newStatus === 'Discarded')
        isValid = true;
      if (currentStatus === 'Binned' && newStatus === 'Discarded') {
        const expiry = new Date(job.EXPIRY_TIME);
        if (new Date() < expiry) {
          throw new BadRequestException(
            'Cannot discard a binned job before its expiry time',
          );
        }
        isValid = true;
      }

      if (!isValid) {
        throw new BadRequestException(
          `Invalid state transition from ${currentStatus} to ${newStatus}`,
        );
      }

      // Execute Update
      await conn.execute(
        `UPDATE HAS_STATUS 
        SET Status_ID = (SELECT Status_ID FROM JOB_STATUS WHERE Status_Name = :newStatus) 
        WHERE Job_Id = :jobId`,
        { newStatus, jobId },
      );

      // Clean up bin allocation if discarded
      if (newStatus === 'Discarded') {
        await conn.execute(`DELETE FROM PLACED_IN WHERE Job_Id = :jobId`, {
          jobId,
        });
      }

      // Commit changes safely to the database
      await conn.commit();

      // 👈 Audit log state modification after successful commit
      await this.loggingService.logAction(
        operatorId,
        'STATUS_UPDATE',
        'PRINT_JOB',
        String(jobId), // Explicitly cast to string for schema layout safety
        currentStatus, // Captured before execution
        newStatus,
      );

      // Trigger appropriate notifications
      if (newStatus === 'Printing') {
        await this.notificationsService.createNotification(
          Number(userId),
          'Printing Started',
          `Your print job #${jobId} is now being printed.`,
          'job_printing',
          jobId,
        );
      } else if (newStatus === 'Binned') {
        await this.notificationsService.createNotification(
          Number(userId),
          'Ready for Collection',
          `Your print job #${jobId} is ready at the kiosk. You have 2 hours to collect it.`,
          'job_binned',
          jobId,
        );
      } else if (newStatus === 'Discarded') {
        await this.notificationsService.createNotification(
          Number(userId),
          'Job Discarded',
          `Your print job #${jobId} was discarded. No refund is issued.`,
          'job_discarded',
          jobId,
        );
      }

      return { message: 'Status updated', jobId, newStatus };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      await conn.close();
    }
  }

  // --- TASK 5: Retrieve QR Token for User ---
  async getJobQr(userId: number, jobId: number) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT j.QR_Secure_Token, pi.Bin_ID, pi.Kiosk_ID, k.Location_name, 
                v.Collection_slot, v.Expiry_time, v.Status_Name
         FROM PRINT_JOB j
         JOIN SUBMITS s ON j.Job_ID = s.Job_ID
         JOIN V_JOB_DETAILS v ON j.Job_ID = v.Job_ID
         LEFT JOIN PLACED_IN pi ON j.Job_ID = pi.Job_ID
         LEFT JOIN KIOSK k ON pi.Kiosk_ID = k.Kiosk_ID
         WHERE j.Job_ID = :jobId AND s.User_ID = :userId`,
        { jobId, userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = (result.rows as any[])[0];
      if (!row) throw new NotFoundException('Job not found or unauthorized');

      const isBinned = row.STATUS_NAME === 'Binned';

      return {
        jobId,
        qrToken: row.QR_SECURE_TOKEN,
        binId: isBinned ? row.BIN_ID : null,
        kioskId: isBinned ? row.KIOSK_ID : null,
        locationName: isBinned ? row.LOCATION_NAME : null,
        collectionSlot: row.COLLECTION_SLOT,
        expiryTime: row.EXPIRY_TIME,
      };
    } finally {
      await conn.close();
    }
  }
}
