import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth-token';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    const loginPayload = { email, password }; 
    
    return this.http.post(`${environment.apiUrl}/auth/login`, loginPayload).pipe(
      tap((res: any) => {
        if (res.access_token) {
          localStorage.setItem(this.TOKEN_KEY, res.access_token);
        }
      })
    );
  }

  register(userData: any) {
    // userData is already an object from the Reactive Form, so this is fine
    return this.http.post(`${environment.apiUrl}/auth/register`, userData);
  }

  getToken() { return localStorage.getItem(this.TOKEN_KEY); }

  isLoggedIn() { return !!this.getToken(); }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }
}