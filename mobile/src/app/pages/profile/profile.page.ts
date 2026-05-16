import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  ActionSheetController,
  AlertController,
  ModalController,
  ToastController,
  NavController
} from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Student' | 'Faculty';
  accountBalance: number;
  profilePicture: string;
}

export interface Transaction {
  transactionId: string;
  amount: number;
  transactionDate: string;
  transactionType: 'deduction' | 'topup' | 'refund';
  jobId: string | null;
  balanceAfter: number;
}

export interface UserSummary {
  totalJobs: number;
  totalSpend: number;
  currentBalance: number;
  totalPages: number;
  pagesSavedByDuplex: number;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  // State Management
  profile: UserProfile | null = null;
  summary: UserSummary | null = null;
  transactions: Transaction[] = [];
  public baseUrl = environment.apiUrl;

  isLoading = true;
  isEditingName = false;
  showAllTransactions = false;

  // Inline Name Edit Fields
  editFirstName = '';
  editLastName = '';

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit(): void {
    this.loadAllData();
  }

  /**
   * Fetches data across all profile endpoints simultaneously
   */
  loadAllData(event?: CustomEvent): void {
    if (!event) this.isLoading = true;

    forkJoin({
      profile: this.api.get<UserProfile>('/auth/me'),
      summary: this.api.get<UserSummary>('/reports/my-summary'),
      transactions: this.api.get<Transaction[]>('/transactions')
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          if (event) {
            (event.target as HTMLIonRefresherElement).complete();
          }
        })
      )
      .subscribe({
        next: (res) => {
          this.profile = res.profile;
          this.summary = res.summary;
          this.transactions = res.transactions;

          // Populate local edit models
          this.editFirstName = res.profile.firstName;
          this.editLastName = res.profile.lastName;
        },
        error: () => this.showToast('Failed to load profile details.', 'danger')
      });
  }

  get visibleTransactions(): Transaction[] {
    return this.showAllTransactions ? this.transactions : this.transactions.slice(0, 5);
  }

  get userInitials(): string {
    if (!this.profile) return '';
    return `${this.profile.firstName.charAt(0)}${this.profile.lastName.charAt(0)}`.toUpperCase();
  }

  /**
   * SECTION 1: Profile Avatar Action Sheet & Inline Editing
   */
  async openAvatarActions(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Profile Picture',
      buttons: [
        {
          text: 'Take Photo (Coming Soon)',
          role: 'destructive',
          icon: 'camera-outline',
          handler: () => {
            this.showToast('Camera functionality is coming soon!', 'warning');
          }
        },
        {
          text: 'Choose from Gallery',
          icon: 'images-outline',
          handler: () => {
            this.fileInput.nativeElement.click();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close-outline'
        }
      ]
    });
    await actionSheet.present();
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      const formData = new FormData();
      
      // 🌟 FIXED: Changed key from 'profile-picture' to 'file' to match NestJS FileInterceptor('file')
      formData.append('file', file);

      this.isLoading = true;
      this.api.post<UserProfile>('/auth/profile-picture', formData)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (updatedProfile) => {
            if (this.profile) {
              // 🌟 FIXED: Map parameter values directly from the database response object payload
              this.profile.profilePicture = updatedProfile.profilePicture;
            }
            this.showToast('Profile picture updated successfully.', 'success');
          },
          error: () => this.showToast('Failed to upload image.', 'danger')
        });
    }
  }

  toggleEditMode(): void {
    if (this.profile) {
      this.editFirstName = this.profile.firstName;
      this.editLastName = this.profile.lastName;
    }
    this.isEditingName = !this.isEditingName;
  }

  saveProfileName(): void {
    if (!this.editFirstName.trim() || !this.editLastName.trim()) {
      this.showToast('Names cannot be empty.', 'warning');
      return;
    }

    this.isLoading = true;
    const payload = { firstName: this.editFirstName, lastName: this.editLastName };

    this.api.patch<UserProfile>('/auth/me', payload)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (updatedProfile) => {
          if (this.profile) {
            this.profile.firstName = updatedProfile.firstName;
            this.profile.lastName = updatedProfile.lastName;
          }
          this.isEditingName = false;
          this.showToast('Profile name updated.', 'success');
        },
        error: () => this.showToast('Failed to save changes.', 'danger')
      });
  }

  /**
   * SECTION 3: Account Balance Top-Up Call
   */
  async openTopUpAlert(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Top Up Balance',
      message: 'Enter the amount in PKR you would like to add to your printing purse.',
      inputs: [
        {
          name: 'amount',
          type: 'number',
          placeholder: 'Amount (PKR)',
          min: 10,
          max: 5000
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm',
          handler: (data: { amount: string }) => {
            const numAmount = parseFloat(data.amount);
            if (isNaN(numAmount) || numAmount <= 0) {
              this.showToast('Please enter a valid amount.', 'warning');
              return false;
            }
            this.executeTopUp(numAmount);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private executeTopUp(amount: number): void {
    this.isLoading = true;
    this.api.post<{ currentBalance: number }>('/transactions/topup', { amount })
      .subscribe({
        next: (res) => {
          if (this.profile) this.profile.accountBalance = res.currentBalance;
          if (this.summary) this.summary.currentBalance = res.currentBalance;
          this.showToast(`Successfully credited PKR ${amount} to your account.`, 'success');
          // Refresh list to show topup transaction line
          this.api.get<Transaction[]>('/transactions').subscribe(txs => this.transactions = txs);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.showToast('Top up transaction aborted.', 'danger');
        }
      });
  }

  /**
   * SECTION 4: View Transaction Detail Modal Flow Context
   */
  async openTransactionModal(tx: Transaction): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TransactionDetailModalComponent,
      componentProps: { transaction: tx }
    });
    await modal.present();
  }

  /**
   * SECTION 5: Account Structural Options Actions
   */
  async openChangePasswordModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ChangePasswordModalComponent
    });
    await modal.present();
  }

  async confirmDeleteAccount(): Promise<void> {
    const firstAlert = await this.alertCtrl.create({
      header: 'Are you sure?',
      message: 'Do you really want to delete your account? This step cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Next',
          handler: () => {
            this.presentDeleteConfirmationInput();
          }
        }
      ]
    });
    await firstAlert.present();
  }

  async presentDeleteConfirmationInput(): Promise<void> {
    const secondAlert = await this.alertCtrl.create({
      header: 'Confirm Destruction',
      message: 'This will permanently delete all your data including jobs and transactions. Type "DELETE" to confirm.',
      inputs: [
        {
          name: 'confirmText',
          type: 'text',
          placeholder: 'Type DELETE'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete Permanently',
          role: 'destructive',
          handler: (data: { confirmText: string }) => {
            if (data.confirmText !== 'DELETE') {
              this.showToast('Verification keyword mismatch. Account deletion canceled.', 'warning');
              return false;
            }
            this.executeDeleteAccount();
            return true;
          }
        }
      ]
    });
    await secondAlert.present();
  }

  private executeDeleteAccount(): void {
    this.isLoading = true;
    this.api.delete('/auth/me').subscribe({
      next: () => {
        this.isLoading = false;
        this.showToast('Your account has been deleted permanently.', 'medium');
        this.authService.logout();
        this.navCtrl.navigateRoot('/login');
      },
      error: () => {
        this.isLoading = false;
        this.showToast('Failed to delete account. Please try again.', 'danger');
      }
    });
  }

  async confirmLogout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Logout',
      message: 'Are you sure you want to log out of Chapai?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Logout',
          role: 'destructive',
          handler: () => {
            this.authService.logout();
            this.navCtrl.navigateRoot('/login');
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Core Helper Notification Context Toast Generation Engine
   */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}

