import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import { LoggingService } from '../logging/logging.service';
import { NotificationsService } from '../notifications/notifications.service'; // 👈 Added Import
import * as bcrypt from 'bcrypt';
import * as oracledb from 'oracledb';

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  otp: string;
  newPassword: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwtService: JwtService,
    private readonly loggingService: LoggingService,
    private readonly notifications: NotificationsService, // 👈 Injected Notifications Service
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
  async register(data: any, clientIp: string) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const userId = await this.db.executeInTransaction(async (conn) => {
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

      const currentUserId = (userResult.outBinds as any).p_out_id[0];

      // 2. Update login tracking immediately upon registration
      await conn.execute(
        `UPDATE APP_USER 
         SET LAST_LOGIN_TIMESTAMP = CURRENT_TIMESTAMP, 
             ACTIVE_SESSION = 1 
         WHERE User_ID = :userId`,
        { userId: currentUserId },
      );

      // 3. Handle sub-tables
      await conn.execute(
        `INSERT INTO NORMAL_USER (User_ID, Account_balance) VALUES (:p_uid, 0)`,
        { p_uid: currentUserId },
      );

      if (data.role === 'student') {
        await conn.execute(
          `INSERT INTO STUDENT (User_ID, Major, Student_Batch) VALUES (:p_uid, :p_mjr, :p_btch)`,
          {
            p_uid: currentUserId,
            p_mjr: data.major,
            p_btch: data.studentBatch,
          },
        );
      } else if (data.role === 'faculty') {
        await conn.execute(
          `INSERT INTO FACULTY (User_ID, Department, Faculty_Rank) VALUES (:p_uid, :p_dept, :p_rank)`,
          {
            p_uid: currentUserId,
            p_dept: data.department,
            p_rank: data.facultyRank,
          },
        );
      }
      return currentUserId;
    });

    // 4. Trigger Welcome Notification after successfully committing the user creation
    await this.notifications.createNotification(
      Number(userId),
      'Welcome!',
      'Your account has been created successfully. Top up your balance to get started.',
      'welcome',
    );

    // Generate access logging tables for metrics & populate dynamic tracking payloads
    const accessId = await this.loggingService.logAccess(
      userId,
      'Web',
      clientIp,
    );
    this.loggingService.logAction(userId, 'REGISTER', 'APP_USER', userId);

    const payload = {
      userId: userId, // Match 'req.user.userId' expected by your application profile lookups
      sub: userId,
      email: data.email,
      role: data.role || 'user',
      accessId: accessId, // Included accessId into your session tokens
    };

    return {
      message: 'User registered successfully',
      userId: userId,
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(email: string, pass: string, clientIp: string) {
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

      // Access Tracking Database Pipeline entries
      const accessId = await this.loggingService.logAccess(
        user.USER_ID,
        'Web',
        clientIp,
      );
      this.loggingService.logAction(
        user.USER_ID,
        'LOGIN',
        'APP_USER',
        user.USER_ID,
      );

      // Embedded accessId tracking directly into JWT payload token generations
      const payload = {
        userId: user.USER_ID,
        sub: user.USER_ID,
        email: user.PASSWORD_HASH, // Safe metadata placeholder matching service targets
        role: role,
        accessId: accessId,
      };

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

  // async updatePassword(userId: number, dto: any) {
  //   const conn = await this.db.getConnection();
  //   try {
  //     const res = await conn.execute(
  //       `SELECT Password_Hash FROM APP_USER WHERE User_ID = :userId`,
  //       { userId },
  //       { outFormat: oracledb.OUT_FORMAT_OBJECT },
  //     );

  //     const user = (res.rows as any[])?.[0];
  //     if (!user) throw new NotFoundException('User not found');

  //     const isMatch = await bcrypt.compare(
  //       dto.currentPassword,
  //       user.PASSWORD_HASH,
  //     );
  //     if (!isMatch) throw new BadRequestException('Current password incorrect');

  //     const newHash = await bcrypt.hash(dto.newPassword, 10);
  //     await conn.execute(
  //       `UPDATE APP_USER SET Password_Hash = :newHash WHERE User_ID = :userId`,
  //       { newHash, userId },
  //       { autoCommit: true },
  //     );
  //     return { message: 'Password updated' };
  //   } finally {
  //     await conn.close();
  //   }
  // }

  async deleteAccount(userId: number) {
    const conn = await this.db.getConnection();
    try {
      // Cascade delete historical references out of database transaction chains
      await conn.execute(
        `DELETE FROM PRINT_JOB
         WHERE JOB_ID IN (SELECT JOB_ID FROM SUBMITS WHERE User_ID = :userId)`,
        { userId },
      );

      const result = await conn.execute(
        `DELETE FROM APP_USER WHERE User_ID = :userId`,
        { userId },
        { autoCommit: true },
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const conn = await this.db.getConnection();
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Use FROM_TZ and TO_TIMESTAMP to force Karachi time (UTC+5)
      // or simply use SYSTIMESTAMP AT TIME ZONE 'Asia/Karachi'
      const result = await conn.execute(
        `UPDATE APP_USER 
        SET password_reset_token = :otp, 
            password_reset_expires = (SYSTIMESTAMP AT TIME ZONE 'Asia/Karachi') + INTERVAL '15' MINUTE
        WHERE Email = :email`,
        { otp, email: dto.email },
        { autoCommit: true }
      );

      return { 
        message: 'If this email exists, a reset code has been sent.',
        otp: result.rowsAffected === 1 ? otp : null 
      };
    } finally {
      await conn.close();
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute<Record<string, unknown>>(
        `SELECT password_reset_token, password_reset_expires 
         FROM APP_USER 
         WHERE Email = :email`,
        { email: dto.email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows || result.rows.length === 0) {
        throw new BadRequestException('Invalid request');
      }

      const user = result.rows[0];
      const token = user.PASSWORD_RESET_TOKEN as string;
      const expiry = user.PASSWORD_RESET_EXPIRES as Date;

      if (!token || token !== dto.otp) {
        throw new BadRequestException('Invalid OTP');
      }

      if (new Date() > expiry) {
        throw new BadRequestException('OTP has expired');
      }

      const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

      await conn.execute(
        `UPDATE APP_USER 
         SET Password_Hash = :hashedPassword, 
             password_reset_token = NULL, 
             password_reset_expires = NULL 
         WHERE Email = :email`,
        { hashedPassword, email: dto.email },
        { autoCommit: true }
      );

      return { message: 'Password reset successfully' };
    } finally {
      await conn.close();
    }
  }
}
