import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import * as QRCode from 'qrcode';

interface JobResponse {
  jobId: string;
  qrToken: string;
  estimatedTime: string;
}

@Component({
  selector: 'app-submit',
  templateUrl: './submit.page.html',
  styleUrls: ['./submit.page.scss'],
  standalone: false,
})
export class SubmitPage implements OnInit {
  @ViewChild('qrCanvas') canvas!: ElementRef<HTMLCanvasElement>;
  
  submitForm!: FormGroup;
  selectedFile: File | null = null;
  submittedJob: JobResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private router: Router
  ) {}

  ngOnInit() {
    this.submitForm = this.fb.group({
      jobType: ['normal', Validators.required],
      pageCount: [null, [Validators.required, Validators.min(1)]],
      scheduledTime: [null]
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0] as File;
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.showToast('Please select a valid PDF file.', 'danger');
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
  }

  async onSubmit() {
    if (this.submitForm.invalid || !this.selectedFile) return;

    const loading = await this.loadingCtrl.create({
      message: 'Uploading document...',
    });
    await loading.present();

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('jobType', this.submitForm.value.jobType);
    formData.append('pageCount', this.submitForm.value.pageCount.toString());
    
    if (this.submitForm.value.scheduledTime) {
      formData.append('scheduledTime', this.submitForm.value.scheduledTime);
    }

    this.api.postMultipart<JobResponse>('/jobs', formData).subscribe({
      next: (res: JobResponse) => {
        loading.dismiss();
        this.submittedJob = res;
        // Wait for Angular to render the card before drawing QR
        setTimeout(() => this.generateQRCode(res.qrToken), 100);
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err?.error?.message || 'Failed to submit job.', 'danger');
      }
    });
  }

  generateQRCode(token: string) {
    if (this.canvas && token) {
      QRCode.toCanvas(this.canvas.nativeElement, token, {
        width: 250,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR Gen Error:', error);
      });
    }
  }

  async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  goToJobsList() {
    this.router.navigate(['/tabs/jobs']);
  }

  resetForm() {
    this.submittedJob = null;
    this.selectedFile = null;
    this.submitForm.reset({ jobType: 'normal' });
  }
}