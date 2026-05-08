import { Controller, Get } from '@nestjs/common';
import { DbService } from './db.service';

@Controller()
export class AppController {
  constructor(private readonly db: DbService) {}

  @Get('health')
  async health() {
    const conn = await this.db.getConnection();
    const result = await conn.execute('SELECT 1 FROM DUAL');
    await conn.close();
    return { status: 'ok', oracle: result.rows };
  }
}