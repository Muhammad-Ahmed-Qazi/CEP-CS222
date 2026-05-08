import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class ReportsService {
  constructor(private readonly dbService: DbService) {}

  getUserSummary(): string {
    return 'reports.userSummary';
  }

  getDailyReport(): string {
    return 'reports.daily';
  }
}
