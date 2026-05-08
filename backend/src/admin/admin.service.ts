import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class AdminService {
  constructor(private readonly dbService: DbService) {}

  getJobs(): string {
    return 'admin.jobs.getAll';
  }

  handoverJob(id: string): string {
    return `admin.jobs.handover: ${id}`;
  }

  getUsers(): string {
    return 'admin.users.getAll';
  }

  deleteUser(id: string): string {
    return `admin.users.delete: ${id}`;
  }
}
