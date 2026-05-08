import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class AuthService {
  constructor(private readonly dbService: DbService) {}

  register(): string {
    return 'auth.register';
  }

  login(): string {
    return 'auth.login';
  }

  getMe(): string {
    return 'auth.me';
  }
}
