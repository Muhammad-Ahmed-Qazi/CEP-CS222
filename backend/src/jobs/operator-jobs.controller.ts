import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OperatorGuard } from '../auth/guards/operator.guard';
import { JobsService } from './jobs.service';

@UseGuards(JwtAuthGuard, OperatorGuard)
@Controller('operator/jobs')
export class OperatorJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Patch(':id/status')
  async updateStatus(
    @Request() req: any, // 👈 Make sure @Request() is injected here
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    const allowedStatuses = ['Printing', 'Binned', 'Discarded'];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
      );
    }
    
    // 👈 FIX: Add req.user.userId as the first parameter here
    return this.jobsService.updateJobStatus(req.user.userId, id, status);
  }
}
