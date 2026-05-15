import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly dbService: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async getHistory(userId: string) {
    const conn = await this.dbService.getConnection();
    try {
      const sql = `
        SELECT 
          ft.TRANSACTION_ID as "transactionId", 
          ft.AMOUNT as "amount", 
          ft.TRANSACTION_DATE as "transactionDate", 
          ft.TRANSACTION_TYPE as "transactionType",
          g.JOB_ID as "jobId"
        FROM FINANCIAL_TRANSACTION ft
        LEFT JOIN GENERATES g ON ft.TRANSACTION_ID = g.TRANSACTION_ID
        WHERE ft.USER_ID = :userId
        ORDER BY ft.TRANSACTION_DATE DESC
      `;

      const result = await conn.execute(
        sql,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return result.rows || [];
    } finally {
      await conn.close();
    }
  }

  async topUp(userId: string, amount: number) {
    const conn = await this.dbService.getConnection();
    try {
      // 1. Update the actual balance in the user table
      await conn.execute(
        `UPDATE NORMAL_USER 
        SET Account_balance = Account_balance + :amount 
        WHERE User_ID = :userId`,
        { amount, userId },
        { autoCommit: false },
      );

      // 2. Create the history record in the transaction table
      const sql = `
        INSERT INTO FINANCIAL_TRANSACTION (
          AMOUNT, 
          TRANSACTION_DATE, 
          USER_ID, 
          TRANSACTION_TYPE
        ) VALUES (
          :amount, 
          CURRENT_TIMESTAMP, 
          :userId, 
          'topup'
        ) RETURNING TRANSACTION_ID INTO :tid
      `;

      const result: any = await conn.execute(
        sql,
        {
          amount,
          userId,
          tid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: false },
      );

      // 3. Commit both database operations together
      await conn.commit();

      const transactionId = result.outBinds.tid[0];

      // 4. Fetch the final balance to resolve dynamic template strings
      const balResult = await conn.execute<any>(
        `SELECT Account_balance as "newBalance" FROM NORMAL_USER WHERE User_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const newBalance = balResult.rows?.[0]?.newBalance ?? 0;

      // 5. Convert userId string to number using Number() to satisfy NotificationsService type constraint
      const numericUserId = Number(userId);

      await this.notifications.createNotification(
        numericUserId, // 👈 Fixed: passing number instead of string
        'Balance Topped Up',
        `PKR ${amount} has been added to your account. New balance: PKR ${newBalance}`,
        'topup',
      );

      if (newBalance < 50) {
        await this.notifications.createNotification(
          numericUserId, // 👈 Fixed: passing number instead of string
          'Low Balance',
          'Your balance is below PKR 50. Please top up your account.',
          'low_balance',
        );
      }

      return {
        success: true,
        transactionId,
        newBalance,
      };
    } catch (err) {
      await conn.rollback();
      console.error('Top-up transaction failed:', err);
      throw new InternalServerErrorException(
        'Top-up failed and was rolled back.',
      );
    } finally {
      await conn.close();
    }
  }
}
