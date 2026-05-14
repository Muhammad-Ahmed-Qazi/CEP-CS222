import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { DbModule } from '../db/db.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [DbModule, NotificationsModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
