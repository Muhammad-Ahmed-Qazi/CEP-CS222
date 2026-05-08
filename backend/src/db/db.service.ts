import { Injectable } from '@nestjs/common';
import * as oracledb from 'oracledb';

@Injectable()
export class DbService {
  getConnection(): oracledb.Connection {
    // Placeholder: returning an empty object cast as Connection
    return {} as oracledb.Connection;
  }
}
