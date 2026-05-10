import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
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
  async getMySummary(@Request() req: any): Promise<UserSummaryReport> {
    const userId = req.user.userId;
    const records = await this.reportsService.getUserSummary(userId);
    return records[0] || null; // Return single object for the logged-in user
  }
}
