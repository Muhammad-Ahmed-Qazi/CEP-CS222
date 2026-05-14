import {
  Controller,
  Get,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Post,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from './admin.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import * as bcrypt from 'bcrypt';

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
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('operators')
  @UseGuards(AdminGuard)
  async createOperator(@Body() body: CreateOperatorDto) {
    const hashedPassword = await bcrypt.hash(body.password, 10);
    // Service logic should handle the double insert into APP_USER then OPERATOR
    return this.adminService.createOperator({
      ...body,
      password: hashedPassword,
    });
  }

  @Get('operators')
  @UseGuards(AdminGuard)
  async getOperators() {
    return this.adminService.getAllOperators(); // Joins APP_USER + OPERATOR + KIOSK
  }
}
