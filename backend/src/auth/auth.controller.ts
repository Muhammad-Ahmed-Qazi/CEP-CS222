import { Controller, Post, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(): string {
    return this.authService.register();
  }

  @Post('login')
  login(): string {
    return this.authService.login();
  }

  @Get('me')
  getMe(): string {
    return this.authService.getMe();
  }
}
