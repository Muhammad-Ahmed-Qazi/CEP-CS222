export interface Notification {
  notificationId: string;
  title: string;
  message: string;
  isRead: boolean;
  notificationType: 
    | 'job_submitted' 
    | 'job_printing' 
    | 'job_binned' 
    | 'job_collected' 
    | 'job_discarded' 
    | 'job_cancelled' 
    | 'topup' 
    | 'low_balance' 
    | 'welcome';
  relatedJobId: string | null;
  createdAt: string;
}

export type NotificationFilter = 'all' | 'unread' | 'jobs' | 'transactions' | 'system';