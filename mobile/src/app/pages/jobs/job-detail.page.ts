import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController, AlertController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';
import { Job } from './jobs.page';
import { HttpClient } from '@angular/common/http';
import { jsPDF } from 'jspdf';

export interface JobDetails extends Job {
  pageCount: number;
  copies: number;
  printMode: string;
  printSide: string;
  pricePerPage?: number;
  collectionSlot: string; // ISO string or Date timestamp tracking expiration boundaries
}

@Component({
  selector: 'app-job-detail',
  templateUrl: './job-detail.page.html',
  styleUrls: ['./job-detail.page.scss'],
  standalone: false
})
export class JobDetailPage implements OnInit, OnDestroy {
  jobId!: number;
  job: JobDetails | null = null;
  isLoading = true;
  countdownMap: { [key: number]: string } = {};

  private apiSub!: Subscription;
  private timerInterval: any; // ⏱️ Ticker interval container

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.jobId = parseInt(idParam, 10);
    } else {
      this.showToast('Invalid Job Target ID', 'danger');
      this.goBack();
    }
  }

  ionViewWillEnter() {
    if (this.jobId) {
      this.fetchJobDetails();
      this.startCountdownEngine(); // 🚀 Start checking remaining slot time
    }
  }

  ionViewWillLeave() {
    this.stopCountdownEngine(); // 🛑 Avoid memory leaks when view loses focus
  }

  ngOnDestroy() {
    if (this.apiSub) this.apiSub.unsubscribe();
    this.stopCountdownEngine();
  }

  fetchJobDetails() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.apiSub = this.api.get<JobDetails>(`/jobs/${this.jobId}`).subscribe({
      next: (res: JobDetails) => {
        if (res && res.document) {
          const fileNameWithExt = res.document.split('/').pop() || '';
          const baseName = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.')) || fileNameWithExt;
          res.thumbnailPath = `uploads/thumbnails/${baseName}.jpg`;
        }
        this.job = res;
        this.isLoading = false;

        this.updateCountdown(); // Instant first run calculation assignment
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.showToast('Failed to load tracking specifications', 'danger');
        this.goBack();
      }
    });
  }

  /**
   * ⏱️ Countdown Logic Processing Engine
   */
  startCountdownEngine() {
    this.stopCountdownEngine(); // Clear existing loops
    this.timerInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000); // Recalculate once every second
  }

  stopCountdownEngine() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  updateCountdown() {
    if (!this.job || this.job.statusName !== 'Binned' || !this.job.collectionSlot) {
      return;
    }

    // Adjust target date parsing calculation according to your business logic specifications.
    const targetTime = new Date(this.job.collectionSlot).getTime() + (3 * 60 * 60 * 1000);
    const now = new Date().getTime();
    const difference = targetTime - now;

    if (difference <= 0) {
      this.countdownMap[this.job.jobId] = 'Expired';
      this.job.isExpired = true;
      this.stopCountdownEngine();
      this.cdr.detectChanges();
      return;
    }

    // Convert millisecond differences down to standard formats
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    // Format output matching your exact evaluation layout: "0h 45m"
    this.countdownMap[this.job.jobId] = `${hours}h ${minutes}m ${seconds}s`;
    this.cdr.detectChanges();
  }

  isExpiringSoon(jobId: number): boolean {
    const timeStr = this.countdownMap[jobId];
    if (!timeStr || timeStr === 'Expired') return false;

    // Parses your formatted output string cleanly for urgent theme styling switches
    const hours = parseInt(timeStr.split('h')[0], 10);
    const minutes = parseInt(timeStr.split('m')[0].split('h ')[1], 10);
    return hours === 0 && minutes < 30;
  }

  goToQR() {
    if (!this.jobId) {
      this.showToast('Invalid job identifier target reference', 'danger');
      return;
    }

    // 🚀 Push the view directly onto the navigation stack
    this.navCtrl.navigateForward(`/tabs/jobs/qr/${this.jobId}`);
  }

  async cancelJob() {
    const alert = await this.alertCtrl.create({
      header: 'Cancel Print Job',
      message: 'Are you sure you want to discard this printing transaction?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Yes, Cancel',
          role: 'destructive',
          handler: () => {
            this.api.delete(`/jobs/${this.jobId}`).subscribe({
              next: () => {
                this.showToast('Job cancelled successfully', 'success');
                this.fetchJobDetails();
              },
              error: () => this.showToast('Unable to cancel transaction', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async openReprintModal() {
    const alert = await this.alertCtrl.create({
      header: 'Schedule Reprint',
      message: 'Please provide a collection slot timestamp reservation:',
      inputs: [
        {
          name: 'collectionSlot',
          type: 'datetime-local',
          min: new Date().toISOString().substring(0, 16)
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Submit Request',
          handler: (data) => {
            if (!data.collectionSlot) {
              this.showToast('Collection slot is required', 'warning');
              return false;
            }

            this.api.post(`/jobs/${this.jobId}/reprint`, { collectionSlot: data.collectionSlot }).subscribe({
              next: () => {
                this.showToast('Reprint duplicate queued successfully!', 'success');
                this.navCtrl.navigateRoot('/tabs/jobs');
              },
              error: (err) => this.showToast(err.error?.message || 'Reprint request rejected', 'danger')
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  getStatusColor(status: string | undefined): string {
    if (!status) return 'medium';
    switch (status) {
      case 'Binned': case 'Ready': return 'success';
      case 'Printing': return 'primary';
      case 'Pending': return 'warning';
      case 'Discarded': return 'danger';
      default: return 'medium';
    }
  }

  goBack() {
    this.navCtrl.navigateBack('/tabs/jobs');
  }

  async downloadInvoice() {
    if (!this.jobId) return;

    const loadingToast = await this.toastCtrl.create({
      message: 'Generating invoice PDF...',
      position: 'bottom',
      color: 'dark'
    });
    await loadingToast.present();

    // 1. Get the JSON response from your custom invoice data endpoint
    const invoiceUrl = `http://localhost:3000/jobs/${this.jobId}/invoice`;

    this.http.get<any>(invoiceUrl).subscribe({
      next: (data) => {
        loadingToast.dismiss();

        try {
          // 2. Initialize jsPDF canvas standard page configuration (A4 size, points units)
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
          });

          // --- Style Variables ---
          const primaryColor = '#1e3d59';
          const textColor = '#333333';
          const lightGray = '#f5f7fa';

          // --- Header / Brand Banner ---
          doc.setFillColor(30, 61, 89); // Deep Slate Blue
          doc.rect(0, 0, 595, 80, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(22);
          doc.text('CAMPUS PRINT MANAGEMENT SYSTEM', 40, 46);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text('Official Print Job Receipt / Statement', 40, 62);

          // --- Invoice Meta Information Box ---
          doc.setTextColor(textColor);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('INVOICE TO:', 40, 130);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(`Name: ${data.userFirstName} ${data.userLastName}`, 40, 148);
          doc.text(`Email: ${data.userEmail}`, 40, 162);

          // Right Aligned Invoice Identifiers
          doc.setFont('helvetica', 'bold');
          doc.text(`Invoice ID:`, 400, 130);
          doc.text(`Transaction ID:`, 400, 144);
          doc.text(`Date Issued:`, 400, 158);

          doc.setFont('helvetica', 'normal');
          doc.text(data.invoiceId || `INV-${data.jobId}`, 480, 130);
          doc.text(String(data.transactionId), 480, 144);
          doc.text(new Date(data.transactionDate).toLocaleDateString(), 480, 158);

          // Divider Line
          doc.setDrawColor(220, 224, 230);
          doc.line(40, 185, 555, 185);

          // --- Job Configuration Details (Table Area) ---
          doc.setFillColor(245, 247, 250);
          doc.rect(40, 205, 515, 24, 'F'); // Table Header Accent bar

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('Item Description', 50, 220);
          doc.text('Specs', 260, 220);
          doc.text('Qty', 410, 220);
          doc.text('Rate', 460, 220);
          doc.text('Total (PKR)', 500, 220);

          // Table Rows Layout Data Insertion
          doc.setFont('helvetica', 'normal');

          // Row 1: Document Filename (Truncated safely if too long)
          const rawDocName = data.document.split('/').pop() || 'Document';
          const cleanDocName = rawDocName.length > 30 ? rawDocName.substring(0, 27) + '...' : rawDocName;
          doc.text(cleanDocName, 50, 250);
          doc.text(`${data.printMode.toUpperCase()} | ${data.printSide.toUpperCase()}`, 260, 250);
          doc.text(`${data.totalPages} pgs`, 410, 250);
          doc.text(`${data.pricePerPage.toFixed(2)}`, 460, 250);
          doc.text(`${data.totalCost.toFixed(2)}`, 500, 250);

          // Row 2: Print Service Configuration Type
          doc.text(`Job Processing Type: ${data.jobType.toUpperCase()}`, 50, 270);

          doc.setDrawColor(240, 240, 240);
          doc.line(40, 290, 555, 290);

          // --- Accounting Totals Panel ---
          let summaryTopY = 320;
          doc.setFont('helvetica', 'bold');
          doc.text('Summary Statement Details', 40, summaryTopY);

          doc.setFont('helvetica', 'normal');
          doc.text('Subtotal amount:', 380, summaryTopY + 20);
          doc.text(`${data.totalCost.toFixed(2)} PKR`, 500, summaryTopY + 20);

          doc.text('Tax / CGST Fees:', 380, summaryTopY + 35);
          doc.text('0.00 PKR', 500, summaryTopY + 35);

          // Grand Total Accent Highlight Bar
          doc.setFillColor(235, 245, 235);
          doc.rect(370, summaryTopY + 48, 185, 24, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 90, 30);
          doc.text('Total Paid:', 380, summaryTopY + 64);
          doc.text(`${data.totalCost.toFixed(2)} PKR`, 500, summaryTopY + 64);

          // Balance Context Note
          doc.setTextColor(textColor);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.text(`Remaining Wallet Balance (Post-Debit): ${data.balanceAfter.toFixed(2)} PKR`, 368, summaryTopY + 90);

          // --- Timeline / Lifecycle Tracking Footer ---
          let timelineY = 470;
          doc.setDrawColor(220, 224, 230);
          doc.line(40, timelineY, 555, timelineY);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('System Event Logs Lifecycle Verification:', 40, timelineY + 20);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(`• Document Upload Timestamp: ${new Date(data.submissionTime).toLocaleString()}`, 45, timelineY + 40);
          doc.text(`• Hardware Terminal Printing Core Close: ${new Date(data.completionTime).toLocaleString()}`, 45, timelineY + 55);
          doc.text(`• Physical Kiosk Bin Collection Handshake: ${new Date(data.collectionSlot).toLocaleString()}`, 45, timelineY + 70);

          // Formal Thank You Footer Note
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(primaryColor);
          doc.text('Thank you for utilizing the Smart Campus Printing Kiosks!', 150, timelineY + 110);

          // 3. Save / Download Document Stream
          doc.save(`Invoice-${data.invoiceId}.pdf`);
          this.showToast('Invoice generated and downloaded!', 'success');

        } catch (pdfError) {
          console.error('jsPDF generation structure crash:', pdfError);
          this.showToast('Failed to assemble PDF formatting locally.', 'danger');
        }
      },
      error: (err) => {
        loadingToast.dismiss();
        console.error('Invoice API Endpoint error:', err);
        this.showToast('Could not retrieve invoice transaction logs data.', 'danger');
      }
    });
  }

  async showToast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 2500, position: 'bottom' });
    t.present();
  }
}