/**
 * ------------------------------------------------------------------------------------
 * INTERNAL UTILITY CHILD COMPONENTS (Declared globally or in same module sandbox)
 * ------------------------------------------------------------------------------------
 */

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Transaction Details</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list lines="inset">
        <ion-item>
          <ion-label>
            <h3>Transaction ID</h3>
            <p>{{ transaction.transactionId }}</p>
          </ion-label>
        </ion-item>
        <ion-item *ngIf="transaction.jobId" button (click)="navigateToJob(transaction.jobId)">
          <ion-label>
            <h3>Related Job ID</h3>
            <p style="color: #00B4D8; font-weight: 600;">#{{ transaction.jobId }} (Tap to view)</p>
          </ion-label>
          <ion-icon name="chevron-forward-outline" slot="end" color="primary"></ion-icon>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>Timestamp</h3>
            <p>{{ transaction.transactionDate | date:'medium' }}</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>Type</h3>
            <p style="text-transform: capitalize;">{{ transaction.transactionType }}</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>Amount</h3>
            <p [style.color]="transaction.transactionType === 'deduction' ? '#FF3B30' : '#34C759'" style="font-weight: 700;">
              {{ transaction.transactionType === 'deduction' ? '-' : '+' }} PKR {{ transaction.amount }}
            </p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h3>Post-Transaction Balance</h3>
            <p>PKR {{ transaction.balanceAfter }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  standalone: false
})
export class TransactionDetailModalComponent {
  transaction!: Transaction;
  constructor(private modalCtrl: ModalController, private navCtrl: NavController) { }
  dismiss() { this.modalCtrl.dismiss(); }
  navigateToJob(jobId: string | null) {
    if (!jobId) return;
    this.dismiss();
    this.navCtrl.navigateForward(`/tabs/jobs/detail/${jobId}`);
  }
}

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Change Password</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Cancel</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <ion-item fill="outline" mode="md" style="--border-radius: 12px;">
          <ion-label position="floating">Current Password</ion-label>
          <ion-input type="password" [(ngModel)]="currentPassword"></ion-input>
        </ion-item>
        <ion-item fill="outline" mode="md" style="--border-radius: 12px;">
          <ion-label position="floating">New Password</ion-label>
          <ion-input type="password" [(ngModel)]="newPassword"></ion-input>
        </ion-item>
        <ion-item fill="outline" mode="md" style="--border-radius: 12px;">
          <ion-label position="floating">Confirm New Password</ion-label>
          <ion-input type="password" [(ngModel)]="confirmPassword"></ion-input>
        </ion-item>
        <ion-button expand="block" (click)="submit()" mode="ios" style="--background: #00B4D8; margin-top: 16px; height: 50px;">
          Update Password
        </ion-button>
      </div>
    </ion-content>
  `,
  standalone: false
})
export class ChangePasswordModalComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor(
    private modalCtrl: ModalController,
    private api: ApiService,
    private toastCtrl: ToastController
  ) { }

  dismiss() { this.modalCtrl.dismiss(); }

  submit() {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.presentToast('All input fields are explicitly required.', 'warning');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.presentToast('New password inputs do not match.', 'danger');
      return;
    }

    this.api.patch('/auth/password', { currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.presentToast('Password modified successfully.', 'success');
        this.dismiss();
      },
      error: () => this.presentToast('Invalid current credential mapping.', 'danger')
    });
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const t = await this.toastCtrl.create({ message, duration: 3000, color });
    await t.present();
  }
}