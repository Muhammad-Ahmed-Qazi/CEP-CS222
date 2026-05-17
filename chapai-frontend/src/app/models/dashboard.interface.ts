export interface UserProfile {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  kioskId?: number | null;
  locationName?: string | null;
}

export interface LoginResponse {
  access_token: string;
}

export interface Job {
  jobId: number;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  pageCount: number;
  copies: number;
  jobType: 'normal' | 'bulk';
  priorityLevel: number;
  collectionSlot: string;
  expiryTime: string;
  statusName: 'Pending' | 'Printing' | 'Binned' | 'Collected' | 'Discarded';
  description?: string | null;
  totalCost: number;
  printSide: string;
  qrSecureToken: string;
  displayCountdown?: string;
  isNearExpiry?: boolean;
}

export interface Bin {
  binId: string;
  remainingCapacity: number;
  totalCapacity: number;
  locationName: string;
}