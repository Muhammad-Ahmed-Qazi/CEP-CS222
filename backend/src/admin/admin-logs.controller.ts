import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/logs')
export class AdminLogsController {
  constructor(private readonly db: DbService) {}

  @Get('audit')
  async getAuditLogs(
    @Query('userId') userId?: number,
    @Query('actionType') actionType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const conn = await this.db.getConnection();
    try {
      let query = `
        SELECT a.Log_ID as "logId", a.Action_Type as "actionType", 
               a.Entity_Name as "entityName", a.Entity_ID as "entityId", 
               a.Old_Value as "oldValue", a.New_Value as "newValue", 
               a.Action_Timestamp as "actionTimestamp", 
               (u.FIRST_NAME || ' ' || u.LAST_NAME) as "actorName", u.EMail as "actorEmail"
        FROM AUDIT_LOG a
        JOIN APP_USER u ON a.User_ID = u.User_ID
        WHERE 1=1
      `;
      const binds: Record<string, any> = {};

      if (userId) {
        query += ` AND u.User_ID = :userId`;
        binds.userId = userId;
      }
      if (actionType) {
        query += ` AND a.Action_Type = :actionType`;
        binds.actionType = actionType;
      }
      if (from) {
        // 👈 FIX: Changed bind variable from ':from' to ':fromDate'
        query += ` AND a.Action_Timestamp >= TO_TIMESTAMP(:fromDate, 'YYYY-MM-DD HH24:MI:SS')`;
        binds.fromDate = from;
      }
      if (to) {
        // 👈 FIX: Changed bind variable from ':to' to ':toDate'
        query += ` AND a.Action_Timestamp <= TO_TIMESTAMP(:toDate, 'YYYY-MM-DD HH24:MI:SS')`;
        binds.toDate = to;
      }

      query += ` ORDER BY a.Action_Timestamp DESC FETCH NEXT 500 ROWS ONLY`;

      const result = await conn.execute(query, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return result.rows;
    } finally {
      await conn.close();
    }
  }

  @Get('access')
  async getAccessLogs(
    @Query('userId') userId?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const conn = await this.db.getConnection();
    try {
      let query = `
        SELECT a.Access_ID as "accessId", a.Login_Timestamp as "loginTimestamp", 
               a.Logout_Timestamp as "logoutTimestamp", a.Login_Source as "loginSource", 
               a.IP_Address as "ipAddress", 
               u.User_ID as "userId", u.EMail as "userEmail", (u.FIRST_NAME || ' ' || u.LAST_NAME) as "userName"
        FROM ACCESS_LOG a
        JOIN APP_USER u ON a.User_ID = u.User_ID
        WHERE 1=1
      `;
      const binds: Record<string, any> = {};

      if (userId) {
        query += ` AND u.User_ID = :userId`;
        binds.userId = userId;
      }
      if (from) {
        query += ` AND a.Login_Timestamp >= TO_TIMESTAMP(:from, 'YYYY-MM-DD HH24:MI:SS')`;
        binds.from = from;
      }
      if (to) {
        query += ` AND a.Login_Timestamp <= TO_TIMESTAMP(:to, 'YYYY-MM-DD HH24:MI:SS')`;
        binds.to = to;
      }

      query += ` ORDER BY a.Login_Timestamp DESC FETCH NEXT 500 ROWS ONLY`;

      const result = await conn.execute(query, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return result.rows;
    } finally {
      await conn.close();
    }
  }
}
