import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
// Import your AuthService here if available, otherwise mocked below
// import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.html',
  styleUrls: ['./admin-shell.scss'],
  standalone: false
})
export class AdminShell implements OnInit, OnDestroy {
  adminName: string = 'Administrator';
  currentTime: Date = new Date();
  private clockInterval: any;

  navLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { path: '/admin/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { path: '/admin/operators', label: 'Operators', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { path: '/admin/kiosks', label: 'Kiosks', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { path: '/admin/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { path: '/admin/logs', label: 'Logs', icon: 'M4 6h16M4 12h16M4 18h16' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startClock();
    try {
      const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      if (profile && profile.name) {
        this.adminName = profile.name;
      }
    } catch (e) {
      console.error('Could not parse profile');
    }
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  startClock(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  logout(): void {
    // authService.logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_profile');
    this.router.navigate(['/login']);
  }
}