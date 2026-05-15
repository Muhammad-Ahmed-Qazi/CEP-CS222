import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ReportsService, MySummaryData } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Adjust path if needed
import { AdminGuard } from '../auth/guards/admin.guard'; // Adjust path if needed
import {
  DailySystemReport,
  UserSummaryReport,
} from './interfaces/reports.interface';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('user-summary')
  async getUserSummary(): Promise<UserSummaryReport[]> {
    return this.reportsService.getUserSummary();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('daily')
  async getDailyReport(): Promise<DailySystemReport[]> {
    return this.reportsService.getDailyReport();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-summary')
  async getMySummary(
    @Request() req: { user: { userId: number } },
  ): Promise<MySummaryData> {
    // Calls the newly updated service method that handles the complex logic
    // and returns the combined metrics (duplex savings, job statuses, etc.)
    return this.reportsService.getMySummary(req.user.userId);
  }
}
