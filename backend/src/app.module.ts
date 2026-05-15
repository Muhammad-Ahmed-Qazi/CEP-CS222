import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DbService } from './db/db.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { JobsModule } from './jobs/jobs.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { KioskModule } from './kiosk/kiosk.module';
import { OperatorModule } from './operator/operator.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DbModule,
    AuthModule,
    JobsModule,
    TransactionsModule,
    ReportsModule,
    AdminModule,
    NotificationsModule,
    KioskModule,
    OperatorModule,
    LoggingModule,
  ],
  controllers: [AppController],
  providers: [AppService, DbService],
})
export class AppModule {}
