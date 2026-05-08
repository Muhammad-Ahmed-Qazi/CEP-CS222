import { Injectable } from '@nestjs/common';
import oracledb from 'oracledb';

@Injectable()
export class DbService {
  async getConnection() {
    return oracledb.getConnection({
      user: 'system',
      password: 'maqSQL!15082004',
      connectString: 'localhost:1521/XE',
    });
  }
}