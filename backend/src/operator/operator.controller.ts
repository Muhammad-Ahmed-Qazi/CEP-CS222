import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { OperatorService } from './operator.service';
import { OperatorGuard } from '../auth/guards/operator.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, OperatorGuard)
@Controller('operator')
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Get('queue')
  getQueue(@Req() req: any) {
    return this.operatorService.getQueue(req.user.userId);
  }

  @Get('bins')
  getBins(@Req() req: any) {
    return this.operatorService.getBins(req.user.userId);
  }

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.operatorService.getProfile(req.user.userId);
  }

  @Patch('bins/:binId')
  updateBin(
    @Req() req: any,
    @Param('binId') binId: string,
    @Body('binStatus') binStatus: string,
  ) {
    return this.operatorService.updateBin(req.user.userId, binId, binStatus);
  }

  @Patch('jobs/:id/assign-bin')
  assignBin(
    @Req() req: any,
    @Param('id', ParseIntPipe) jobId: number,
    @Body('binId') binId: string,
  ) {
    return this.operatorService.assignBin(req.user.userId, jobId, binId);
  }

  @Patch('jobs/:id/handover')
  handoverJob(
    @Req() req: any,
    @Param('id', ParseIntPipe) jobId: number,
    @Body('binId') binId: string,
  ) {
    return this.operatorService.handoverJob(req.user.userId, jobId, binId);
  }

  @Patch('jobs/:id/discard')
  discardJob(@Req() req: any, @Param('id', ParseIntPipe) jobId: number) {
    return this.operatorService.discardJob(req.user.userId, jobId);
  }
}
