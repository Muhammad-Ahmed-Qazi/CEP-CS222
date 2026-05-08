import { Controller, Get } from '@nestjs/common';
import { DbService } from './db.service';
import { Connection } from 'oracledb';

@Controller()
export class AppController {
  constructor(private readonly db: DbService) {}

  @Get('health')
  async health(): Promise<object> {
    const conn: Connection = await this.db.getConnection();
    const result = await conn.execute<[number]>('SELECT 1 FROM DUAL');
    await conn.close();
    return { status: 'ok', oracle: result.rows };
  }
}
