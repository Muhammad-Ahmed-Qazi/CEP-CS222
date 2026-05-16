import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';

export interface SummaryMetrics {
  totalJobs: number;
  totalSpend: number;
  currentBalance: number;
  totalPages: number;
  pagesSavedByDuplex: number;
}

export interface Job {
  jobId: number;
  document: string;
  description?: string;
  statusName: string; // 'Pending' | 'Printing' | 'Binned' | 'Collected' | 'Discarded'
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

  ngOnInit() {}

  ionViewWillEnter() {
    this.loadData();
  }

  ngOnDestroy() {
    this.apiSubs.forEach(sub => sub.unsubscribe());
  }

  async loadData(event?: any) {
    this.apiSubs.forEach(sub => sub.unsubscribe());
    this.apiSubs = [];

    const summarySub = this.api.get<SummaryMetrics>('/reports/my-summary').subscribe({
      next: (res) => this.summary = res,
      error: () => console.warn('Could not update summary metrics data.')
    });

    const balanceSub = this.api.get<UserProfile>('/auth/me').subscribe({
      next: (res) => { this.currentBalance = res.accountBalance || 0; },
      error: () => console.warn('Could not sync balance on jobs module.')
    });

    const jobsSub = this.api.get<Job[]>('/jobs').subscribe({
      next: (res: Job[]) => {
        this.jobs = res.map(job => {
          if (job.document) {
            const fileNameWithExt = job.document.split('/').pop() || '';
            const baseName = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.')) || fileNameWithExt;
            job.thumbnailPath = `uploads/thumbnails/${baseName}.jpg`;
          } else {
            job.thumbnailPath = undefined;
          }
          // job.submissionTime = new Date(job.submissionTime).toLocaleString();
          // Compute static expiry status flag using the database configuration
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

  // 🌟 FIX: Updated dropdown options to map directly to your DB fields
  get availableStatuses(): string[] {
    if (this.activeTab === 'active') {
      return ['Pending', 'Printing', 'Binned'];
    } else {
      return ['Collected', 'Discarded'];
    }
  }

  onTabChange() {
    this.statusFilter = 'All';
  }

  get filteredJobs() {
    return this.jobs.filter(job => {
      // 🌟 FIX: Map to active statuses based on your DB rules ('Binned' means active/waiting collection)
      const isActiveTab = ['Pending', 'Printing', 'Binned'].includes(job.statusName);
      if (this.activeTab === 'active' && !isActiveTab) return false;
      if (this.activeTab === 'history' && isActiveTab) return false;

      const matchesSearch = (job.description || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (job.document || '').toLowerCase().includes(this.searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (this.statusFilter !== 'All' && job.statusName !== this.statusFilter) return false;

      return true;
    });
  }

  // 🌟 FIX: Colors explicitly set for your database status structural types
  getStatusColor(status: string): string {
    switch (status) {
      case 'Binned': return 'success';       // Ready for collection
      case 'Collected': return 'tertiary';   // Picked up successfully
      case 'Printing': return 'primary';     // In progress
      case 'Pending': return 'warning';      // Queued
      case 'Discarded': return 'danger';     // Expired / Missed
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