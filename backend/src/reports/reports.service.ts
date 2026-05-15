import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';
import {
  DailySystemReport,
  UserSummaryReport,
} from './interfaces/reports.interface';

export interface MySummaryData {
  totalJobs: number;
  totalPages: number;
  pagesSavedByDuplex: number;
  jobsByStatus: {
    pending: number;
    printing: number;
    binned: number;
    collected: number;
    discarded: number;
  };
}

@Injectable()
export class ReportsService {
  constructor(private readonly db: DbService) {}

  /**
   * Task 7: Refactor User Summary to use direct joins as per specification.
   * This handles the aggregation of jobs, spend, and pages in a single query.
   */
  async getUserSummary(userId?: number): Promise<UserSummaryReport[]> {
    const conn = await this.db.getConnection();
    try {
      // Base SQL from Task 7 with camelCase aliases for the frontend
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

      // Maintain the ability to filter by a specific user if provided
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
   * Task 1: Refactor to use V_DAILY_REPORT View.
   * This view already aggregates the last 30 days of data.
   */
  async getDailyReport(): Promise<DailySystemReport[]> {
    const conn = await this.db.getConnection();
    try {
      // Assuming V_DAILY_REPORT columns: REPORT_DATE, TOTAL_JOBS, TOTAL_REVENUE, NORMAL_JOBS, BULK_JOBS
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

  async getMySummary(userId: number): Promise<MySummaryData> {
    const conn = await this.db.getConnection();
    try {
      const query = `
        SELECT 
          COUNT(Job_ID) AS TOTAL_JOBS,
          NVL(SUM(Page_count * Copies), 0) AS TOTAL_PAGES,
          NVL(SUM(CASE WHEN Print_Side = 'double' THEN (Page_count * Copies) ELSE 0 END), 0) AS PAGES_SAVED_BY_DUPLEX,
          NVL(SUM(CASE WHEN Status_Name = 'Pending' THEN 1 ELSE 0 END), 0) AS PENDING_JOBS,
          NVL(SUM(CASE WHEN Status_Name = 'Printing' THEN 1 ELSE 0 END), 0) AS PRINTING_JOBS,
          NVL(SUM(CASE WHEN Status_Name = 'Binned' THEN 1 ELSE 0 END), 0) AS BINNED_JOBS,
          NVL(SUM(CASE WHEN Status_Name = 'Collected' THEN 1 ELSE 0 END), 0) AS COLLECTED_JOBS,
          NVL(SUM(CASE WHEN Status_Name = 'Discarded' THEN 1 ELSE 0 END), 0) AS DISCARDED_JOBS
        FROM V_JOB_DETAILS
        WHERE User_ID = :userId
      `;

      const result = await conn.execute<Record<string, unknown>>(
        query,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const row = result.rows?.[0] || {
        TOTAL_JOBS: 0,
        TOTAL_PAGES: 0,
        PAGES_SAVED_BY_DUPLEX: 0,
        PENDING_JOBS: 0,
        PRINTING_JOBS: 0,
        BINNED_JOBS: 0,
        COLLECTED_JOBS: 0,
        DISCARDED_JOBS: 0,
      };

      return {
        totalJobs: row.TOTAL_JOBS as number,
        totalPages: row.TOTAL_PAGES as number,
        pagesSavedByDuplex: row.PAGES_SAVED_BY_DUPLEX as number,
        jobsByStatus: {
          pending: row.PENDING_JOBS as number,
          printing: row.PRINTING_JOBS as number,
          binned: row.BINNED_JOBS as number,
          collected: row.COLLECTED_JOBS as number,
          discarded: row.DISCARDED_JOBS as number,
        },
      };
    } finally {
      await conn.close();
    }
  }
}
