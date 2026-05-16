import { Module } from '@nestjs/common';
import { OperatorController } from './operator.controller';
import { OperatorService } from './operator.service';
import { DbModule } from '../db/db.module';
import { NotificationsModule } from '../notifications/notifications.module'; // Assume path
import { LoggingModule } from 'src/logging/logging.module';

@Module({
  imports: [LoggingModule, DbModule, NotificationsModule],
  controllers: [OperatorController],
  providers: [OperatorService],
})
export class OperatorModule {}
