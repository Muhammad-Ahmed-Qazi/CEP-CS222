import { Injectable } from '@nestjs/common';
import oracledb, { Connection } from 'oracledb';

@Injectable()
export class DbService {
  async getConnection(): Promise<Connection> {
    return await oracledb.getConnection({
      user: 'PrintAdmin',
      password: 'cep-cs222',
      connectString: 'localhost:1521/XE',
    });
  }
}
