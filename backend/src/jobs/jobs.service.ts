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

@Injectable()
export class JobsService {
  constructor(
    private readonly db: DbService,
    private readonly notificationsService: NotificationsService,
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
      // This replaces the SQL query to PRICE_RATE and manual math
      const pricing = calculateJobDetails(pricingParams);

      // Derived values for the Stored Procedure
      const priority = role === 'faculty' ? 2 : 1;
      const qrToken = uuidv4();
      // Calculate price per page for the DB record (total / pages * copies)
      const pricePerPage = pricing.totalCost / (pricingParams.pages * pricingParams.copies);

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
      // Note: We use pricing.calculatedSlot and pricing.expiryTime from the engine
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
          p_collection_slot: pricing.calculatedSlot, // Use the engine-validated slot
          p_description: jobData.description || null,
          p_qr_token: qrToken,
          p_priority: priority,
          p_price_per_page: pricePerPage,
          p_total_cost: pricing.totalCost,
          p_expiry_time: pricing.expiryTime, // Use the engine-calculated expiry
          p_job_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          p_new_balance: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: true },
      );

      const outBinds = result.outBinds as any;

      /* 
        NOTE: We do NOT call notificationService here because we discovered 
        earlier that the Stored Procedure handles its own notification insert.
      */

      return {
        message: 'Job submitted successfully',
        jobId: outBinds.p_job_id[0],
        qrToken: qrToken,
        totalCost: pricing.totalCost,
        newBalance: outBinds.p_new_balance[0],
        estimatedTime: pricingParams.jobType === 'bulk' ? 'By tomorrow 10:30 AM' : '5-10 minutes',
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
        userId,
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
      // This validates the new slot and calculates the new expiry/cost
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
      const currentBalance = (balanceRes.rows as any[])?.[0]?.ACCOUNT_BALANCE || 0;

      if (pricing.totalCost > currentBalance) {
        throw new BadRequestException(
          `Insufficient balance for reprint. Required: Rs. ${pricing.totalCost}, Available: Rs. ${currentBalance}`
        );
      }

      const qrToken = uuidv4();
      const pricePerPage = pricing.totalCost / (pricingParams.pages * pricingParams.copies);

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
          p_document: job.DOCUMENT, // Reuse old file path
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
  async updateJobStatus(jobId: number, newStatus: string) {
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
        isValid = true; // Manual operator discard
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

      await conn.commit();

      // Trigger appropriate notifications
      if (newStatus === 'Printing') {
        await this.notificationsService.createNotification(
          userId,
          'Printing Started',
          `Your print job #${jobId} is now being printed.`,
          'job_printing',
          jobId,
        );
      } else if (newStatus === 'Binned') {
        await this.notificationsService.createNotification(
          userId,
          'Ready for Collection',
          `Your print job #${jobId} is ready at the kiosk. You have 2 hours to collect it.`,
          'job_binned',
          jobId,
        );
      } else if (newStatus === 'Discarded') {
        await this.notificationsService.createNotification(
          userId,
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
}
