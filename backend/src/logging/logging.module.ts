import { Module } from '@nestjs/common';
import { LoggingController } from './logging.controller';
import { LoggingService } from './logging.service';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [DbModule],
  controllers: [LoggingController],
  providers: [LoggingService],
  exports: [LoggingService], // Export LoggingService for use in other modules
})
export class LoggingModule {}

