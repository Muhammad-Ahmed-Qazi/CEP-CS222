import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';
import {
  DailySystemReport,
  UserSummaryReport,
} from './interfaces/reports.interface';

export interface JobsByStatus {
  pending: number;
  printing: number;
  binned: number;
  collected: number;
  discarded: number;
  cancelled: number;
}

export interface MySummaryResponse {
  totalJobs: number;
  totalPages: number;
  pagesSavedByDuplex: number;
  totalSpend: number;
  jobsByStatus: JobsByStatus;
}

interface CoreMetricsRow {
  TOTAL_JOBS: number;
  TOTAL_PAGES: number;
  PAGES_SAVED: number;
}

interface SpendRow {
  TOTAL_SPEND: number;
}

interface StatusBreakdownRow {
  STATUS_NAME: string;
  STATUS_COUNT: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly db: DbService) { }

  /**
   * Task 7: User Summary report using direct database joins.
   * Handles the aggregation of system-wide jobs, spend, and pages.
   */
  async getUserSummary(userId?: number): Promise<UserSummaryReport[]> {
    const conn = await this.db.getConnection();
    try {
      let sql = `
        SELECT 
            au.User_ID as "userId", 
            au.first_name as "firstName", 
            au.last_name as "lastName", 
            au.EMail as "email",
            nu.Account_balance as "currentBalance",
            COUNT(DISTINCT s.Job_Id) as "totalJobs",
            SUM(pj.total_cost) as "totalSpend",
            SUM(pj.Page_count * pj.copies) as "totalPages"
        FROM APP_USER au
        LEFT JOIN NORMAL_USER nu ON au.User_ID = nu.User_ID
        LEFT JOIN SUBMITS s ON au.User_ID = s.User_ID
        LEFT JOIN PRINT_JOB pj ON s.Job_Id = pj.Job_Id
        WHERE nu.User_ID IS NOT NULL
      `;

      const binds: any = {};

      if (userId) {
        sql += ` AND au.User_ID = :userId`;
        binds.userId = userId;
      }

      sql += ` GROUP BY au.User_ID, au.first_name, au.last_name, au.EMail, nu.Account_balance`;
      sql += ` ORDER BY "totalSpend" DESC NULLS LAST`;

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

  /**
   * Task 1: Fetch consolidated operational trends directly from V_DAILY_REPORT.
   */
  async getDailyReport(): Promise<DailySystemReport[]> {
    const conn = await this.db.getConnection();
    try {
      const sql = `
        SELECT 
          REPORT_DATE as "date",
          TOTAL_JOBS as "totalJobs",
          TOTAL_REVENUE as "totalRevenue",
          NORMAL_JOBS as "normalJobs",
          BULK_JOBS as "bulkJobs"
        FROM V_DAILY_REPORT
        ORDER BY REPORT_DATE DESC
      `;

      const result = await conn.execute<DailySystemReport>(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return result.rows || [];
    } catch (error) {
      console.error('Error fetching daily report from view:', error);
      throw new InternalServerErrorException('Failed to generate daily report');
    } finally {
      await conn.close();
    }
  }

  /**
   * Fetches specific dashboard metrics for a normal user, dividing
   * active counters from cancelled/refunded transactional balances.
   */
  async getMySummary(userId: number): Promise<MySummaryResponse> {
    const conn = await this.db.getConnection();
    try {
      // 1. Fetch core metrics explicitly EXCLUDING 'Cancelled' states
      const statsRes = await conn.execute<CoreMetricsRow>(
        `SELECT 
          COUNT(pj.Job_Id) as TOTAL_JOBS,
          NVL(SUM(pj.Page_count), 0) as TOTAL_PAGES,
          NVL(SUM(CASE WHEN pj.Print_Side = 'double' THEN CEIL(pj.Page_count / 2) ELSE 0 END), 0) as PAGES_SAVED
          FROM PRINT_JOB pj
          JOIN SUBMITS s ON pj.Job_Id = s.Job_Id
          JOIN HAS_STATUS hs ON pj.Job_Id = hs.Job_Id
          JOIN JOB_STATUS js ON hs.Status_ID = js.Status_ID
          WHERE s.User_ID = :userId AND js.Status_Name != 'Cancelled'`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      // 2. Fetch total spent EXCLUDING refunded/cancelled transactions
      const spendRes = await conn.execute<SpendRow>(
        `SELECT NVL(SUM(ABS(ft.Amount)), 0) as TOTAL_SPEND
          FROM FINANCIAL_TRANSACTION ft
          JOIN GENERATES g ON ft.Transaction_ID = g.Transaction_ID
          JOIN PRINT_JOB pj ON g.Job_ID = pj.Job_Id
          JOIN HAS_STATUS hs ON pj.Job_Id = hs.Job_Id
          JOIN JOB_STATUS js ON hs.Status_ID = js.Status_ID
          WHERE ft.User_ID = :userId 
          AND ft.Amount < 0 
          AND js.Status_Name != 'Cancelled'`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      // 3. Fetch status breakdown INCLUDING 'Cancelled'
      const statusRes = await conn.execute<StatusBreakdownRow>(
        `SELECT js.Status_Name, COUNT(pj.Job_Id) as STATUS_COUNT
          FROM PRINT_JOB pj
          JOIN SUBMITS s ON pj.Job_Id = s.Job_Id
          JOIN HAS_STATUS hs ON pj.Job_Id = hs.Job_Id
          JOIN JOB_STATUS js ON hs.Status_ID = js.Status_ID
          WHERE s.User_ID = :userId
          GROUP BY js.Status_Name`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const stats = statsRes.rows?.[0] || {
        TOTAL_JOBS: 0,
        TOTAL_PAGES: 0,
        PAGES_SAVED: 0,
      };
      const spend = spendRes.rows?.[0]?.TOTAL_SPEND || 0;

      const jobsByStatus: JobsByStatus = {
        pending: 0,
        printing: 0,
        binned: 0,
        collected: 0,
        discarded: 0,
        cancelled: 0,
      };

      if (statusRes.rows) {
        statusRes.rows.forEach((row) => {
          const key = row.STATUS_NAME.toLowerCase() as keyof JobsByStatus;
          if (jobsByStatus[key] !== undefined) {
            jobsByStatus[key] = row.STATUS_COUNT;
          }
        });
      }

      return {
        totalJobs: stats.TOTAL_JOBS,
        totalPages: stats.TOTAL_PAGES,
        pagesSavedByDuplex: stats.PAGES_SAVED,
        totalSpend: spend,
        jobsByStatus,
      };
    } catch (error) {
      console.error(
        `Error aggregating user metrics for student ${userId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to process dashboard metrics compilation',
      );
    } finally {
      await conn.close();
    }
  }
}
