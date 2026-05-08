import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  login() {
    // fake auth (no backend yet)
    if (this.username === 'admin' && this.password === '1234') {
      this.router.navigate(['/queue']);
    } else {
      alert('Invalid credentials 😢');
    }
  }
}