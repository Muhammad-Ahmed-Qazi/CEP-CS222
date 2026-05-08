import { Controller, Get, Patch, Delete, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('jobs')
  getJobs(): string {
    return this.adminService.getJobs();
  }

  @Patch('jobs/:id/handover')
  handoverJob(@Param('id') id: string): string {
    return this.adminService.handoverJob(id);
  }

  @Get('users')
  getUsers(): string {
    return this.adminService.getUsers();
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string): string {
    return this.adminService.deleteUser(id);
  }
}
