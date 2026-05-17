import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PrintData } from '../../../services/print-data';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface OperatorProfile {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  kioskId: string;
  profilePicture: string | null;
  joinedAt: string;
}

@Component({
  selector: 'app-operator-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  standalone: false
})
export class Profile implements OnInit {
  profile: OperatorProfile | null = null;
  isLoading: boolean = true;
  private readonly baseUrl = 'http://localhost:3000';

  constructor(
    private printDataService: PrintData,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchProfile();
  }

  fetchProfile(): void {
    this.isLoading = true;
    
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`,
      'Content-Type': 'application/json'
    });
    
    // Step 1: Fetch core authentication user details
    this.http.get<any>(`${this.baseUrl}/auth/me`, { headers }).pipe(
      switchMap((authData: any) => {
        // Step 2: Use the session information to hit the specific profile route
        return this.http.get<any>(`${this.baseUrl}/operator/profile`, { headers }).pipe(
          switchMap((profileData: any) => {
            // Pass both response payloads downstream
            return of({ authData, profileData });
          }),
          catchError((err) => {
            // Fallback framework if /operator/profile fails but auth succeeded
            return of({ authData, profileData: null });
          })
        );
      })
    ).subscribe({
      next: ({ authData, profileData }) => {
        try {
          this.profile = {
            id: authData.userId?.toString() || '',
            name: authData.name || 
                  (authData.firstName || authData.lastName 
                    ? `${authData.firstName || ''} ${authData.lastName || ''}`.trim() 
                    : 'Operator'),
            email: authData.email || '',
            employeeId: authData.employeeId || `EMP-${authData.userId || '00'}`,
            
            // Prioritise parsing the exact kiosk link returned from your operator profile record
            kioskId: profileData?.assignedKiosk?.toString() || 
                     'ERR',
                     
            profilePicture: authData.profilePicture || null,
            joinedAt: authData.joinedAt || authData.lastLoginTimestamp || new Date().toISOString()
          };
        } catch (mappingError) {
          console.error(mappingError);
        } finally {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getInitials(): string {
    if (!this.profile?.name) return 'OP';
    const parts = this.profile.name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
}