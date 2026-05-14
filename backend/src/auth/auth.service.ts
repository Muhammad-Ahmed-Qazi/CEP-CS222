import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import * as bcrypt from 'bcrypt';
import * as oracledb from 'oracledb';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwtService: JwtService,
  ) {}

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
   * Task 4: Auto login after register
   */
  async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const result = await this.db.executeInTransaction(async (conn) => {
      // 1. Insert into APP_USER
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

      const userId = (userResult.outBinds as any).p_out_id[0];

      // 2. Task 4 Fix: Update login tracking immediately upon registration
      await conn.execute(
        `UPDATE APP_USER 
        SET LAST_LOGIN_TIMESTAMP = CURRENT_TIMESTAMP, 
            ACTIVE_SESSION = 1 
        WHERE User_ID = :userId`,
        { userId },
      );

      // 3. Handle sub-tables
      await conn.execute(
        `INSERT INTO NORMAL_USER (User_ID, Account_balance) VALUES (:p_uid, 0)`,
        { p_uid: userId },
      );

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
      return userId;
    });

    const payload = { sub: result, email: data.email, role: data.role };
    return {
      message: 'User registered successfully',
      userId: result,
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(email: string, pass: string) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT User_ID, Password_Hash, EMail FROM APP_USER WHERE EMail = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const user = (result.rows as any[])?.[0];
      if (!user || !(await bcrypt.compare(pass, user.PASSWORD_HASH))) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Task 4 Fix: Update both timestamp and session status
      await conn.execute(
        `UPDATE APP_USER 
        SET LAST_LOGIN_TIMESTAMP = CURRENT_TIMESTAMP, 
            ACTIVE_SESSION = 1 
        WHERE User_ID = :id`,
        { id: user.USER_ID },
        { autoCommit: true },
      );

      const profileRes = await conn.execute(
        `SELECT Role FROM V_USER_PROFILE WHERE User_ID = :id`,
        { id: user.USER_ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const role = (profileRes.rows as any[])?.[0]?.ROLE || 'user';

      const payload = { sub: user.USER_ID, email: user.EMAIL, role: role };
      return {
        access_token: this.jwtService.sign(payload),
        userId: user.USER_ID,
      };
    } finally {
      await conn.close();
    }
  }

  async getFullProfile(userId: number) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT * FROM V_USER_PROFILE WHERE User_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const row = (result.rows as any[])?.[0];
      if (!row) throw new NotFoundException('User not found');
      return this.mapResponse(row);
    } finally {
      await conn.close();
    }
  }

  async updateProfile(
    userId: number,
    data: { firstName: string; lastName: string },
  ) {
    const conn = await this.db.getConnection();
    try {
      await conn.execute(
        `UPDATE APP_USER SET first_name = :firstName, last_name = :lastName WHERE User_ID = :userId`,
        { firstName: data.firstName, lastName: data.lastName, userId },
        { autoCommit: true },
      );
      return this.getFullProfile(userId);
    } finally {
      await conn.close();
    }
  }

  async updatePassword(userId: number, dto: any) {
    const conn = await this.db.getConnection();
    try {
      const res = await conn.execute(
        `SELECT Password_Hash FROM APP_USER WHERE User_ID = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const user = (res.rows as any[])?.[0];
      if (!user) throw new NotFoundException('User not found');

      const isMatch = await bcrypt.compare(
        dto.currentPassword,
        user.PASSWORD_HASH,
      );
      if (!isMatch) throw new BadRequestException('Current password incorrect');

      const newHash = await bcrypt.hash(dto.newPassword, 10);
      await conn.execute(
        `UPDATE APP_USER SET Password_Hash = :newHash WHERE User_ID = :userId`,
        { newHash, userId },
        { autoCommit: true },
      );
      return { message: 'Password updated' };
    } finally {
      await conn.close();
    }
  }

  async deleteAccount(userId: number) {
    const conn = await this.db.getConnection();
    try {
      await conn.execute(
        `DELETE FROM PRINT_JOB 
        WHERE Job_ID IN (SELECT Job_ID FROM SUBMITS WHERE User_ID = :userId)`,
        { userId },
      );

      const result = await conn.execute(
        `DELETE FROM APP_USER WHERE User_ID = :userId`,
        { userId },
        { autoCommit: true }, // Commit the whole chain
      );

      if (result.rowsAffected === 0) {
        throw new NotFoundException('User not found');
      }

      return {
        message: 'Account and all related print history deleted successfully',
      };
    } catch (error) {
      throw error;
    } finally {
      await conn.close();
    }
  }

  async updateAvatar(userId: number, filePath: string) {
    const conn = await this.db.getConnection();
    try {
      await conn.execute(
        `UPDATE APP_USER SET profile_picture = :filePath WHERE User_ID = :userId`,
        { filePath, userId },
        { autoCommit: true },
      );
      return this.getFullProfile(userId);
    } finally {
      await conn.close();
    }
  }
}
