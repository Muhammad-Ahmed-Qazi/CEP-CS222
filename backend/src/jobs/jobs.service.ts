import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class JobsService {
  constructor(private readonly dbService: DbService) {}

  createJob(): string {
    return 'jobs.create';
  }

  getJobs(): string {
    return 'jobs.getAll';
  }

  getJobById(id: string): string {
    return `jobs.getById: ${id}`;
  }
}
