import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminKiosksService } from './admin-kiosks.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/kiosks')
export class AdminKiosksController {
  constructor(private readonly adminKiosksService: AdminKiosksService) {}

  @Get('available-bins')
  async getAvailableBins(@Query('pages') pages?: string) {
    const pagesRequired = pages ? parseInt(pages, 10) : undefined;
    return this.adminKiosksService.getAvailableBins(pagesRequired);
  }

  @Get(':id/bins')
  async getKioskBins(@Param('id', ParseIntPipe) id: number) {
    return this.adminKiosksService.getKioskBins(id);
  }
}
