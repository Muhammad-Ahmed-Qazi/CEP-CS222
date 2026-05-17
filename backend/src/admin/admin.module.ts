import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { LoggingModule } from 'src/logging/logging.module';
import { AdminLogsController } from './admin-logs.controller';
import { AdminKiosksController } from './admin-kiosks.controller';
import { AdminKiosksService } from './admin-kiosks.service';

@Module({
  imports: [LoggingModule],
  controllers: [AdminController, AdminLogsController, AdminKiosksController],
  providers: [AdminService, AdminKiosksService],
  exports: [AdminKiosksService], // Exporting for OperatorModule
})
export class AdminModule {}
