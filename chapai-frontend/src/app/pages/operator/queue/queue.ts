import { Component, OnInit, OnDestroy } from '@angular/core';
import { PrintData } from '../../../services/print-data';

@Component({
  selector: 'app-operator-queue',
  templateUrl: './queue.html',
  styleUrl: './queue.scss',
  standalone: false,
})
export class Queue implements OnInit, OnDestroy {
  allJobs: any[] = [];
  filteredJobs: any[] = [];
  availableBins: any[] = [];
  
  selectedStatus: string = 'All';
  selectedJobType: string = 'Normal'; 
  
  showBinModal: boolean = false;
  activeJobToBin: any = null;
  selectedBinId: string = '';

  private pollingIntervalId: any;
  private countdownIntervalId: any;

  constructor(private printService: PrintData) {}

  ngOnInit(): void {
    this.fetchQueueData();
    // Automated background polling refresh loop every 10 seconds
    this.pollingIntervalId = setInterval(() => { this.fetchQueueData(); }, 10000);
    this.countdownIntervalId = setInterval(() => { this.updateExpiryCountdowns(); }, 1000);
  }

  ngOnDestroy(): void {
    if (this.pollingIntervalId) clearInterval(this.pollingIntervalId);
    if (this.countdownIntervalId) clearInterval(this.countdownIntervalId);
  }

  fetchQueueData(): void {
    const statusQueryParam = this.selectedStatus === 'All' ? undefined : this.selectedStatus;

    this.printService.getOperatorJobs(statusQueryParam).subscribe({
      next: (data) => {
        this.allJobs = (data || []).map((job: any) => {
          const firstName = job.userFirstName || '';
          const lastName = job.userLastName || '';
          const computedName = `${firstName} ${lastName}`.trim();

          let rawStatus = job.statusName || job.status || 'Pending';
          let normalizedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

          return {
            ...job,
            id: job.jobId,
            pages: job.pageCount,
            userName: computedName || 'Anonymous User',
            status: normalizedStatus
          };
        });

        this.applyUiFilters();
      },
      error: (err) => console.error('Operator queue fetch failed:', err)
    });
  }

  applyUiFilters(): void {
    this.filteredJobs = this.allJobs.filter(job => {
      const currentType = job.jobType || 'Normal';
      return currentType.toLowerCase() === this.selectedJobType.toLowerCase();
    });
  }

  changeStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.fetchQueueData(); 
  }

  changeJobTypeFilter(type: string): void {
    this.selectedJobType = type;
    this.applyUiFilters(); 
  }

  handleStatusTransition(job: any, targetStatus: string): void {
    if (targetStatus === 'Binned') {
      this.openBinAssignment(job);
    } else {
      this.printService.updateJobStatus(job.id, targetStatus).subscribe({
        next: () => this.fetchQueueData(),
        error: (err) => alert(`Transition rejection: ${err.message}`)
      });
    }
  }

  openBinAssignment(job: any): void {
    this.activeJobToBin = job;
    this.selectedBinId = '';
    this.printService.getAvailableBins(job.pages).subscribe({
      next: (bins) => {
        this.availableBins = bins || [];
        this.showBinModal = true;
      },
      error: (err) => alert(`Unable to pull capacity matrices: ${err.message}`)
    });
  }

  executeBinBinding(): void {
    if (!this.selectedBinId || !this.activeJobToBin) return;

    this.printService.assignBin(this.activeJobToBin.id, this.selectedBinId).subscribe({
      next: () => {
        this.printService.updateJobStatus(this.activeJobToBin.id, 'Binned').subscribe({
          next: () => {
            this.showBinModal = false;
            this.activeJobToBin = null;
            this.fetchQueueData();
          },
          error: (err) => alert(`State updating failure: ${err.message}`)
        });
      },
      error: (err) => alert(`Hardware binding rejected: ${err.error?.message || err.message}`)
    });
  }

  updateExpiryCountdowns(): void {
    if (!this.filteredJobs) return;
    this.filteredJobs.forEach(job => {
      if (job.status === 'Binned' && job.expiryTime) {
        const remainingMs = new Date(job.expiryTime).getTime() - new Date().getTime();
        if (remainingMs <= 0) {
          job.displayCountdown = 'EXPIRED';
        } else {
          const minutes = Math.floor(remainingMs / 60000);
          const seconds = Math.floor((remainingMs % 60000) / 1000);
          job.displayCountdown = `${minutes}m ${seconds}s`;
        }
      }
    });
  }
}