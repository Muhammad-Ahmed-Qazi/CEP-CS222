import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
  standalone: false,
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  onLogin() {
    // Basic structural validation guard
    if (!this.email || !this.password) {
      this.errorMessage = 'Please populate all credential parameters.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Step 1: Request bearer authentication token from NestJS
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        
        // Step 2: Extract verified relational operational role context
        this.auth.getMe().subscribe({
          next: (user) => {
            this.isLoading = false;
            
            // Step 3: Branch routing clearance parameters
            if (user.role === 'admin') {
              this.router.navigate(['/admin/queue']);
            } else if (user.role === 'operator') {
              this.router.navigate(['/operator/queue']);
            } else {
              this.errorMessage = 'Unauthorized Scope: Role profile is invalid.';
            }
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = 'Identity Verification Failed: Profile unreachable.';
            console.error('Profile identification error:', err);
          }
        });

      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'Invalid email or password combination.';
        } else {
          this.errorMessage = 'Network Gateway Timeout: Unable to reach backend.';
        }
        console.error('Authentication stream error:', err);
      }
    });
  }
}