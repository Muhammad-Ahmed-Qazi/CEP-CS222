import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
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
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    const allowedStatuses = ['Printing', 'Binned', 'Discarded'];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
      );
    }
    return this.jobsService.updateJobStatus(id, status);
  }
}
