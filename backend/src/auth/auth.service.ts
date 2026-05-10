import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import * as bcrypt from 'bcrypt';
import * as oracledb from 'oracledb';

@Injectable()
export class AuthService {
  constructor(
    private db: DbService,
    private jwtService: JwtService,
  ) {}

  async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await this.db.executeInTransaction(async (conn) => {
      // 1. Insert into APP_USER (Superclass)
      // Using p_ prefix to avoid reserved word conflicts like ':pass'
      const userResult = await conn.execute(
        `INSERT INTO APP_USER (first_name, last_name, EMail, Password_Hash) 
         VALUES (:p_fname, :p_lname, :p_email, :p_pass) 
         RETURNING User_ID INTO :p_out_id`,
        {
          p_fname: data.firstName,
          p_lname: data.lastName,
          p_email: data.email,
          p_pass: hashedPassword,
          p_out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
      );

      // Ensure no semicolon is at the end of the query string above
      const outBinds = userResult.outBinds as any;
      const userId = outBinds.p_out_id[0];

      // 2. Insert into NORMAL_USER
      await conn.execute(
        `INSERT INTO NORMAL_USER (User_ID, Account_balance) VALUES (:p_uid, 0)`,
        { p_uid: userId },
      );

      // 3. Insert into Specific Subclass
      if (data.role === 'student') {
        await conn.execute(
          `INSERT INTO STUDENT (User_ID, Major, Student_Batch) VALUES (:p_uid, :p_mjr, :p_btch)`,
          { p_uid: userId, p_mjr: data.major, p_btch: data.studentBatch },
        );
      } else if (data.role === 'faculty') {
        await conn.execute(
          `INSERT INTO FACULTY (User_ID, Department, Faculty_Rank) VALUES (:p_uid, :p_dept, :p_rank)`,
          { p_uid: userId, p_dept: data.department, p_rank: data.facultyRank },
        );
      }

      return { message: 'User registered', userId };
    });
  }

  async login(email: string, pass: string) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute<any>(
        `SELECT User_ID, Password_Hash, EMail FROM APP_USER WHERE EMail = :p_email`,
        { p_email: email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      if (!result.rows || result.rows.length === 0) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const user = result.rows[0];
      if (!(await bcrypt.compare(pass, user.PASSWORD_HASH))) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const roleCheck = await conn.execute<any[]>(
        `SELECT 'admin' as role FROM ADMIN WHERE User_ID = :p_id
         UNION SELECT 'student' FROM STUDENT WHERE User_ID = :p_id
         UNION SELECT 'faculty' FROM FACULTY WHERE User_ID = :p_id`,
        { p_id: user.USER_ID },
      );

      let role = 'user';
      if (roleCheck.rows && roleCheck.rows.length > 0) {
        const firstRow = roleCheck.rows[0];
        role = Array.isArray(firstRow) ? firstRow[0] : (firstRow as any).ROLE;
      }

      await conn.execute(
        `UPDATE APP_USER SET Active_session = 1, last_login_timestamp = CURRENT_TIMESTAMP WHERE User_ID = :p_id`,
        { p_id: user.USER_ID },
      );

      await conn.commit();

      const payload = { sub: user.USER_ID, email: user.EMAIL, role };
      return { access_token: this.jwtService.sign(payload) };
    } finally {
      await conn.close();
    }
  }

  async getFullProfile(userId: number) {
    const conn = await this.db.getConnection();
    try {
      const sql = `
        SELECT 
          u.User_ID as "userId", 
          u.First_Name as "firstName", 
          u.Last_Name as "lastName", 
          u.Email as "email", 
          n.Account_balance as "accountBalance"
        FROM APP_USER u
        LEFT JOIN NORMAL_USER n ON u.User_ID = n.User_ID
        WHERE u.User_ID = :userId
      `;

      const result = await conn.execute(
        sql, 
        { userId }, 
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return result.rows?.[0];
    } finally {
      await conn.close();
    }
  }
}
