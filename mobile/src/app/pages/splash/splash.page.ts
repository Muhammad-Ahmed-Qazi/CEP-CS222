import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false,
})
export class SplashPage implements OnInit {

  constructor(
    private authService: AuthService,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    setTimeout(() => {
      if (this.authService.isLoggedIn()) {
        this.navCtrl.navigateRoot('/tabs/jobs', { animated: true });
      } else {
        this.navCtrl.navigateRoot('/login', { animated: true });
      }
    }, 2000);
  }
}