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
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from './admin.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { LoggingService } from '../logging/logging.service';
import * as bcrypt from 'bcrypt';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly loggingService: LoggingService, // 👈 Injected Logging Service
  ) {}

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
  async deleteUser(@Param('id') id: string, @Req() req: any) {
    // 1. Fetch user data before deletion to extract email details for audit trail
    const userToDelete = await this.adminService.getUserById(id);

    // 2. Perform database deletion
    const result = await this.adminService.deleteUser(id);

    // 3. Log the audit entry: logAction(adminId, action, targetTable, targetId, detail)
    await this.loggingService.logAction(
      req.userId,
      'ADMIN_DELETE_USER',
      'APP_USER',
      id,
      userToDelete?.email || 'Unknown Email',
    );

    return result;
  }

  @Post('operators')
  @UseGuards(AdminGuard)
  async createOperator(@Body() body: CreateOperatorDto, @Req() req: any) {
    const hashedPassword = await bcrypt.hash(body.password, 10);
    const result = await this.adminService.createOperator({
      ...body,
      password: hashedPassword,
    });

    // Log operator creation tracking the generated outBind ID
    await this.loggingService.logAction(
      req.user.sub,
      'CREATE_OPERATOR',
      'OPERATOR',
      result.userId.toString(),
    );

    return result;
  }

  @Get('operators')
  @UseGuards(AdminGuard)
  async getOperators() {
    return this.adminService.getAllOperators();
  }

  // Adding endpoints to match your logging architecture rules
  @Post('kiosks')
  @UseGuards(AdminGuard)
  async createKiosk(
    @Body() body: { locationName: string; status: string },
    @Req() req: any,
  ) {
    const result = await this.adminService.createKiosk(
      body.locationName,
      body.status,
    );

    await this.loggingService.logAction(
      req.user.sub,
      'CREATE_KIOSK',
      'KIOSK',
      result.kioskId.toString(),
    );

    return result;
  }

  @Delete('kiosks/:id')
  @UseGuards(AdminGuard)
  async deleteKiosk(@Param('id') id: string, @Req() req: any) {
    const result = await this.adminService.deleteKiosk(id);

    await this.loggingService.logAction(
      req.user.sub,
      'DELETE_KIOSK',
      'KIOSK',
      id,
    );

    return result;
  }
}
