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

  /**
   * Task 7: Refactor User Summary to use direct joins as per specification.
   * This handles the aggregation of jobs, spend, and pages in a single query.
   */
  async getUserSummary(userId?: number): Promise<UserSummaryReport[]> {
    const conn = await this.dbService.getConnection();
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
      throw new InternalServerErrorException('Failed to generate user summary report');
    } finally {
      await conn.close();
    }
  }

  /**
   * Task 1: Refactor to use V_DAILY_REPORT View.
   * This view already aggregates the last 30 days of data.
   */
  async getDailyReport(): Promise<DailySystemReport[]> {
    const conn = await this.dbService.getConnection();
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
}