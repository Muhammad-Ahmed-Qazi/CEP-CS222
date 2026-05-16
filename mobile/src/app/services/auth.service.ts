import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ApiService } from './api.service';

interface AuthResponse {
  access_token: string;
  message?: string;
  userId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth-token';

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private api: ApiService
  ) {}

  /**
   * 🔑 Authenticate an existing user account
   */
  login(email: string, password: string): Observable<AuthResponse> {
    const loginPayload = { email, password }; 
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, loginPayload).pipe(
      tap((res: AuthResponse) => {
        if (res.access_token) {
          this.setToken(res.access_token);
        }
      })
    );
  }

  /**
   * 📝 Register a new user profile (Student or Faculty)
   */
  register(userData: Record<string, unknown>): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', userData).pipe(
      tap((res: AuthResponse) => {
        if (res.access_token) {
          this.setToken(res.access_token);
        }
      })
    );
  }

  /**
   * 💾 Save the active JWT token into localized browser memory
   */
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * 🔍 Fetch the currently saved security authentication token string
   */
  getToken(): string | null { 
    return localStorage.getItem(this.TOKEN_KEY); 
  }

  /**
   * 🛡️ State check helper to verify if a user session is globally active
   */
  isLoggedIn(): boolean { 
    return !!this.getToken(); 
  }

  /**
   * 🚪 Clear out persistent storage states and push back to standard login index
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }
}