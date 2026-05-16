import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-splash',
  template: `
    <ion-content class="ion-text-center">
      <div class="splash-container">
        <!-- Ink Droplet SVG -->
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21.5C15.5899 21.5 18.5 18.5899 18.5 15C18.5 10.5 12 3 12 3C12 3 5.5 10.5 5.5 15C5.5 18.5899 8.41015 21.5 12 21.5Z" fill="#00B4D8"/>
        </svg>
        <h1 class="app-name">Chapai</h1>
      </div>
    </ion-content>
  `,
  styles: [`
    .splash-container { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; }
    .app-name { font-weight: 800; font-size: 2.5rem; letter-spacing: -1px; margin-top: 10px; color: var(--ion-color-primary); }
  `],
  standalone: false,
})
export class SplashPage implements OnInit {
  constructor(private auth: AuthService, private navCtrl: NavController) {}

  ngOnInit() {
    setTimeout(() => {
      if (this.auth.isLoggedIn()) {
        this.navCtrl.navigateRoot('/tabs/jobs');
      } else {
        this.navCtrl.navigateRoot('/login');
      }
    }, 2000);
  }
}