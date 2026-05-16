import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async getHistory(@Request() req) {
    return this.transactionsService.getHistory(req.user.userId);
  }

  @Post('topup')
  async topUp(@Request() req, @Body() body: { amount: number }) {
    if (body.amount <= 0 || body.amount > 10000) {
      throw new BadRequestException('Amount must be between 1 and 10,000');
    }
    return this.transactionsService.topUp(req.user.userId, body.amount);
  }
}
