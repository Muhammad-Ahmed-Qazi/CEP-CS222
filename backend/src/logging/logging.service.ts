import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service'; // Adjust path based on your layout
import * as oracledb from 'oracledb';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private readonly db: DbService) {}

  async logAction(
    userId: number,
    actionType: string,
    entityName: string,
    entityId: string | number,
    oldValue?: string,
    newValue?: string,
  ): Promise<number | null> {
    let conn: oracledb.Connection | null = null;
    try {
      conn = await this.db.getConnection();

      // 1. Insert into AUDIT_LOG and get the generated Log_ID
      const auditResult = await conn.execute(
        `INSERT INTO AUDIT_LOG (Action_Type, Entity_Name, Entity_ID, Old_Value, New_Value, Action_Timestamp, User_ID) 
         VALUES (:actionType, :entityName, :entityId, :oldValue, :newValue, CURRENT_TIMESTAMP, :userId) 
         RETURNING Log_ID INTO :logId`,
        {
          actionType,
          entityName,
          entityId: String(entityId),
          oldValue: oldValue || null,
          newValue: newValue || null,
          userId,
          logId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: false }, // Explicit transactional boundary
      );

      // Type-cast outBinds to satisfy TS compiler
      const outBinds = auditResult.outBinds as { [key: string]: any[] };
      if (!outBinds || !outBinds['logId'] || outBinds['logId'].length === 0) {
        throw new Error('Failed to retrieve Log_ID outBind from Oracle.');
      }

      const logId = outBinds['logId'][0];

      // CRITICAL FIX: Commit the transaction explicitly so data persists!
      await conn.commit();

      this.logger.log(
        `Successfully logged action [${actionType}] for user ${userId} (Log_ID: ${logId})`,
      );
      return logId;
    } catch (error) {
      // 1. Primary Operation Failure Log
      this.logger.error(
        `Failed to log action [${actionType}] for user ${userId}: ${error.message}`,
        error.stack,
      );

      if (conn) {
        try {
          this.logger.warn(
            `Attempting database transaction rollback for user ${userId}...`,
          );
          await conn.rollback();
        } catch (rollbackError) {
          this.logger.error(
            `Critical: Transaction rollback failed for user ${userId}: ${rollbackError.message}`,
            rollbackError.stack,
          );
        }
      }

      // Bubble the primary error up so calling controllers/services know the write failed
      throw error;
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (closeError) {
          this.logger.error(
            `Resource Leak Warning: Failed to close Oracle connection cleanly for user ${userId}: ${closeError.message}`,
            closeError.stack,
          );
          throw closeError;
        }
      }
    }
  }

  async logAccess(
    userId: number,
    loginSource: string,
    ipAddress: string,
  ): Promise<number | null> {
    let conn: oracledb.Connection | null = null;
    try {
      conn = await this.db.getConnection();

      const accessResult = await conn.execute(
        `INSERT INTO ACCESS_LOG (Login_Timestamp, Login_Source, IP_Address, User_ID) 
        VALUES (CURRENT_TIMESTAMP, :loginSource, :ipAddress, :userId) 
        RETURNING Access_ID INTO :accessId`,
        {
          loginSource,
          ipAddress,
          userId,
          accessId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: false },
      );

      const outBinds = accessResult.outBinds as { [key: string]: any[] };
      if (
        !outBinds ||
        !outBinds['accessId'] ||
        outBinds['accessId'].length === 0
      ) {
        throw new Error('Failed to retrieve Access_ID outBind from Oracle.');
      }

      const accessId = outBinds['accessId'][0];

      await conn.commit();
      return accessId;
    } catch (error) {
      this.logger.error(
        `Failed to log access for user ${userId}: ${error.message}`,
      );
      if (conn) {
        try {
          await conn.rollback();
        } catch (e) {}
      }
      return null;
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (e) {}
      }
    }
  }

  async logLogout(accessId: number): Promise<void> {
    if (!accessId) return;
    let conn: oracledb.Connection | null = null;
    try {
      conn = await this.db.getConnection();
      await conn.execute(
        `UPDATE ACCESS_LOG SET Logout_Timestamp = CURRENT_TIMESTAMP WHERE Access_ID = :accessId`,
        { accessId },
        { autoCommit: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to log logout for accessId ${accessId}: ${error.message}`,
      );
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (e) {}
      }
    }
  }
}
