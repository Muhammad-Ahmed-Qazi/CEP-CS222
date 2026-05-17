import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Bin {
  kioskId: string;
  binId: string;
  maxPageCapacity: number;
  usedPages: number;
  remainingCapacity: number;
  binStatus: 'available' | 'full' | 'reserved';
}

@Component({
  selector: 'app-operator-bins',
  templateUrl: './bins.html',
  styleUrls: ['./bins.scss'],
  standalone: false
})
export class Bins implements OnInit {
  private readonly apiUrl = 'http://localhost:3000';
  
  operatorLocation: string = 'Campus Print Kiosk';
  
  bins: Bin[] = [];
  isLoading: boolean = true;
  globalError: string | null = null;

  // Summary Stats
  totalBins: number = 0;
  availableBins: number = 0;
  fullBins: number = 0;

  skeletonArray = [1, 2, 3];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.extractUserProfile();
    this.fetchBins();
  }

  private extractUserProfile(): void {
    try {
      const profileStr = localStorage.getItem('user_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        this.operatorLocation = profile.location || profile.kioskName || 'Assigned Print Station';
      }
    } catch (e) {
      console.warn('Could not parse user profile for location data');
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async fetchBins() {
    this.isLoading = true;
    this.globalError = null;

    try {
      const response = await firstValueFrom(
        this.http.get<Bin[]>(`${this.apiUrl}/operator/bins`, { headers: this.getAuthHeaders() })
      );
      
      // Process database items and calculate state dynamically based on page thresholds
      this.bins = (response || []).map(bin => {
        let calculatedStatus: 'available' | 'full' | 'reserved' = bin.binStatus;

        // 💡 Dynamic Rule: If used pages equal or exceed maximum capacity, lock it as full.
        // Otherwise, flag it as available to accept fresh incoming campus print streams.
        if (bin.usedPages >= bin.maxPageCapacity) {
          calculatedStatus = 'full';
        } else {
          calculatedStatus = 'available';
        }

        return {
          ...bin,
          binStatus: calculatedStatus
        };
      });

      this.calculateStats();
    } catch (error) {
      console.error('[Bins] Failed to fetch and compute bin states:', error);
      this.globalError = 'Unable to load bin data. Please verify your connection.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private calculateStats() {
    this.totalBins = this.bins.length;
    this.availableBins = this.bins.filter(b => b.binStatus === 'available').length;
    this.fullBins = this.bins.filter(b => b.binStatus === 'full').length;
  }

  // --- UI Helpers ---

  getCapacityPercentage(bin: Bin): number {
    if (!bin.maxPageCapacity || bin.maxPageCapacity === 0) return 0;
    const percent = (bin.usedPages / bin.maxPageCapacity) * 100;
    return Math.min(Math.max(percent, 0), 100);
  }

  getCapacityClass(bin: Bin): string {
    const percent = this.getCapacityPercentage(bin);
    if (percent >= 100) return 'bar-error';
    if (percent >= 75) return 'bar-warning';
    return 'bar-success';
  }
}