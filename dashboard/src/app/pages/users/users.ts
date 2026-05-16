import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {

  searchText = '';

  users = [
    { id: 1, name: 'Ali', role: 'Student' },
    { id: 2, name: 'Sara', role: 'Student' },
    { id: 3, name: 'Hassan', role: 'Operator' },
    { id: 4, name: 'Ayesha', role: 'Student' }
  ];

  get filteredUsers() {
    return this.users.filter(u =>
      u.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  deleteUser(id: number) {
    this.users = this.users.filter(u => u.id !== id);
  }
}