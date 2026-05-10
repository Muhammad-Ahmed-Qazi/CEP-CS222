import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import * as QRCode from 'qrcode';

export interface PrintJob {
  JOB_ID: number;
  DOCUMENT: string;
  SUBMISSION_TIME: string;
  COMPLETION_TIME: string | null;
  PAGE_COUNT: number;
  QR_SECURE_TOKEN: string;
  PRIORITY_LEVEL: number;
  JOB_TYPE: string;
  SCHEDULED_TIME: string | null;
  STATUS_NAME: 'Pending' | 'Printing' | 'Binned' | 'Collected' | 'Discarded';
}

@Component({
  selector: 'app-jobs',
  templateUrl: './jobs.page.html',
  styleUrls: ['./jobs.page.scss'],
  standalone: false,
})
export class JobsPage implements OnInit {
  @ViewChild('qrCanvas') canvas!: ElementRef<HTMLCanvasElement>;

  jobs: PrintJob[] = [];
  isLoading = true;
  
  isModalOpen = false;
  selectedJob: PrintJob | null = null;

  constructor(
    private api: ApiService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadJobs();
  }

  // Refreshes the data when returning to this tab
  ionViewWillEnter() {
    this.loadJobs();
  }

  loadJobs(event?: any) {
    this.api.get<PrintJob[]>('/jobs').subscribe({
      next: (res) => {
        this.jobs = res;
        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: (err) => {
        this.isLoading = false;
        if (event) event.target.complete();
        this.showToast(err?.error?.message || 'Failed to load jobs.', 'danger');
      }
    });
  }

  doRefresh(event: any) {
    this.loadJobs(event);
  }

  openJobDetail(job: PrintJob) {
    this.selectedJob = job;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedJob = null;
  }

  // Triggered by the (didPresent) event on the ion-modal
  renderQR() {
    if (this.selectedJob && this.selectedJob.STATUS_NAME === 'Pending' && this.canvas) {
      QRCode.toCanvas(this.canvas.nativeElement, this.selectedJob.QR_SECURE_TOKEN, {
        width: 250,
        margin: 2
      }, (error) => {
        if (error) console.error('QR Generation Error:', error);
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Printing': return 'primary';
      case 'Binned': return 'success';
      case 'Collected': return 'medium';
      case 'Discarded': return 'danger';
      default: return 'medium';
    }
  }

  async showToast(message: string, color: 'danger' | 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}