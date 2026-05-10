import { Injectable } from '@nestjs/common';
import * as oracledb from 'oracledb';

@Injectable()
export class DbService {
  async getConnection(): Promise<oracledb.Connection> {
    return await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING,
    });
  }

  // Add this method to fix error TS2339
  async executeInTransaction<T>(
    callback: (conn: oracledb.Connection) => Promise<T>,
  ): Promise<T> {
    const conn = await this.getConnection();
    try {
      const result = await callback(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      await conn.close();
    }
  }
}
