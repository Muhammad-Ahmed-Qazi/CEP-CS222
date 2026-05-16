import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  Request,
  Param,
  Delete,
  ParseIntPipe,
  BadRequestException,
  Req,
  Query,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobFilters, JobsService } from './jobs.service';
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
  )
  async create(
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] },
    @Body() body: any,
    @Request() req,
  ) {
    // Ensure the primary PDF file was uploaded
    const pdfFile = files?.file?.[0];
    if (!pdfFile) throw new BadRequestException('PDF file is required');

    // 1. Prepare naming and directories
    const uploadDir = 'uploads';
    const thumbnailDir = path.join(uploadDir, 'thumbnails'); // "uploads/thumbnails"

    // Ensure target folders exist safely
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(thumbnailDir))
      fs.mkdirSync(thumbnailDir, { recursive: true });

    // Generate ONE master unique tracking stamp for both files
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1e9);
    const cleanFileName = pdfFile.originalname
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.-]/g, '');

    // PDF Master Name
    const pdfName = `file-${timestamp}-${randomId}-${cleanFileName}`;
    const pdfPath = path.join(uploadDir, pdfName);

    try {
      // Save the PDF
      fs.writeFileSync(pdfPath, pdfFile.buffer);
    } catch (err) {
      throw new BadRequestException('Failed to save file to server.');
    }

    // Handle the Thumbnail storage if provided by the frontend payload
    const thumbnailFile = files?.thumbnail?.[0];

    if (thumbnailFile) {
      // Extract base name without its extension and swap it to .jpg
      const baseName =
        pdfName.substring(0, pdfName.lastIndexOf('.')) || pdfName;
      const thumbnailName = `${baseName}.jpg`;
      const thumbPath = path.join(thumbnailDir, thumbnailName);

      try {
        fs.writeFileSync(thumbPath, thumbnailFile.buffer);
      } catch (err) {
        console.error('Failed to write thumbnail file:', err);
        // Don't crash the entire request if just the optional thumbnail creation fails
      }
    }

    // 2. Extract Page Count from Buffer
    let pdfPageCount = 0;
    try {
      const pdfDoc = await PDFDocument.load(pdfFile.buffer);
      pdfPageCount = pdfDoc.getPageCount();
    } catch (e) {
      throw new BadRequestException(
        'Could not read PDF. File may be corrupted.',
      );
    }

    const jobParams = {
      pages: pdfPageCount,
      copies: parseInt(body.copies, 10) || 1,
      jobType: body.jobType || 'normal',
      printMode: body.printMode || 'bw',
      printSide: body.printSide || 'single',
      collectionSlot: body.collectionSlot,
    };

    // Assuming calculateJobDetails is globally imported or in scope
    const calculatedDetails = calculateJobDetails(jobParams);

    // 3. Pass paths and metadata down to your database service
    return this.jobsService.submitJob(req.user.userId, req.user.role, pdfFile, {
      ...body,
      pageCount: pdfPageCount,
      totalCost: calculatedDetails.totalCost,
      expiryTime: calculatedDetails.expiryTime,
      collectionSlot: calculatedDetails.calculatedSlot || body.collectionSlot,
      savedPath: pdfPath.replace(/\\/g, '/'),
    });
  }

  /**
   * Task 1: Refactored to use V_JOB_DETAILS View
   */
  // @Get()
  // async findAll(@Request() req) {
  //   return this.jobsService.findAll(req.user.userId);
  // }

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
    @Request() req,
  ) {
    if (!collectionSlot)
      throw new BadRequestException(
        'collectionSlot is required for reprinting',
      );
    return this.jobsService.reprintJob(id, req.user.userId, collectionSlot);
  }

  @Get(':id/qr')
  async getJobQr(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.jobsService.getJobQr(req.user.userId, id);
  }

  @Get()
  async getJobs(
    @Request() req: { user: { userId: number } },
    @Query('status') status?: string,
    @Query('jobType') jobType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    
  ) {
    const filters: JobFilters = { status, jobType, from, to, search };
    // This service method should now be your single source of truth for fetching jobs
    return this.jobsService.getJobs(req.user.userId, filters);
  }

  @Get(':id/invoice')
  async getInvoice(
    @Request() req: { user: { userId: number } },
    @Param('id', ParseIntPipe) jobId: number,
  ) {
    return this.jobsService.getJobInvoice(req.user.userId, jobId);
  }
}
