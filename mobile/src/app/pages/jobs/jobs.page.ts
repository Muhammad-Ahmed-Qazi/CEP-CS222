import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';

export interface SummaryMetrics {
  totalJobs: number;
  totalPages: number;
  pagesSavedByDuplex: number;
  totalSpend: number;
  jobsByStatus: {
    pending: number;
    printing: number;
    binned: number;
    collected: number;
    discarded: number;
    cancelled: number;
  };
}

export interface Job {
  jobId: number;
  document: string;
  description?: string;
  statusName: string; // 'Pending' | 'Printing' | 'Binned' | 'Collected' | 'Discarded' | 'Cancelled'
  jobType: string;
  submissionTime: string; // ISO string from backend
  collectionSlot: string;
  totalCost: number;
  isExpired?: boolean;
  thumbnailPath?: string;
  expiryTime?: string | Date;
}

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountBalance: number;
}

@Component({
  selector: 'app-jobs',
  templateUrl: './jobs.page.html',
  styleUrls: ['./jobs.page.scss'],
  standalone: false
})
export class JobsPage implements OnInit, OnDestroy {
  summary: SummaryMetrics | null = null;
  jobs: Job[] = [];
  currentBalance: number = 0;

  activeTab: 'active' | 'history' = 'active';
  searchQuery: string = '';
  statusFilter: string = 'All';

  isLoading = true;
  private apiSubs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() { }

  ionViewWillEnter() {
    this.loadData();
  }

  ngOnDestroy() {
    this.clearSubscriptions();
  }

  private clearSubscriptions() {
    this.apiSubs.forEach(sub => sub.unsubscribe());
    this.apiSubs = [];
  }

  async loadData(event?: any) {
    this.clearSubscriptions();

    // 1. Sync dashboard metrics layout (matching backend response adjustments)
    const summarySub = this.api.get<SummaryMetrics>('/reports/my-summary').subscribe({
      next: (res) => this.summary = res,
      error: () => console.warn('Could not update summary metrics data.')
    });

    // 2. Fetch student user profile for instant balance mapping
    const balanceSub = this.api.get<UserProfile>('/auth/me').subscribe({
      next: (res) => { this.currentBalance = res.accountBalance || 0; },
      error: () => console.warn('Could not sync balance on jobs module.')
    });

    // 3. Process the comprehensive print queue execution payload
    const jobsSub = this.api.get<Job[]>('/jobs').subscribe({
      next: (res: Job[]) => {
        this.jobs = res.map(job => {
          // Dynamic asset thumbnail mapping path parsing
          if (job.document) {
            const fileNameWithExt = job.document.split('/').pop() || '';
            const baseName = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.')) || fileNameWithExt;
            job.thumbnailPath = `uploads/thumbnails/${baseName}.jpg`;
          } else {
            job.thumbnailPath = undefined;
          }

          // Compute static expiry status flag using the database setup constraints
          const rawValue = (job as any).expiryTime || (job as any).expirytime || (job as any).expiry_time;
          if (rawValue) {
            const parsedExpiry = new Date(new Date(rawValue).getTime() + (2 * 60 * 60 * 1000));
            job.isExpired = parsedExpiry.getTime() - new Date().getTime() <= 0;
          }

          return job;
        });

        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: (err) => {
        this.isLoading = false;
        if (event) event.target.complete();
        this.showToast('Failed to load jobs list', 'danger');
      }
    });

    this.apiSubs.push(summarySub, balanceSub, jobsSub);
  }

  // Dynamic dropdown filtering options sync
  get availableStatuses(): string[] {
    if (this.activeTab === 'active') {
      return ['Pending', 'Printing', 'Binned'];
    } else {
      return ['Collected', 'Discarded', 'Cancelled'];
    }
  }

  segmentChanged(event: any): void {
    this.activeTab = event.detail.value;
    this.statusFilter = 'All';
  }

  get filteredJobs() {
    return this.jobs.filter(job => {
      // Direct transactional sorting partitions matching operational states
      const isActiveState = ['Pending', 'Printing', 'Binned'].includes(job.statusName);
      if (this.activeTab === 'active' && !isActiveState) return false;
      if (this.activeTab === 'history' && isActiveState) return false;

      // Text query search block bounds check
      const matchesSearch = (job.description || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (job.document || '').toLowerCase().includes(this.searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Dropdown selector constraint
      if (this.statusFilter !== 'All' && job.statusName !== this.statusFilter) return false;

      return true;
    });
  }

  // Explicit color tokens for the full set of structural states
  getStatusColor(status: string): string {
    switch (status) {
      case 'Binned': return 'success';       // Printed, stored securely in weak-entity bin
      case 'Collected': return 'tertiary';    // Safely picked up via secure QR handshake
      case 'Printing': return 'primary';     // Currently on the production printer roll
      case 'Pending': return 'warning';      // Stored in admin queue sequence
      case 'Discarded': return 'danger';     // Uncollected time-limit purge
      case 'Cancelled': return 'danger';     // Instantly stopped and wallet-refunded
      default: return 'medium';
    }
  }

  goToProfile() { this.navCtrl.navigateForward('/tabs/profile'); }
  goToDetail(id: number) { this.navCtrl.navigateForward(`/tabs/jobs/detail/${id}`); }

  async showToast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 2500 });
    t.present();
  }
}