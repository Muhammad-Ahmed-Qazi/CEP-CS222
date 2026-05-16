import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Point this to your running NestJS instance URL
  private apiUrl = 'http://localhost:3000'; 

  constructor(private http: HttpClient) {}

  // 1. Send credentials, return token, and save it locally
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((response: any) => {
        if (response.access_token) {
          localStorage.setItem('access_token', response.access_token);
        }
      })
    );
  }

  // 2. Fetch user profile and role using the bearer token
  getMe(): Observable<any> {
    const token = localStorage.getItem('access_token');
    return this.http.get(`${this.apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // 3. Fast structural check for routing guards
  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // 4. Wipe session data on sign out
  logout() {
    localStorage.removeItem('access_token');
  }
}