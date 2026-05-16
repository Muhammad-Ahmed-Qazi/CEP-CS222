import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Task 5: Get all notifications
   */
  @Get()
  async findAll(@Request() req) {
    return this.notificationsService.findAll(req.user.userId);
  }

  /**
   * Task 5: Mark all as read
   * Note: This must come BEFORE /:id to avoid "read-all" being treated as an ID
   */
  @Patch('read-all')
  async markAllRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  /**
   * Task 5: Mark single as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  /**
   * Task 5: Clear all notifications
   */
  @Delete()
  async deleteAll(@Request() req) {
    return this.notificationsService.deleteAll(req.user.userId);
  }
}
