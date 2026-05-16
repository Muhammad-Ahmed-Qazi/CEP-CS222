import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, NavController, ToastController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../profile/profile.page';
import { Notification } from '../../models/notification.model';

@Component({
  selector: 'app-more',
  templateUrl: './more.page.html',
  styleUrls: ['./more.page.scss'],
  standalone: false
})
export class MorePage implements OnInit {
  profile: UserProfile | null = null;
  unreadCount = 0;
  public baseUrl = environment.apiUrl;

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) { }

  ngOnInit(): void { }

  ionViewWillEnter(): void {
    this.fetchLocalContextData();
  }

  fetchLocalContextData(): void {
    // Collect user information and count notifications context
    this.api.get<UserProfile>('/auth/me').subscribe({
      next: (profileData) => this.profile = profileData
    });

    this.api.get<Notification[]>('/notifications').subscribe({
      next: (notifications) => {
        this.unreadCount = notifications.filter(n => !n.isRead).length;
      }
    });
  }

  get userInitials(): string {
    if (!this.profile) return '';
    return `${this.profile.firstName.charAt(0)}${this.profile.lastName.charAt(0)}`.toUpperCase();
  }

  navigateToProfile(): void { this.navCtrl.navigateForward('/tabs/profile'); }
  navigateToNotifications(): void { this.navCtrl.navigateForward('/notifications'); }

  async triggerHelpToast(): Promise<void> {
    const t = await this.toastCtrl.create({
      message: 'Help & Support platform channels are coming soon!',
      duration: 2000,
      color: 'warning'
    });
    await t.present();
  }

  async openAboutModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AboutAppModalComponent
    });
    await modal.present();
  }

  async triggerLogoutAlert(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Logout',
      message: 'Are you sure you want to exit your active session on Chapai?',
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
}

/**
 * ------------------------------------------------------------------------------------
 * ABOUT APP INLINE VIEW UTILITY DIALOG ARCHITECTURE COMPONENT
 * ------------------------------------------------------------------------------------
 */
@Component({
  selector: 'app-about-app-modal',
  template: `
    <ion-content class="ion-padding ion-text-center modal-layout-wrap">
      <div class="brand-badge-circle">
        <ion-icon name="print" class="brand-accent-icon"></ion-icon>
      </div>
      <h1 class="app-brand-title">Chapai</h1>
      <p class="app-version-label">Version 1.0.0</p>
      
      <div class="institution-meta-card">
        <h3>NED University of Engineering and Technology</h3>
        <p>Course Module Verification Parameter: <strong>CS-222</strong></p>
      </div>

      <ion-button expand="block" mode="ios" class="close-action-trigger" (click)="dismissModal()">
        Acknowledge
      </ion-button>
    </ion-content>
  `,
  styles: [`
    // Host Content Override to prevent standard white canvas bleedthrough
    ion-content {
      --background: #121212;
    }

    .modal-layout-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
    }

    .brand-badge-circle {
      width: 64px;
      height: 64px;
      background: rgba(0, 180, 216, 0.1); // Subdued glowing cyan container accent
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 40px auto 16px auto;
      border: 1px solid rgba(0, 180, 216, 0.15);

      .brand-accent-icon {
        font-size: 30px;
        color: #00B4D8 !important; // Forces consistent brand theme color mapping
      }
    }

    .app-brand-title {
      font-weight: 800;
      font-size: 24px;
      color: #ffffff; // Crisp high-emphasis text color
      margin: 0;
      letter-spacing: -0.3px;
    }

    .app-version-label {
      font-size: 13px;
      color: #A4A4B5; // Soft mid-tone grayscale
      margin: 4px 0 24px 0;
      font-weight: 500;
    }

    // Secondary Container Card Element Matching Raised Surfaces System
    .institution-meta-card {
      background: #1E1E1E; 
      border-radius: 12px;
      padding: 16px;
      margin: 0 12px 32px 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

      h3 {
        font-size: 14px;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 6px 0;
        line-height: 1.4;
      }

      p {
        font-size: 12px;
        color: #A4A4B5;
        margin: 0;

        strong {
          color: #00B4D8; // Highlights the course code parameters
          font-weight: 600;
        }
      }
    }

    // Unified CTA Action Button Elements Rules mapping
    .close-action-trigger {
      --border-radius: 10px;
      --background: #00B4D8;
      --background-activated: #0096b4;
      --color: #ffffff;
      height: 48px;
      font-weight: 600;
      font-size: 15px;
      letter-spacing: -0.1px;
      margin-inline: 12px;
      box-shadow: 0 4px 12px rgba(0, 180, 216, 0.2);
    }
  `],
  standalone: false
})
export class AboutAppModalComponent {
  constructor(private modalCtrl: ModalController) {}

  dismissModal() { 
    this.modalCtrl.dismiss(); 
  }
}