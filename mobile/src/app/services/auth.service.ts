import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular'; // Add this import
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth-token';

  constructor(private http: HttpClient, private router: Router, private navCtrl: NavController, private api: ApiService) {}

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
    return this.api.post('/auth/register', userData).pipe(
      tap((res: any) => {
        if (res.access_token) {
          localStorage.setItem('token', res.access_token);
          this.navCtrl.navigateRoot('/tabs/jobs');
        }
      })
    );
  }

  getToken() { return localStorage.getItem(this.TOKEN_KEY); }

  isLoggedIn() { return !!this.getToken(); }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }
}