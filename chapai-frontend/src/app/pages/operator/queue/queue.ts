import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PrintData } from '../../../services/print-data';
import { Router } from '@angular/router';
import { Job, Bin } from '../../../models/dashboard.interface';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';

@Component({
  selector: 'app-operator-queue',
  templateUrl: './queue.html',
  styleUrls: ['./queue.scss'],
  standalone: false
})
export class Queue implements OnInit, OnDestroy {
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  selectedJob: Job | null = null;
  availableBins: Bin[] = [];
  selectedBin: Bin | null = null;

  activeTab: 'All' | 'Pending' | 'Printing' | 'Binned' = 'All';
  isLoadingQueue: boolean = true;
  isActionLoading: boolean = false;
  lastUpdatedTime: string = '--:--:--';

  // Custom Modals
  showDiscardModal: boolean = false;
  showBinAssignmentPanel: boolean = false;
  inlineErrorMessage: string | null = null;

  private pollingIntervalId: any;
  private timerIntervalId: any;

  constructor(
    private printService: PrintData,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.refreshQueue(true);

    this.pollingIntervalId = setInterval(() => {
      this.refreshQueue(false);
    }, 10000);

    this.timerIntervalId = setInterval(() => {
      this.recalculateTimeMatrix();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.pollingIntervalId) clearInterval(this.pollingIntervalId);
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
  }

  triggerDiscardConfirmation(): void {
    if (!this.selectedJob) return;
    this.showDiscardModal = true;
  }

  refreshQueue(triggerSkeleton: boolean): void {
    if (triggerSkeleton) this.isLoadingQueue = true;
    this.inlineErrorMessage = null;

    this.printService.getOperatorQueue().subscribe({
      next: (data: any[]) => {
        const rawList = data || [];

        this.jobs = rawList.map((item: any) => {
          const statusName = item.statusName || 'Pending';
          const pages = item.pageCount !== undefined ? item.pageCount : 0;
          const copiesCount = item.copies !== undefined ? item.copies : 1;

          // Fallback calculation layer (5 PKR per impression)
          const calculatedCost = pages * copiesCount * 5;

          return {
            jobId: item.jobId,
            userFirstName: 'User',
            userLastName: `(#${item.jobId})`,
            userEmail: '',
            statusName: statusName.trim(),
            jobType: item.jobType || 'standard',
            printSide: item.printSide || 'Simplex',
            copies: copiesCount,
            pageCount: pages,
            totalCost: item.totalCost !== undefined ? item.totalCost : calculatedCost,
            collectionSlot: item.collectionSlot,
            expiryTime: item.expiryTime,
            priorityLevel: item.priorityLevel !== undefined ? item.priorityLevel : 1,
            description: item.description || '',
            displayCountdown: '',
            isNearExpiry: false
          } as Job;
        });

        if (this.jobs.length === 0) {
          this.inlineErrorMessage = "Station Notice: No active uncollected jobs linked to this terminal's active pipeline zone.";
        }

        // 💡 Asynchronous scheduling prevents parent frame runtime collision errors
        setTimeout(() => {
          this.applyFilter(this.activeTab);
          this.recalculateTimeMatrix();

          const now = new Date();
          this.lastUpdatedTime = now.toLocaleTimeString('en-US', { hour12: false });

          this.isLoadingQueue = false;

          if (this.selectedJob) {
            const currentId = this.selectedJob.jobId;
            const updated = this.jobs.find(j => j.jobId === currentId);
            this.selectedJob = updated || null;
          }

          this.changeDetectorRef.detectChanges();
        }, 0);
      },
      error: (err) => {
        setTimeout(() => {
          this.isLoadingQueue = false;
          this.inlineErrorMessage = err.error?.message || 'Failed to update background telemetry lines.';
          this.changeDetectorRef.detectChanges();
        }, 0);
      }
    });
  }

  applyFilter(tab: 'All' | 'Pending' | 'Printing' | 'Binned' | string): void {
    this.activeTab = tab as 'All' | 'Pending' | 'Printing' | 'Binned';
    this.showBinAssignmentPanel = false;
    this.selectedBin = null;

    if (this.activeTab === 'All') {
      this.filteredJobs = this.jobs;
    } else {
      this.filteredJobs = this.jobs.filter(j => j.statusName.toLowerCase() === this.activeTab.toLowerCase());
    }
    this.changeDetectorRef.detectChanges();
  }

  selectJob(job: Job): void {
    this.selectedJob = job;
    this.showBinAssignmentPanel = false;
    this.selectedBin = null;
    this.inlineErrorMessage = null;
    this.changeDetectorRef.detectChanges();
  }

  async startPrinting() {
    if (!this.selectedJob) return;

    try {
      this.isActionLoading = true;
      const jobId = this.selectedJob.jobId;

      // Call your backend execution service pipeline
      await this.printService.updateJobStatus(jobId, 'Printing');

      // 💡 THE FIX: Update local UI variables immediately to match backend changes
      this.selectedJob.statusName = 'Printing';

      // Auto shift filter view focus so the card doesn't disappear from sight
      this.activeTab = 'Printing';
      this.applyFilter('Printing');

      // Re-find the updated job reference pointer within the new list collection
      this.selectedJob = this.filteredJobs.find(j => j.jobId === jobId) || null;

    } catch (error) {
      this.inlineErrorMessage = "Could not start production workflow loop.";
    } finally {
      this.isActionLoading = false;
    }
  }

  // Triggered when clicking "Secure Storage Allocation & Bin"
  openBinAssignment() {
    if (!this.selectedJob) return;

    // totalPages = pageCount × copies
    const totalPages = this.selectedJob.pageCount * this.selectedJob.copies;
    this.isActionLoading = true;

    this.printService.getAvailableBins(totalPages).subscribe({
      next: (bins) => {
        this.availableBins = bins;
        this.showBinAssignmentPanel = true;
        this.isActionLoading = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (err) => {
        this.inlineErrorMessage = "Failed to load hardware bin allocations.";
        this.isActionLoading = false;
      }
    });
  }

  // Triggered when confirming "Lock Storage Binding Matrix Now"
  async confirmBinAssignment() {
    if (!this.selectedJob || !this.selectedBin) return;

    const jobId = this.selectedJob.jobId;
    const binId = this.selectedBin.binId;

    try {
      this.isActionLoading = true;

      // Sequence Call 1: Assign Bin Matrix
      await firstValueFrom(this.printService.assignBin(jobId, binId));

      // Sequence Call 2: Advance Queue Pipeline State
      await firstValueFrom(this.printService.updateJobStatus(jobId, 'Binned'));

      // Cleanly clear selection drawer states
      this.showBinAssignmentPanel = false;

      // Update local array data source so state remains correct in UI
      const target = this.jobs.find(j => j.jobId === jobId);
      if (target) {
        target.statusName = 'Binned';
      }

      // Switch active operational context tabs fluidly 
      this.activeTab = 'Binned';
      this.applyFilter('Binned');

      // Keep item focused inside the view window under its updated collection profile
      this.selectedJob = this.filteredJobs.find(j => j.jobId === jobId) || null;

    } catch (error) {
      this.inlineErrorMessage = "Error binding hardware matrix storage states.";
    } finally {
      this.isActionLoading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  selectBin(bin: Bin): void {
    this.selectedBin = bin;
    this.changeDetectorRef.detectChanges();
  }

  async executeDiscard() {
    if (!this.selectedJob) return;

    const jobId = this.selectedJob.jobId;

    try {
      this.isActionLoading = true;

      // 1. Fire sequence status update call to the backend pipeline
      await firstValueFrom(this.printService.updateJobStatus(jobId, 'Discarded'));

      // 2. Hide modal surface overlay window
      this.showDiscardModal = false;

      // 3. Clear selected context state variables fluidly
      this.selectedJob = null;

      // 4. Force global list array index to reload and re-evaluate parameters
      if (typeof this.refreshQueue === 'function') {
        await this.refreshQueue(false);
      } else {
        // Fallback: manually strip item from memory cache arrays if refreshQueue isn't available
        this.jobs = this.jobs.filter(j => j.jobId !== jobId);
        this.applyFilter(this.activeTab);
      }

    } catch (error) {
      this.inlineErrorMessage = "Terminal authorization routine failed to purge the pipeline run.";
    } finally {
      this.isActionLoading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  navigateToHandover(): void {
    if (!this.selectedJob) return;
    this.router.navigate(['/operator/handover'], { queryParams: { jobId: this.selectedJob.jobId } });
  }

  private executePipelineAction(action$: any): void {
    this.isActionLoading = true;
    this.inlineErrorMessage = null;
    action$.subscribe({
      next: () => {
        this.isActionLoading = false;
        this.refreshQueue(false);
      },
      error: (err: any) => this.handleActionError(err)
    });
  }

  private handleActionError(err: any): void {
    this.isActionLoading = false;
    this.inlineErrorMessage = err.error?.message || 'State modification rejected by the hardware controller.';
    this.changeDetectorRef.detectChanges();
  }

  private recalculateTimeMatrix(): void {
    if (!this.jobs || this.jobs.length === 0) return;
    const now = new Date().getTime();
    let stateMutated = false;

    this.jobs.forEach(job => {
      if (job.statusName.toLowerCase() === 'binned' && job.expiryTime) {
        try {
          const expiryMs = new Date(job.expiryTime).getTime();
          if (isNaN(expiryMs)) {
            if (job.displayCountdown !== 'Invalid Date') {
              job.displayCountdown = 'Invalid Date';
              stateMutated = true;
            }
            return;
          }
          const remainingMs = expiryMs - now;
          if (remainingMs <= 0) {
            if (job.displayCountdown !== 'EXPIRED') {
              job.displayCountdown = 'EXPIRED';
              job.isNearExpiry = true;
              stateMutated = true;
            }
          } else {
            const minutes = Math.floor(remainingMs / 60000);
            const seconds = Math.floor((remainingMs % 60000) / 1000);
            const newCountdown = `${minutes}m ${seconds}s`;
            const nearExpiryState = minutes < 30;

            if (job.displayCountdown !== newCountdown || job.isNearExpiry !== nearExpiryState) {
              job.displayCountdown = newCountdown;
              job.isNearExpiry = nearExpiryState;
              stateMutated = true;
            }
          }
        } catch (e) {
          if (job.displayCountdown !== '--:--') {
            job.displayCountdown = '--:--';
            stateMutated = true;
          }
        }
      }
    });

    if (stateMutated) {
      this.changeDetectorRef.detectChanges();
    }
  }
}