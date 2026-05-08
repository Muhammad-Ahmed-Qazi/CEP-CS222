import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly dbService: DbService) {}

  getTransactions(): string {
    return 'transactions.getAll';
  }

  topupBalance(): string {
    return 'transactions.topup';
  }
}
