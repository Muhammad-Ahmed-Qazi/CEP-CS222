import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  username = '';
  password = '';

 constructor(
  private router: Router,
  private auth: AuthService
) {}



 login() {
  if (this.auth.login(this.username, this.password)) {
    this.router.navigate(['/queue']);
  } else {
    alert('Invalid credentials ');
  }
}
}
