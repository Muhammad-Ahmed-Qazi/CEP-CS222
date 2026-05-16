import { Module } from '@nestjs/common';
import { KioskController } from './kiosk.controller';
import { KioskService } from './kiosk.service';

// Assuming DbModule exports DbService
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [KioskController],
  providers: [KioskService],
  exports: [KioskService],
})
export class KioskModule {}
