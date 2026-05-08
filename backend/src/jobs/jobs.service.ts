import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JobsService {
  constructor(private db: DbService) {}

  async createJob(
    userId: number,
    role: string,
    file: Express.Multer.File,
    data: any,
  ) {
    const qrToken = uuidv4();
    const priority = role === 'faculty' ? 2 : 1;
    const pageCount = parseInt(data.pageCount);

    return await this.db.executeInTransaction(async (conn) => {
      // 1. Get Price Policy
      const priceResult = await conn.execute<any>(
        `SELECT Policy_ID, Rate_per_page FROM PRICE_RATE WHERE Job_type = :p_type`,
        { p_type: data.jobType },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const policy = priceResult.rows?.[0];
      if (!policy) throw new BadRequestException('Invalid Job Type');
      const totalCost = pageCount * policy.RATE_PER_PAGE;

      // 2. Check & Lock Balance (Prevent Race Condition)
      const balanceCheck = await conn.execute<any>(
        `SELECT Account_balance FROM NORMAL_USER WHERE User_ID = :p_id FOR UPDATE`,
        { p_id: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const currentBalance = balanceCheck.rows?.[0]?.ACCOUNT_BALANCE;
      if (currentBalance === undefined || currentBalance < totalCost) {
        throw new BadRequestException('Insufficient balance');
      }

      // 3. Insert PRINT_JOB
      const jobInsert = await conn.execute(
        `INSERT INTO PRINT_JOB (Document, Page_count, QR_Secure_Token, Priority_level, job_type, scheduled_time) 
         VALUES (:p_doc, :p_pc, :p_qr, :p_pri, :p_type, :p_time) 
         RETURNING Job_Id INTO :p_out_id`,
        {
          p_doc: file.path,
          p_pc: pageCount,
          p_qr: qrToken,
          p_pri: priority,
          p_type: data.jobType,
          p_time: data.scheduledTime || null,
          p_out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
      );
      const jobId = (jobInsert.outBinds as any).p_out_id[0];

      // 4. Associate User and Job (SUBMITS)
      await conn.execute(
        `INSERT INTO SUBMITS (User_ID, Job_Id) VALUES (:p_uid, :p_jid)`,
        { p_uid: userId, p_jid: jobId },
      );

      // 5. Set Initial Status (HAS_STATUS)
      const statusRes = await conn.execute<any>(
        `SELECT Status_ID FROM JOB_STATUS WHERE Status_Name = 'Pending'`,
      );
      const statusId = statusRes.rows?.[0]?.[0];
      await conn.execute(
        `INSERT INTO HAS_STATUS (Job_Id, Status_ID) VALUES (:p_jid, :p_sid)`,
        { p_jid: jobId, p_sid: statusId },
      );

      // 6. Link to Policy (GOVERNED_BY)
      await conn.execute(
        `INSERT INTO GOVERNED_BY (Job_Id, Policy_ID) VALUES (:p_jid, :p_pol)`,
        { p_jid: jobId, p_pol: policy.POLICY_ID },
      );

      // 7. Deduct Balance
      await conn.execute(
        `UPDATE NORMAL_USER SET Account_balance = Account_balance - :p_cost WHERE User_ID = :p_uid`,
        { p_cost: totalCost, p_uid: userId },
      );

      // 8. Financial Transaction Record (Simplified to match your table)
      const txInsert = await conn.execute(
        `INSERT INTO FINANCIAL_TRANSACTION (Amount, Transaction_date) 
        VALUES (:p_amt, CURRENT_TIMESTAMP) 
        RETURNING Transaction_ID INTO :p_out_tx`,
        {
          p_amt: totalCost,
          p_out_tx: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
      );
      const txId = (txInsert.outBinds as any).p_out_tx[0];

      // 9. Link Job to Transaction (GENERATES) - This is where the connection happens!
      // Ensure your table uses "Job_Id" or "Job_ID" (Check casing in SQL Developer)
      await conn.execute(
        `INSERT INTO GENERATES (Job_Id, Transaction_ID) VALUES (:p_jid, :p_txid)`,
        { p_jid: jobId, p_txid: txId },
      );

      return { jobId, qrToken, estimatedTime: '5-10 minutes' };
    });
  }

  async findAll(userId: number) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute<any>(
        `SELECT pj.*, js.Status_Name 
         FROM PRINT_JOB pj
         JOIN SUBMITS s ON pj.Job_Id = s.Job_Id
         JOIN HAS_STATUS hs ON pj.Job_Id = hs.Job_Id
         JOIN JOB_STATUS js ON hs.Status_ID = js.Status_ID
         WHERE s.User_ID = :p_uid
         ORDER BY pj.Submission_Time DESC`,
        { p_uid: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return result.rows || [];
    } finally {
      await conn.close();
    }
  }

  async findOne(jobId: number, userId: number) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute<any>(
        `SELECT pj.* FROM PRINT_JOB pj
         JOIN SUBMITS s ON pj.Job_Id = s.Job_Id
         WHERE pj.Job_Id = :p_jid AND s.User_ID = :p_uid`,
        { p_jid: jobId, p_uid: userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      if (!result.rows || result.rows.length === 0)
        throw new BadRequestException('Job not found');
      return result.rows[0];
    } finally {
      await conn.close();
    }
  }
}
