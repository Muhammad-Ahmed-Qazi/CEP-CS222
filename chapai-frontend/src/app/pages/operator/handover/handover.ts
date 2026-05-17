import { Component, OnDestroy } from '@angular/core';
import { PrintData } from '../../../services/print-data';
import { Job } from '../../../models/dashboard.interface';

@Component({
  selector: 'app-handover',
  templateUrl: './handover.html',
  styleUrls: ['./handover.scss'],
  standalone: false
})
export class Handover implements OnDestroy {
  qrToken: string = '';
  isLoading: boolean = false;
  
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  scannedJob: any = null;
  countdownText: string = '';
  private countdownIntervalId: any;

  constructor(private printService: PrintData) {}

  ngOnDestroy(): void {
    this.clearTimer();
  }

  lookUpJob(): void {
    if (!this.qrToken.trim()) return;

    this.resetState();
    this.isLoading = true;

    this.printService.getJobByQr(this.qrToken.trim()).subscribe({
      next: (job: Job) => {
        this.isLoading = false;
        
        // Handle specific business logic states
        const status = (job.statusName || '').toLowerCase();
        
        if (status === 'collected') {
          this.errorMessage = 'This job has already been collected.';
          return;
        }
        
        if (status !== 'binned') {
          this.errorMessage = `This job is not ready for collection — current status: ${job.statusName || status}`;
          return;
        }

        this.scannedJob = job;
        this.startCountdown();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 404) {
          this.errorMessage = 'No job found with this QR token.';
        } else {
          this.errorMessage = err.error?.message || 'Failed to retrieve job details. Please try again.';
        }
      }
    });
  }

  executeHandover(): void {
    if (!this.scannedJob) return;

    this.isLoading = true;
    this.printService.confirmHandover(this.scannedJob.jobId, this.scannedJob.binId).subscribe({
      next: () => {
        this.isLoading = false;
        const studentName = `${this.scannedJob.userFirstName} ${this.scannedJob.userLastName}`;
        const jobId = this.scannedJob.jobId;
        
        this.resetState();
        this.successMessage = `Job #${jobId} successfully handed over to ${studentName}. Hardware bin cleared.`;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = `Handover failed: ${err.error?.message || err.message}`;
      }
    });
  }

  cancelLookup(): void {
    this.resetState();
  }

  private resetState(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.scannedJob = null;
    this.qrToken = '';
    this.clearTimer();
  }

  private startCountdown(): void {
    this.clearTimer();
    this.updateTimer(); // Initial call
    this.countdownIntervalId = setInterval(() => this.updateTimer(), 1000);
  }

  private updateTimer(): void {
    if (!this.scannedJob) return;

    // Check if natively expired from backend or past current time
    const expiryTime = new Date(this.scannedJob.expiryTime).getTime();
    const now = new Date().getTime();
    const remainingMs = expiryTime - now;

    if (this.scannedJob.isExpired || remainingMs <= 0) {
      this.scannedJob.isExpired = true;
      this.countdownText = 'EXPIRED';
      this.clearTimer();
    } else {
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      this.countdownText = `${minutes}m ${seconds}s`;
    }
  }

  private clearTimer(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }
}