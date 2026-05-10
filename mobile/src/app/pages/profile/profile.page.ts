import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountBalance: number; // Matches "accountBalance" alias in SQL
}

export interface Transaction {
  transactionId: string;
  amount: number;
  transactionDate: string;
  transactionType: string;
  userId: number;
  jobId: number | null; // Matches "jobId" alias in SQL
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {
  profile: UserProfile | null = null;
  transactions: Transaction[] = [];
  isLoading = true;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    // Force a refresh when the tab becomes active
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    
    // Fetch Profile from /auth/me
    this.api.get<UserProfile>('/auth/me').subscribe({
      next: (res) => {
        // Log to verify exact field names and casing (e.g., accountBalance vs ACCOUNT_BALANCE)
        console.log('Full Profile Response from /auth/me:', res); 
        this.profile = res;
        this.loadTransactions(); 
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Profile fetch error:', err);
        this.showToast('Failed to load profile data', 'danger');
      }
    });
  }

  loadTransactions() {
    this.api.get<Transaction[]>('/transactions').subscribe({
      next: (res) => {
        console.log('Transactions received:', res);
        this.transactions = res;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('Failed to load transactions', 'danger');
      }
    });
  }

  async presentTopUpPrompt() {
    const alert = await this.alertCtrl.create({
      header: 'Top Up Balance',
      message: 'Enter amount in PKR to add to your printing wallet.',
      inputs: [
        {
          name: 'amount',
          type: 'number',
          placeholder: 'e.g. 500',
          min: 1
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Top Up',
          handler: (data) => {
            const amount = parseFloat(data.amount);
            if (amount && amount > 0) {
              this.processTopUp(amount);
              return true;
            } else {
              this.showToast('Please enter a valid amount.', 'warning');
              return false; 
            }
          }
        }
      ]
    });
    await alert.present();
  }

  processTopUp(amount: number) {
    this.api.post<any>('/transactions/topup', { amount }).subscribe({
      next: (res) => {
        this.showToast(`Successfully added PKR ${amount} to balance.`, 'success');
        // This triggers loadData which refreshes both profile balance and transactions
        this.loadData(); 
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Top up failed.', 'danger');
      }
    });
  }

  logout() {
    this.auth.logout();
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}