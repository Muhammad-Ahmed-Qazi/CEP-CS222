import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService, ForgotPasswordDto, ResetPasswordDto } from './auth.service';
import { LoggingService } from '../logging/logging.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loggingService: LoggingService,
  ) {}

  @Post('register')
  async register(@Body() body, @Request() req) {
    const clientIp = req.ip || '127.0.0.1';
    const loginSource = req.headers['user-agent'] || 'Postman/Unknown';

    const result = await this.authService.register(body, clientIp);

    // Explicitly await access logging upon successful registration auto-login
    if (result && result.userId) {
      await this.loggingService.logAccess(result.userId, loginSource, clientIp);
      await this.loggingService.logAction(
        result.userId,
        'REGISTER',
        'APP_USER',
        result.userId,
      );
    }

    return result;
  }

  @Post('login')
  async login(@Body() body, @Request() req) {
    const clientIp = req.ip || '127.0.0.1';
    const loginSource = req.headers['user-agent'] || 'Postman/Unknown';

    const result = await this.authService.login(
      body.email,
      body.password,
      clientIp,
    );

    // Explicitly await access logging and audit action upon validation success
    if (result && result.userId) {
      await this.loggingService.logAccess(result.userId, loginSource, clientIp);
    }

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const result = await this.authService.getFullProfile(req.user.userId);

    // Optional: Log profile view actions if required by your audit requirements
    await this.loggingService.logAction(
      req.user.userId,
      'VIEW_PROFILE',
      'APP_USER',
      req.user.userId,
    );

    return result;
  }

  /**
   * Task 4: Update profile (firstName, lastName)
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(
    @Request() req,
    @Body() body: { firstName: string; lastName: string },
  ) {
    const result = await this.authService.updateProfile(req.user.userId, body);

    // Explicitly await audit log profile modifications
    await this.loggingService.logAction(
      req.user.userId,
      'UPDATE_PROFILE',
      'APP_USER',
      req.user.userId,
    );

    return result;
  }

  /**
   * Task 4: Change Password
   */
  // @UseGuards(JwtAuthGuard)
  // @Patch('password')
  // async changePassword(@Request() req, @Body() body) {
  //   const result = await this.authService.updatePassword(req.user.userId, body);

  //   // Explicitly await audit log security updates
  //   await this.loggingService.logAction(
  //     req.user.userId,
  //     'PASSWORD_CHANGE',
  //     'APP_USER',
  //     req.user.userId,
  //   );

  //   return result;
  // }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * Task 4: Profile Picture Upload
   */
  @UseGuards(JwtAuthGuard)
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) throw new BadRequestException('Image file is required');

    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `profile-${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    // Save the relative path in the DB
    const dbPath = filePath.replace(/\\/g, '/');
    const result = await this.authService.updateAvatar(req.user.userId, dbPath);

    // Explicitly await audit log static resource mutations
    await this.loggingService.logAction(
      req.user.userId,
      'UPLOAD_AVATAR',
      'APP_USER',
      req.user.userId,
    );

    return result;
  }

  /**
   * Task 4: Delete Account
   */
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteAccount(@Request() req) {
    const result = await this.authService.deleteAccount(req.user.userId);

    // Explicitly await final operational audit execution trace record
    await this.loggingService.logAction(
      req.user.userId,
      'DELETE_ACCOUNT',
      'APP_USER',
      req.user.userId,
    );

    return result;
  }
}
