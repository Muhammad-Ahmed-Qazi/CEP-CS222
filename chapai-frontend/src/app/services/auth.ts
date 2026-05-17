import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // 💡 Imported HttpHeaders explicitly
import { Router } from '@angular/router';
import { Observable, tap, switchMap } from 'rxjs';
import { LoginResponse, UserProfile } from '../models/dashboard.interface';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<UserProfile> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => localStorage.setItem('access_token', res.access_token)),
      switchMap(() => this.fetchAndStoreProfile())
    );
  }

  private fetchAndStoreProfile(): Observable<UserProfile> {
    // 💡 Normalized headers mapping using robust configuration
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    return this.http.get<UserProfile & { role: string }>(`${this.apiUrl}/auth/me`, { headers }).pipe(
      tap(profile => {
        localStorage.setItem('user_role', profile.role);
        
        // Handle potential naming mismatches between database row objects and camelCase models safely
        const userProfile: UserProfile = {
          userId: profile.userId,
          email: profile.email,
          firstName: profile.firstName || (profile as any).FIRST_NAME || '',
          lastName: profile.lastName || (profile as any).LAST_NAME || '',
          kioskId: profile.kioskId !== undefined ? profile.kioskId : (profile as any).assignedKiosk,
          locationName: profile.locationName || (profile as any).kioskLocation || null
        };
        
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
      })
    );
  }

  /**
   * 💡 Added Helper: Allows external services (like PrintData) to safely 
   * mutate local memory cache states when dynamic polling detects a kiosk update.
   */
  updateLocalProfileCache(updatedProfile: UserProfile): void {
    localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
  }

  getProfile(): UserProfile | null {
    const data = localStorage.getItem('user_profile');
    return data ? JSON.parse(data) : null;
  }

  getRole(): string | null {
    return localStorage.getItem('user_role');
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_profile');
    this.router.navigate(['/login']);
  }
}