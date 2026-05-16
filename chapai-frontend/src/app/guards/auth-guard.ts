import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot) {
    // Phase A: No token? Deny entry and kick to login screen instantly
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
      return false;
    }

    // Phase B: Read required roles from the router metadata configuration
    const expectedRoles = route.data['roles'] as Array<string>;

    // Phase C: Fetch profile from backend to verify identity authenticity
    return this.auth.getMe().pipe(
      map(user => {
        if (expectedRoles && expectedRoles.includes(user.role)) {
          return true; // Authorized clearance! Let them pass.
        }
        
        // Signed in but caught out of bounds? Re-route based on true identity
        this.router.navigate([user.role === 'admin' ? '/admin/queue' : '/operator/queue']);
        return false;
      }),
      catchError(() => {
        this.auth.logout(); // Token might be expired or malformed
        this.router.navigate(['/']);
        return of(false);
      })
    );
  }
}