import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { Notification, NotificationFilter } from '../../models/notification.model';

@Component({
  selector: 'app-notifications',
  templateUrl: './notification.page.html',
  styleUrls: ['./notification.page.scss'],
  standalone: false
})
export class NotificationPage implements OnInit {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  currentFilter: NotificationFilter = 'all';
  isLoading = true;

  constructor(
    private api: ApiService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit(): void {
    this.fetchNotifications();
  }

  fetchNotifications(event?: CustomEvent): void {
    if (!event) this.isLoading = true;

    this.api.get<Notification[]>('/notifications')
      .pipe(
        finalize(() => {
          this.isLoading = false;
          if (event) {
            (event.target as HTMLIonRefresherElement).complete();
          }
        })
      )
      .subscribe({
        next: (data) => {
          // Sort explicitly by descending chronological output timeline rule arrays
          this.notifications = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.applyFilter();
        },
        error: () => this.showToast('Could not fetch notifications data feed.', 'danger')
      });
  }

  handleRefresh(event: Event): void {
    this.fetchNotifications(event as CustomEvent);
  }

  setFilter(filter: NotificationFilter): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    switch (this.currentFilter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => !n.isRead);
        break;
      case 'jobs':
        this.filteredNotifications = this.notifications.filter(n => 
          ['job_submitted', 'job_printing', 'job_binned', 'job_collected', 'job_discarded', 'job_cancelled'].includes(n.notificationType)
        );
        break;
      case 'transactions':
        this.filteredNotifications = this.notifications.filter(n => ['topup', 'low_balance'].includes(n.notificationType));
        break;
      case 'system':
        this.filteredNotifications = this.notifications.filter(n => n.notificationType === 'welcome');
        break;
      case 'all':
      default:
        this.filteredNotifications = [...this.notifications];
        break;
    }
  }

  handleNotificationTap(noti: Notification): void {
    if (!noti.isRead) {
      noti.isRead = true;
      this.api.patch<void>(`/notifications/${noti.notificationId}/read`, {}).subscribe({
        next: () => this.applyFilter(),
        error: () => noti.isRead = false // Rollback UI if mutation breaks down bounds
      });
    }

    if (noti.relatedJobId) {
      this.navCtrl.navigateForward(`/tabs/jobs/detail/${noti.relatedJobId}`);
    }
  }

  markAllAsRead(): void {
    this.isLoading = true;
    this.api.patch<void>('/notifications/read-all', {})
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          this.notifications.forEach(n => n.isRead = true);
          this.applyFilter();
          this.showToast('All notifications marked as read.', 'success');
        },
        error: () => this.showToast('Failed execution payload command.', 'danger')
      });
  }

  clearAllNotifications(): void {
    this.isLoading = true;
    this.api.delete<void>('/notifications')
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          this.notifications = [];
          this.filteredNotifications = [];
          this.showToast('Notification clearance complete.', 'success');
        },
        error: () => this.showToast('Clear pipeline operation aborted.', 'danger')
      });
  }

  getNotificationContext(type: string): { icon: string, class: string } {
    switch (type) {
      case 'job_submitted': return { icon: 'print-outline', class: 'cyan-brand' };
      case 'job_printing': return { icon: 'print-outline', class: 'amber-alert' };
      case 'job_binned': return { icon: 'checkmark-circle-outline', class: 'green-success' };
      case 'job_collected': return { icon: 'bag-handle-outline', class: 'green-success' };
      case 'job_discarded': return { icon: 'trash-outline', class: 'red-danger' };
      case 'job_cancelled': return { icon: 'close-circle-outline', class: 'red-danger' };
      case 'topup': return { icon: 'wallet-outline', class: 'green-success' };
      case 'low_balance': return { icon: 'warning-outline', class: 'amber-alert' };
      case 'welcome': return { icon: 'person-outline', class: 'cyan-brand' };
      default: return { icon: 'notifications-outline', class: 'gray-neutral' };
    }
  }

  formatTimeAgo(dateString: string): string {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 600);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    await t.present();
  }
}