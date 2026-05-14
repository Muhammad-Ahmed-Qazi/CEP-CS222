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
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body) {
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return await this.authService.getFullProfile(req.user.userId);
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
    return await this.authService.updateProfile(req.user.userId, body);
  }

  /**
   * Task 4: Change Password
   */
  @UseGuards(JwtAuthGuard)
  @Patch('password')
  async changePassword(@Request() req, @Body() body) {
    return await this.authService.updatePassword(req.user.userId, body);
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
    return await this.authService.updateAvatar(req.user.userId, dbPath);
  }

  /**
   * Task 4: Delete Account
   */
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteAccount(@Request() req) {
    return await this.authService.deleteAccount(req.user.userId);
  }
}
