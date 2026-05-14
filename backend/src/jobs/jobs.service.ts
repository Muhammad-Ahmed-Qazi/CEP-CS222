import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as oracledb from 'oracledb';
import { v4 as uuidv4 } from 'uuid';

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

  /**
   * Task 1 & 3: Create Job using Stored Procedure
   */
  async submitJob(
    userId: number,
    role: string, // Kept from previous version for priority logic
    file: Express.Multer.File,
    jobData: any,
  ) {
    const conn = await this.db.getConnection();
    try {
      const pageCount = parseInt(jobData.pageCount, 10);
      const copies = parseInt(jobData.copies || '1', 10);
      const jobType = jobData.jobType || 'normal';

      // Retained from previous: Role-based priority
      const priority = role === 'faculty' ? 2 : 1;

      // Retained from previous: Secure Token Generation
      const qrToken = uuidv4();

      // 1. Retained from previous: Get Price Policy Dynamically
      const priceResult = await conn.execute(
        `SELECT Policy_ID, Rate_per_page FROM PRICE_RATE WHERE Job_type = :p_type`,
        { p_type: jobType },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rowsPrice = priceResult.rows as any[];
      const policy = rowsPrice?.[0];
      if (!policy) throw new BadRequestException('Invalid Job Type');

      const pricePerPage = policy.RATE_PER_PAGE;
      const totalCost = pageCount * copies * pricePerPage;

      // Date calculations
      const collectionSlot = new Date(jobData.collectionSlot);
      const expiryTime = new Date(
        collectionSlot.getTime() + 24 * 60 * 60 * 1000,
      );

      // 2. Task 3: Check balance before calling SP
      const balanceRes = await conn.execute(
        `SELECT Account_balance FROM NORMAL_USER WHERE User_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rows = balanceRes.rows as any[];
      const currentBalance =
        rows && rows.length > 0 ? rows[0].ACCOUNT_BALANCE : 0;

      if (totalCost > currentBalance) {
        throw new BadRequestException(
          `Insufficient balance. Job cost: Rs. ${totalCost}, Current Balance: Rs. ${currentBalance}`,
        );
      }

      // 3. Task 1: Call SP_SUBMIT_JOB with exactly 16 arguments
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
          p_page_count: pageCount,
          p_copies: copies,
          p_job_type: jobType,
          p_print_mode: jobData.printMode,
          p_print_side: jobData.printSide,
          p_collection_slot: collectionSlot,
          p_description: jobData.description || null,
          p_qr_token: qrToken,
          p_priority: priority,
          p_price_per_page: pricePerPage,
          p_total_cost: totalCost,
          p_expiry_time: expiryTime,
          p_job_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          p_new_balance: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: true },
      );

      const outBinds = result.outBinds as any;

      // Oracle BIND_OUT returns an array, we take the first element
      return {
        message: 'Job submitted successfully',
        jobId: outBinds.p_job_id[0],
        qrToken: qrToken,
        totalCost: totalCost,
        newBalance: outBinds.p_new_balance[0],
        estimatedTime: '5-10 minutes', // Retained from previous
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
}
