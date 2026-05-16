export interface UserSummaryReport {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  totalJobs: number;
  totalSpend: number;
  currentBalance: number;
  totalPages: number;
}

export interface DailySystemReport {
  date: string;
  totalJobs: number;
  totalRevenue: number;
  normalJobs: number;
  bulkJobs: number;
}
