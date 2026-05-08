import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('user-summary')
  getUserSummary(): string {
    return this.reportsService.getUserSummary();
  }

  @Get('daily')
  getDailyReport(): string {
    return this.reportsService.getDailyReport();
  }
}
