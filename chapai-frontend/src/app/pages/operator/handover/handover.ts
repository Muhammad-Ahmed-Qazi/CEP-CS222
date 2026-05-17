import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';

export interface JobQRResponse {
  jobId: number;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  statusName: string;
  pageCount: number;
  copies: number;
  jobType: string;
  collectionSlot: string;
  expiryTime: string;
  kioskId: number;
  locationName: string;
  binId: string;
  isExpired: boolean;
}

export interface RecentLookup {
  jobId: number;
  token: string;
  userFirstName: string;
  userLastName: string;
  timestamp: number;
}

@Component({
  selector: 'app-operator-handover',
  templateUrl: './handover.html',
  styleUrls: ['./handover.scss'],
  standalone: false
})
export class Handover implements OnInit, OnDestroy {
  private readonly apiUrl = 'http://localhost:3000'; // Match your active backend port
  
  searchToken: string = '';
  isLoading: boolean = false;
  errorMessage: string | null = null;
  
  jobResult: JobQRResponse | null = null;
  isHandoverLoading: boolean = false;
  handoverSuccess: boolean = false;
  
  recentLookups: RecentLookup[] = [];
  
  countdownText: string = '';
  isCountdownCritical: boolean = false;
  private timerInterval: any;
  private routeSub: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRecentLookups();

    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.searchToken = params['token'];
        this.lookupJob(this.searchToken);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  /**
   * Helper to safely extract authentication headers from local storage cache
   */
  private getAuthHeaders(): HttpHeaders {
    // Checks standard token naming conventions used by active session guards
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async lookupJob(token: string) {
    if (!token || token.trim() === '') return;
    
    this.resetState();
    this.searchToken = token;
    this.isLoading = true;

    try {
      // 💡 Added explicit auth headers to bypass the 401 guard perimeter
      const response = await firstValueFrom(
        this.http.get<JobQRResponse>(
          `${this.apiUrl}/operator/jobs/qr/${this.searchToken}`,
          { headers: this.getAuthHeaders() }
        )
      );
      this.jobResult = response;
      this.addToRecentLookups(response, this.searchToken);
      this.startCountdown();
    } catch (error) {
      this.handleLookupError(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async confirmHandover() {
    if (!this.jobResult) return;
    
    this.isHandoverLoading = true;
    try {
      // 💡 Added explicit auth headers here as well for the patch routine
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/operator/jobs/${this.jobResult.jobId}/handover`, 
          {}, 
          { headers: this.getAuthHeaders() }
        )
      );
      this.handoverSuccess = true;
    } catch (error) {
      this.errorMessage = "Failed to confirm handover. Action lifecycle rejected by server authorization.";
    } finally {
      this.isHandoverLoading = false;
      this.cdr.detectChanges();
    }
  }

  resetForm() {
    this.searchToken = '';
    this.resetState();
  }

  goToQueue() {
    this.router.navigate(['/operator/queue']);
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  private resetState() {
    this.jobResult = null;
    this.errorMessage = null;
    this.handoverSuccess = false;
    this.clearTimer();
  }

  private handleLookupError(error: any) {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        this.errorMessage = "Session unauthorized. Try logging out and back into the operator panel.";
      } else if (error.status === 404) {
        this.errorMessage = "No job found with this QR token.";
      } else if (error.status === 400) {
        this.errorMessage = error.error?.message || "Job is not ready for collection.";
      } else {
        this.errorMessage = "Connection failed — check if backend microservices are running.";
      }
    } else {
      this.errorMessage = "An unexpected error occurred during pipeline lookup.";
    }
  }

  private startCountdown() {
    this.clearTimer();
    if (!this.jobResult || this.jobResult.isExpired) return;

    const updateTimer = () => {
      if (!this.jobResult) return;
      const now = new Date().getTime();
      const expiry = new Date(this.jobResult.expiryTime).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        this.jobResult.isExpired = true;
        this.clearTimer();
        return;
      }

      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      this.countdownText = `${hours} hours ${minutes} minutes remaining`;
      this.isCountdownCritical = (hours === 0 && minutes < 30);
      this.cdr.detectChanges();
    };

    updateTimer();
    this.timerInterval = setInterval(updateTimer, 60000);
  }

  private clearTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private loadRecentLookups() {
    const stored = localStorage.getItem('recent_handovers');
    if (stored) {
      try {
        this.recentLookups = JSON.parse(stored);
      } catch (e) {
        this.recentLookups = [];
      }
    }
  }

  private addToRecentLookups(job: JobQRResponse, token: string) {
    const lookup: RecentLookup = {
      jobId: job.jobId,
      token: token,
      userFirstName: job.userFirstName,
      userLastName: job.userLastName,
      timestamp: Date.now()
    };

    this.recentLookups = this.recentLookups.filter(l => l.jobId !== job.jobId);
    this.recentLookups.unshift(lookup);
    
    if (this.recentLookups.length > 5) this.recentLookups.pop();
    localStorage.setItem('recent_handovers', JSON.stringify(this.recentLookups));
  }
}