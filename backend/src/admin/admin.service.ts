import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';

@Injectable()
export class AdminService {
  constructor(private readonly dbService: DbService) {}

  async getAllJobs(status?: string) {
    const conn = await this.dbService.getConnection();
    try {
      let sql = `
        SELECT pj.Job_ID as "jobId", pj.Document as "document", pj.Page_Count as "pageCount", 
               pj.Job_Type as "jobType", pj.Submission_Time as "submissionTime", 
               js.Status_Name as "statusName", au.First_Name as "userFirstName", 
               au.Last_Name as "userLastName", au.Email as "userEmail", 
               pj.Priority_Level as "priorityLevel"
        FROM PRINT_JOB pj
        JOIN SUBMITS s ON pj.Job_ID = s.Job_ID
        JOIN APP_USER au ON s.User_ID = au.User_ID
        JOIN HAS_STATUS hs ON pj.Job_ID = hs.Job_ID
        JOIN JOB_STATUS js ON hs.Status_ID = js.Status_ID
      `;
      const binds: any = {};
      if (status) {
        sql += ` WHERE js.Status_Name = :status`;
        binds.status = status;
      }
      sql += ` ORDER BY pj.Priority_Level DESC, pj.Submission_Time ASC`;

      const result = await conn.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return result.rows;
    } finally {
      await conn.close();
    }
  }

  async confirmHandover(jobId: string, kioskId: string, binId: string) {
    const conn = await this.dbService.getConnection();
    try {
      // 1. Update Status to Collected (Assuming ID 4 = Collected)
      await conn.execute(
        `UPDATE HAS_STATUS SET Status_ID = (SELECT Status_ID FROM JOB_STATUS WHERE Status_Name = 'Collected') 
         WHERE Job_ID = :jobId`,
        { jobId },
      );

      // 2. Set Completion Time
      await conn.execute(
        `UPDATE PRINT_JOB SET Completion_Time = CURRENT_TIMESTAMP WHERE Job_ID = :jobId`,
        { jobId },
      );

      // 3. Record Placement
      await conn.execute(
        `INSERT INTO PLACED_IN (Job_ID, Kiosk_ID, Bin_ID) VALUES (:jobId, :kioskId, :binId)`,
        { jobId, kioskId, binId },
      );

      await conn.commit();
      return { message: 'Handover confirmed', jobId };
    } catch (err) {
      await conn.rollback();
      throw new InternalServerErrorException('Handover update failed');
    } finally {
      await conn.close();
    }
  }

  async getUsers(search?: string) {
    const conn = await this.dbService.getConnection();
    try {
      let sql = `
        SELECT au.User_ID as "userId", au.First_Name as "firstName", au.Last_Name as "lastName", 
               au.Email as "email", au.Role as "role", nu.Account_balance as "accountBalance",
               s.Major as "major", f.Department as "department"
        FROM APP_USER au
        LEFT JOIN NORMAL_USER nu ON au.User_ID = nu.User_ID
        LEFT JOIN STUDENT s ON au.User_ID = s.User_ID
        LEFT JOIN FACULTY f ON au.User_ID = f.User_ID
      `;
      const binds: any = {};
      if (search) {
        sql += ` WHERE LOWER(au.First_Name) LIKE :search 
                 OR LOWER(au.Last_Name) LIKE :search 
                 OR LOWER(au.Email) LIKE :search`;
        binds.search = `%${search.toLowerCase()}%`;
      }
      const result = await conn.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return result.rows;
    } finally {
      await conn.close();
    }
  }

  async deleteUser(userId: string) {
    const conn = await this.dbService.getConnection();
    try {
      await conn.execute(`DELETE FROM APP_USER WHERE User_ID = :userId`, {
        userId,
      });
      await conn.commit();
      return { message: 'User deleted', userId };
    } finally {
      await conn.close();
    }
  }
}
