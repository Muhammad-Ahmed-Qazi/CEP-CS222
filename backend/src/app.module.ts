import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbService } from './db.service';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { AdminModule } from './admin/admin.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    DbModule,
    AuthModule,
    JobsModule,
    AdminModule,
    TransactionsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService, DbService],
})
export class AppModule {}
