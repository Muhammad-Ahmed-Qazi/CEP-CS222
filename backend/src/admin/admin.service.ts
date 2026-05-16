import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';
import { mapToCamelCase } from 'src/common/utils/mapper';

@Injectable()
export class AdminService {
  constructor(private readonly db: DbService) {}

  async getAllJobs(status?: string) {
    const conn = await this.db.getConnection();
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
    const conn = await this.db.getConnection();
    try {
      await conn.execute(
        `UPDATE HAS_STATUS SET Status_ID = (SELECT Status_ID FROM JOB_STATUS WHERE Status_Name = 'Collected') 
         WHERE Job_ID = :jobId`,
        { jobId },
      );

      await conn.execute(
        `UPDATE PRINT_JOB SET Completion_Time = CURRENT_TIMESTAMP WHERE Job_ID = :jobId`,
        { jobId },
      );

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

  async getUsers() {
    const conn = await this.db.getConnection();
    try {
      const sql = `
        SELECT 
          au.USER_ID as "userId",
          au.FIRST_NAME as "firstName",
          au.LAST_NAME as "lastName",
          au.EMAIL as "email",
          CASE 
            WHEN adm.USER_ID IS NOT NULL THEN 'admin'
            WHEN fac.USER_ID IS NOT NULL THEN 'faculty'
            WHEN stu.USER_ID IS NOT NULL THEN 'student'
            WHEN nu.USER_ID IS NOT NULL THEN 'normal'
            ELSE 'guest'
          END as "role",
          nu.ACCOUNT_BALANCE as "accountBalance"
        FROM APP_USER au
        LEFT JOIN ADMIN adm ON au.USER_ID = adm.USER_ID
        LEFT JOIN NORMAL_USER nu ON au.USER_ID = nu.USER_ID
        LEFT JOIN FACULTY fac ON au.USER_ID = fac.USER_ID
        LEFT JOIN STUDENT stu ON au.USER_ID = stu.USER_ID
        ORDER BY au.USER_ID ASC
      `;

      const result = await conn.execute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return result.rows || [];
    } catch (err) {
      console.error('Error fetching users with roles:', err);
      throw err;
    } finally {
      await conn.close();
    }
  }

  // Helper required to get email data string before hard-deleting record
  async getUserById(userId: string) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT EMail as "email" FROM APP_USER WHERE User_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      if (!result.rows || result.rows.length === 0) {
        throw new NotFoundException('Target application user not found');
      }
      return result.rows[0] as { email: string };
    } finally {
      await conn.close();
    }
  }

  async deleteUser(userId: string) {
    const conn = await this.db.getConnection();
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

  async createOperator(data: any) {
    return await this.db.executeInTransaction(async (conn) => {
      const userRes = await conn.execute(
        `INSERT INTO APP_USER (first_name, last_name, EMail, Password_Hash) 
         VALUES (:firstName, :lastName, :email, :password) RETURNING User_ID INTO :id`,
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
      );

      const userId = (userRes.outBinds as any).id[0];

      await conn.execute(
        `INSERT INTO OPERATOR (User_ID, Assigned_Kiosk) VALUES (:userId, :kiosk)`,
        {
          userId,
          kiosk: data.assignedKiosk || null,
        },
      );

      return { message: 'Operator created', userId };
    });
  }

  async getAllOperators() {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT au.User_ID, au.first_name, au.last_name, au.EMail, 
                o.Assigned_Kiosk, k.Location_Name as kiosk_location
         FROM APP_USER au
         JOIN OPERATOR o ON au.User_ID = o.User_ID
         LEFT JOIN KIOSK k ON o.Assigned_Kiosk = k.Kiosk_ID`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows || []).map(mapToCamelCase);
    } finally {
      await conn.close();
    }
  }

  // Transactionally safe handler to register hardware elements
  async createKiosk(locationName: string, status: string) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `INSERT INTO KIOSK (Location_Name, Status) 
         VALUES (:locationName, :status) RETURNING Kiosk_ID INTO :id`,
        {
          locationName,
          status,
          id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
      );
      const kioskId = (result.outBinds as any).id[0];
      await conn.commit();
      return { message: 'Kiosk registered', kioskId };
    } catch (err) {
      await conn.rollback();
      throw new InternalServerErrorException(
        'Failed to add physical kiosk resource',
      );
    } finally {
      await conn.close();
    }
  }

  async deleteKiosk(kioskId: string) {
    const conn = await this.db.getConnection();
    try {
      await conn.execute(`DELETE FROM KIOSK WHERE Kiosk_ID = :kioskId`, {
        kioskId,
      });
      await conn.commit();
      return { message: 'Kiosk structure dropped', kioskId };
    } catch (err) {
      await conn.rollback();
      throw new InternalServerErrorException(
        'Failed to clear terminal asset configuration parameters',
      );
    } finally {
      await conn.close();
    }
  }
}
