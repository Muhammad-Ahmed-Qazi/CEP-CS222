import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
