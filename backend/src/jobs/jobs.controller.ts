import { Controller, Post, Get, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  createJob(): string {
    return this.jobsService.createJob();
  }

  @Get()
  getJobs(): string {
    return this.jobsService.getJobs();
  }

  @Get(':id')
  getJobById(@Param('id') id: string): string {
    return this.jobsService.getJobById(id);
  }
}
