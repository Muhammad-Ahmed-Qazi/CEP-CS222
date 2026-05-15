import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { OperatorService } from './operator.service';
import { OperatorGuard } from '../auth/guards/operator.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, OperatorGuard)
@Controller('operator')
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Get('queue')
  async getQueue(@Req() req: any) {
    return this.operatorService.getQueue(req.user.userId);
  }

  @Get('bins')
  async getBins(@Req() req: any) {
    return this.operatorService.getBins(req.user.userId);
  }

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.operatorService.getProfile(req.user.userId);
  }

  @Patch('bins/:binId')
  async updateBin(
    @Req() req: any,
    @Param('binId') binId: string,
    @Body('binStatus') binStatus: string,
  ) {
    return this.operatorService.updateBin(req.user.userId, binId, binStatus);
  }

  // --- Task 4: Scan QR ---
  @Get('jobs/qr/:token')
  async getJobByQr(@Param('token') token: string) {
    return this.operatorService.getJobByQrToken(token);
  }

  // --- Task 1: Assign Bin (Capacity Based) ---
  @Patch('jobs/:id/assign-bin')
  async assignBin(
    @Req() req: any,
    @Param('id', ParseIntPipe) jobId: number,
    @Body('binId') binId: string,
  ) {
    return this.operatorService.assignBin(req.user.userId, jobId, binId);
  }

  // --- Task 2: Handover Job (Bin ID now deduced in service) ---
  @Patch('jobs/:id/handover')
  async handoverJob(@Req() req: any, @Param('id', ParseIntPipe) jobId: number) {
    return this.operatorService.handoverJob(req.user.userId, jobId);
  }

  // --- Task 2: Discard Job ---
  @Patch('jobs/:id/discard')
  async discardJob(@Req() req: any, @Param('id', ParseIntPipe) jobId: number) {
    return this.operatorService.discardJob(req.user.userId, jobId);
  }
}
