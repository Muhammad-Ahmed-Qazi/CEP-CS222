import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Param,
  Delete,
  Patch,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobsService } from './jobs.service';
import { PDFDocument } from 'pdf-lib';
import { calculateJobDetails } from './pricing.engine';
import { Multer } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req,
  ) {
    if (!file) throw new BadRequestException('PDF file is required');

    // 1. Prepare naming and directories
    const uploadDir = 'uploads'; // Relative directory
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Format filename: file-[timestamp]-[random].pdf 
    // We also replace spaces with hyphens and remove special characters
    const cleanFileName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
    const fileName = `file-${Date.now()}-${Math.round(Math.random() * 1e9)}-${cleanFileName}`;

    const filePath = path.join(uploadDir, fileName); // This results in "uploads/file-..."

    try {
      // Save the file using the relative path
      fs.writeFileSync(filePath, file.buffer);
    } catch (err) {
      throw new BadRequestException('Failed to save file to server.');
    }

    // 2. Extract Page Count from Buffer
    let pdfPageCount = 0;
    try {
      const pdfDoc = await PDFDocument.load(file.buffer);
      pdfPageCount = pdfDoc.getPageCount();
    } catch (e) {
      throw new BadRequestException('Could not read PDF. File may be corrupted.');
    }

    const jobParams = {
      pages: pdfPageCount,
      copies: parseInt(body.copies, 10) || 1,
      jobType: body.jobType || 'normal',
      printMode: body.printMode || 'bw',
      printSide: body.printSide || 'single',
      collectionSlot: body.collectionSlot,
    };

    const calculatedDetails = calculateJobDetails(jobParams);

    // 3. Pass the saved filePath to the service
    return this.jobsService.submitJob(req.user.userId, req.user.role, file, {
      ...body,
      pageCount: pdfPageCount,
      totalCost: calculatedDetails.totalCost,
      expiryTime: calculatedDetails.expiryTime,
      collectionSlot: calculatedDetails.calculatedSlot || body.collectionSlot,
      savedPath: filePath.replace(/\\/g, '/'), // New field
    });
  }

  /**
   * Task 1: Refactored to use V_JOB_DETAILS View
   */
  @Get()
  async findAll(@Request() req) {
    return this.jobsService.findAll(req.user.userId);
  }

  /**
   * Task 1: Refactored to use V_JOB_DETAILS View with ID filter
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.jobsService.findOne(id, req.user.userId);
  }

  @Delete(':id')
  async cancelJob(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.jobsService.cancelJob(id, req.user.userId);
  }

  @Post(':id/reprint')
  async reprintJob(
    @Param('id', ParseIntPipe) id: number,
    @Body('collectionSlot') collectionSlot: string,
    @Request() req
  ) {
    if (!collectionSlot) throw new BadRequestException('collectionSlot is required for reprinting');
    return this.jobsService.reprintJob(id, req.user.userId, collectionSlot);
  }
}
