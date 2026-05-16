import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastController, LoadingController, AlertController, NavController } from '@ionic/angular';
import * as pdfjsLib from 'pdfjs-dist';

// Define the profile interface to match your working profile.page.ts
export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountBalance: number;
}

@Component({
  selector: 'app-submit',
  templateUrl: './submit.page.html',
  styleUrls: ['./submit.page.scss'],
  standalone: false
})
export class SubmitPage implements OnInit {
  selectedFile: File | null = null;
  thumbnail: string | null = null;
  description: string = '';
  printMode: 'bw' | 'color' = 'bw';
  printSide: 'single' | 'double' = 'single';
  copies: number = 1;
  docPages: number = 0;

  today: string = '';
  maxDate: string = '';
  collectionSlot: string = '';
  currentBalance: number = 0;
  thumbnailBlob: Blob | null = null;  // New property for holding binary form upload data

  constructor(
    private api: ApiService,
    private toast: ToastController,
    private loading: LoadingController,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private cdr: ChangeDetectorRef
  ) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
  }

  ngOnInit() {
    this.initDateConstraints();
  }

  ionViewWillEnter() {
    // This ensures balance is updated if you topped up on the profile tab
    this.fetchUserBalance();
  }

  async fetchUserBalance() {
    // FIX 1: Use /auth/me instead of /reports/my-summary
    this.api.get<UserProfile>('/auth/me').subscribe({
      next: (res) => {
        // FIX 2: Use accountBalance to match your working profile logic
        this.currentBalance = res.accountBalance || 0;
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Could not sync balance', 'danger')
    });
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      this.showToast('Please select a valid PDF file', 'danger');
      return;
    }
    this.selectedFile = file;
    this.docPages = 0;
    this.generateThumbnail(file);
  }

  async generateThumbnail(file: File) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = (pdfjsLib as any).getDocument({
        data: arrayBuffer,
        useWorkerFetch: false
      });

      const pdf = await loadingTask.promise;
      this.docPages = pdf.numPages;
      this.cdr.detectChanges();

      if (this.docPages > 0) {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          }).promise;

          // Keep for UI preview binding
          this.thumbnail = canvas.toDataURL('image/jpeg', 0.8);

          // Convert the Canvas to a binary Blob and store it in state for the API upload
          canvas.toBlob((blob) => {
            if (blob) {
              this.thumbnailBlob = blob;
            }
          }, 'image/jpeg', 0.8);

          this.cdr.detectChanges();
        }
      }
    } catch (err) {
      console.error('PDF Detection Error:', err);
      this.showToast('Error detecting pages', 'danger');
    }
  }

  // --- Calculations ---
  get totalPages(): number { return this.docPages * this.copies; }
  get isBulk(): boolean { return this.totalPages >= 15; }
  get pricePerPage(): number {
    if (this.isBulk) return 5;
    let price = 7;
    price += (this.printSide === 'double' ? -1 : 1);
    return Math.max(1, price);
  }
  get totalCost(): number { return this.totalPages * this.pricePerPage; }

  // --- Submission ---
  async submitJob() {
    if (!this.selectedFile || this.docPages === 0) {
      this.showToast('Processing file...', 'warning');
      return;
    }
    if (this.totalCost > this.currentBalance) {
      this.showToast('Insufficient balance', 'danger');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Confirm Order',
      mode: 'ios',
      subHeader: `${this.totalPages} Total Pages`,
      message: `Total Cost: PKR ${this.totalCost.toFixed(0)}`,
      buttons: [
        { text: 'Edit', role: 'cancel' },
        { text: 'Submit', handler: () => this.executeSubmit() }
      ]
    });
    await alert.present();
  }

  private async executeSubmit() {
    if (!this.selectedFile || this.docPages === 0) {
      this.showToast('Processing file...', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Uploading...', spinner: 'crescent' });
    await loader.present();

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('description', this.description || '');
    formData.append('copies', this.copies.toString());
    formData.append('printMode', this.printMode);
    formData.append('printSide', this.printSide);
    formData.append('jobType', this.isBulk ? 'bulk' : 'normal');

    const localDate = new Date(this.collectionSlot);
    formData.append('collectionSlot', localDate.toISOString());
    formData.append('pageCount', this.docPages.toString());

    // Dynamic naming extraction for the Thumbnail image matching your PDF target filename
    if (this.thumbnailBlob) {
      const originalName = this.selectedFile.name;
      const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
      const thumbnailFileName = `${baseName}.jpg`;

      // Append the blob with the specific name required by your system
      formData.append('thumbnail', this.thumbnailBlob, thumbnailFileName);
    }

    this.api.postMultipart('/jobs', formData).subscribe({
      next: (res: any) => {
        loader.dismiss();
        this.showToast('Print job submitted successfully!', 'success');

        // 1. Reset the entire form state for the next submission
        this.selectedFile = null;
        this.thumbnail = null;
        this.thumbnailBlob = null;
        this.description = '';
        this.printMode = 'bw';
        this.printSide = 'single';
        this.copies = 1;
        this.docPages = 0;
        this.initDateConstraints(); // Resets collection slots to default time loops

        // 2. Redirect cleanly to the structural jobs tab root without trailing slashes
        this.navCtrl.navigateRoot('/tabs/jobs');
      },
      error: (err) => {
        loader.dismiss();
        this.showToast(err?.error?.message || 'Upload failed', 'danger');
      }
    });
  }

  private initDateConstraints() {
    const now = new Date();

    // Shift "now" by the local timezone offset so toISOString() 
    // gives us the local time instead of UTC
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);

    this.today = localISOTime;
    this.collectionSlot = localISOTime;

    // Set Max Date to 2 days from now (or keep it as tomorrow)
    const max = new Date(now.getTime() + (24 * 60 * 60 * 1000) - tzOffset);
    this.maxDate = max.toISOString().slice(0, 16);
  }

  async showToast(msg: string, color: string = 'primary') {
    const t = await this.toast.create({ message: msg, duration: 2500, color, position: 'bottom' });
    t.present();
  }
}