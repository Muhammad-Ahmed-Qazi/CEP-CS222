import { Controller, Get, Post } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  getTransactions(): string {
    return this.transactionsService.getTransactions();
  }

  @Post('topup')
  topupBalance(): string {
    return this.transactionsService.topupBalance();
  }
}
