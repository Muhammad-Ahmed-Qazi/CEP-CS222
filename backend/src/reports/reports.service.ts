import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';
import {
  DailySystemReport,
  UserSummaryReport,
} from './interfaces/reports.interface';

@Injectable()
export class ReportsService {
  constructor(private readonly dbService: DbService) {}

  async getUserSummary(userId?: number): Promise<UserSummaryReport[]> {
    const conn = await this.dbService.getConnection();
    try {
      // Using CTEs (WITH clauses) to aggregate jobs and spending independently.
      // This prevents row multiplication when joining across multiple tables.
      let sql = `
        WITH UserJobs AS (
          SELECT s.User_ID, COUNT(pj.Job_Id) as total_jobs, SUM(pj.Page_count) as total_pages
          FROM SUBMITS s
          JOIN PRINT_JOB pj ON s.Job_Id = pj.Job_Id
          GROUP BY s.User_ID
        ),
        UserSpend AS (
          SELECT ft.User_ID, SUM(ft.Amount) as total_spend
          FROM FINANCIAL_TRANSACTION ft
          WHERE LOWER(ft.transaction_type) = 'deduction'
          GROUP BY ft.User_ID
        )
        SELECT 
          au.User_ID as "userId",
          au.First_Name as "firstName",
          au.Last_Name as "lastName",
          au.Email as "email",
          NVL(nu.Account_balance, 0) as "currentBalance",
          NVL(uj.total_jobs, 0) as "totalJobs",
          NVL(uj.total_pages, 0) as "totalPages",
          NVL(us.total_spend, 0) as "totalSpend"
        FROM APP_USER au
        LEFT JOIN NORMAL_USER nu ON au.User_ID = nu.User_ID
        LEFT JOIN UserJobs uj ON au.User_ID = uj.User_ID
        LEFT JOIN UserSpend us ON au.User_ID = us.User_ID
      `;

      const binds: any = {};

      if (userId) {
        sql += ` WHERE au.User_ID = :userId`;
        binds.userId = userId;
      } else {
        sql += ` ORDER BY NVL(us.total_spend, 0) DESC`;
      }

      const result = await conn.execute<UserSummaryReport>(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      return result.rows || [];
    } catch (error) {
      console.error('Error generating user summary report:', error);
      throw new InternalServerErrorException(
        'Failed to generate user summary report',
      );
    } finally {
      await conn.close();
    }
  }

  async getDailyReport(): Promise<DailySystemReport[]> {
    const conn = await this.dbService.getConnection();
    try {
      const sql = `
        SELECT 
          TO_CHAR(ft.Transaction_date, 'DD-MON-YYYY') as "date",
          COUNT(pj.Job_Id) as "totalJobs",
          SUM(ft.Amount) as "totalRevenue",
          SUM(CASE WHEN LOWER(pj.job_type) = 'normal' THEN 1 ELSE 0 END) as "normalJobs",
          SUM(CASE WHEN LOWER(pj.job_type) = 'bulk' THEN 1 ELSE 0 END) as "bulkJobs"
        FROM FINANCIAL_TRANSACTION ft
        JOIN GENERATES g ON ft.Transaction_ID = g.Transaction_ID
        JOIN PRINT_JOB pj ON g.Job_Id = pj.Job_Id
        WHERE ft.Transaction_date >= SYSDATE - 30
        GROUP BY TO_CHAR(ft.Transaction_date, 'DD-MON-YYYY'), TRUNC(ft.Transaction_date)
        ORDER BY TRUNC(ft.Transaction_date) DESC
      `;

      const result = await conn.execute<DailySystemReport>(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return result.rows || [];
    } catch (error) {
      console.error('Error generating daily system report:', error);
      throw new InternalServerErrorException('Failed to generate daily report');
    } finally {
      await conn.close();
    }
  }
}
