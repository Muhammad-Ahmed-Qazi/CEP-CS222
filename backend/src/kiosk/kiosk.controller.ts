import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  KioskService,
  CreateKioskDto,
  UpdateKioskDto,
  CreateBinDto,
  UpdateBinDto,
} from './kiosk.service';
import { AdminGuard } from '../auth/guards/admin.guard'; // Assume path
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assume path

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/kiosks')
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  @Get()
  getAllKiosks() {
    return this.kioskService.getAllKiosks();
  }

  @Post()
  createKiosk(@Body() dto: CreateKioskDto) {
    return this.kioskService.createKiosk(dto);
  }

  @Get('available-bins')
  getAvailableBins() {
    return this.kioskService.getAvailableBins();
  }

  @Patch(':id')
  updateKiosk(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKioskDto,
  ) {
    return this.kioskService.updateKiosk(id, dto);
  }

  @Delete(':id')
  deleteKiosk(@Param('id', ParseIntPipe) id: number) {
    return this.kioskService.deleteKiosk(id);
  }

  @Get(':id/bins')
  getBins(@Param('id', ParseIntPipe) id: number) {
    return this.kioskService.getBins(id);
  }

  @Post(':id/bins')
  addBin(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateBinDto) {
    return this.kioskService.addBin(id, dto);
  }

  @Patch(':id/bins/:binId')
  updateBin(
    @Param('id', ParseIntPipe) id: number,
    @Param('binId') binId: string,
    @Body() dto: UpdateBinDto,
  ) {
    return this.kioskService.updateBin(id, binId, dto);
  }

  @Delete(':id/bins/:binId')
  deleteBin(
    @Param('id', ParseIntPipe) id: number,
    @Param('binId') binId: string,
  ) {
    return this.kioskService.deleteBin(id, binId);
  }
}
