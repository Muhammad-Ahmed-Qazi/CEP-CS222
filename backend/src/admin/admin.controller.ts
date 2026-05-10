import {
  Controller,
  Get,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('jobs')
  async getJobs(@Query('status') status?: string) {
    return this.adminService.getAllJobs(status);
  }

  @Patch('jobs/:id/handover')
  async handover(
    @Param('id') id: string,
    @Body() body: { kioskId: string; binId: string },
  ) {
    return this.adminService.confirmHandover(id, body.kioskId, body.binId);
  }

  @Get('users')
  async getUsers(@Query('search') search?: string) {
    return this.adminService.getUsers(search);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
