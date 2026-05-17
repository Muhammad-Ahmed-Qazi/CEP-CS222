import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { PrintData } from '../../services/print-data'; // Imported to fetch active operator station metadata
import { UserProfile } from '../../models/dashboard.interface';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-operator-shell',
  templateUrl: './operator-shell.html',
  styleUrls: ['./operator-shell.scss'],
  standalone: false
})
export class OperatorShell implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  avatarInitials: string = 'OP';
  pageTitle: string = 'Queue Monitor';
  currentTime: string = '';
  
  // Kiosk Infrastructure Properties
  assignedKioskId: number | null = null;
  kioskLocationName: string = 'Scanning...';
  kioskOperationalStatus: string = 'Unknown';
  
  private clockIntervalId: any;
  private routerSubscription!: Subscription;

  constructor(
    private authService: AuthService, 
    private printService: PrintData, // Injected to bind terminal diagnostics
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Core Auth Profile Mapping & Local Sync Cache Initialization
    this.profile = this.authService.getProfile();
    if (this.profile) {
      const f = this.profile.firstName?.charAt(0) || '';
      const l = this.profile.lastName?.charAt(0) || '';
      this.avatarInitials = `${f}${l}`.toUpperCase() || 'OP';
      
      // Fallback values from local cache to prevent UI flashing while API resolves
      this.assignedKioskId = this.profile.kioskId || null;
      this.kioskLocationName = this.profile.locationName || 'Scanning...';
    }

    // 2. Fetch Live Operator Kiosk Routing Assignments
    this.fetchOperatorKioskDetails();

    // 3. Router View State Tracking
    this.updatePageTitle(this.router.url);
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updatePageTitle(event.url);
    });

    // 4. Global Shell Clock Thread
    this.tickClock();
    this.clockIntervalId = setInterval(() => this.tickClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockIntervalId) clearInterval(this.clockIntervalId);
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
  }

  private fetchOperatorKioskDetails(): void {
    this.printService.getOperatorProfile().subscribe({
      next: (kioskProfile: any) => {
        if (kioskProfile) {
          this.assignedKioskId = kioskProfile.assignedKiosk;
          this.kioskLocationName = kioskProfile.kioskLocation || 'Unassigned Location';
          this.kioskOperationalStatus = kioskProfile.kioskStatus || 'Offline';

          // Reactive local synchronization check block
          if (this.profile) {
            this.profile.kioskId = kioskProfile.assignedKiosk;
            this.profile.locationName = kioskProfile.kioskLocation || null;
            this.authService.updateLocalProfileCache(this.profile);
          }
        }
      },
      error: () => {
        this.kioskLocationName = 'Hardware Disconnected';
        this.kioskOperationalStatus = 'Error';
      }
    });
  }

  private tickClock(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { hour12: false });
  }

  private updatePageTitle(url: string): void {
    if (url.includes('queue')) this.pageTitle = 'Print Queue Monitor';
    else if (url.includes('handover')) this.pageTitle = 'Document Handover Verification';
    else if (url.includes('bins')) this.pageTitle = 'Kiosk Bin Infrastructure';
    else if (url.includes('profile')) this.pageTitle = 'Operator Profile Workspace';
  }

  onLogout(): void {
    this.authService.logout();
  }
}