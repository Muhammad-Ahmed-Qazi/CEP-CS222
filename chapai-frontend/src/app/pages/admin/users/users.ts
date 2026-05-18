import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { PrintData } from '../../../services/print-data';

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string; 
  accountBalance: number;
  isFadingOut?: boolean;
}

export interface UserStats {
  total: number;
  students: number;
  faculty: number;
  totalBalance: number;
}

@Component({
  selector: 'app-admin-users',
  templateUrl: './users.html',
  styleUrls: ['./users.scss'],
  standalone: false
})
export class Users implements OnInit, OnDestroy {
  users: User[] = [];          // Master database list
  filteredUsers: User[] = [];  // Search-filtered list
  paginatedUsers: User[] = []; // Current page slice

  stats: UserStats = { total: 0, students: 0, faculty: 0, totalBalance: 0 };

  searchControl = new FormControl('');
  private destroy$ = new Subject<void>();

  isLoading = true;
  isTableLoading = false;

  currentPage = 1;
  itemsPerPage = 15;
  totalPages = 1;

  userToDeleteId: string | null = null;
  hasSearched = false;

  constructor(private printDataService: PrintData) { }

  ngOnInit(): void {
    this.fetchAllUsers();

    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((searchTerm: string | null) => {
      const term = (searchTerm || '').toLowerCase().trim();
      this.hasSearched = !!term;
      this.applyFilter(term);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchAllUsers(): void {
    this.isLoading = true;

    this.printDataService.getAdminUsers()
      .subscribe({
        next: (res: User[]) => {
          this.users = res || [];
          this.calculateStats();
          this.applyFilter(this.searchControl.value?.toLowerCase() || '');
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('Failed to fetch users:', err);
          this.isLoading = false;
        }
      });
  }

  applyFilter(term: string): void {
    if (!term) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter((user: User) => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(term) || email.includes(term);
      });
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  calculateStats(): void {
    this.stats = this.users.reduce((acc: UserStats, user: User) => {
      acc.total++;
      
      const dynamicRole = (user.role || '').toLowerCase();
      if (dynamicRole === 'student') acc.students++;
      if (dynamicRole === 'faculty') acc.faculty++;
      
      acc.totalBalance += Number(user.accountBalance) || 0;
      return acc;
    }, { total: 0, students: 0, faculty: 0, totalBalance: 0 });
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage) || 1;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  triggerDelete(userId: string): void {
    this.userToDeleteId = userId;
  }

  cancelDelete(): void {
    this.userToDeleteId = null;
  }

  confirmDelete(userId: string): void {
    this.isTableLoading = true;

    this.printDataService.deleteAdminUser(userId).subscribe({
      next: () => {
        const target = this.users.find((u: User) => u.userId === userId);
        if (target) target.isFadingOut = true;

        setTimeout(() => {
          this.users = this.users.filter((u: User) => u.userId !== userId);
          this.userToDeleteId = null;
          this.calculateStats();
          this.applyFilter(this.searchControl.value?.toLowerCase() || '');

          if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
            this.updatePagination();
          }
          this.isTableLoading = false;
        }, 300);
      },
      error: (err: any) => {
        console.error('DELETE request failed:', err);
        this.isTableLoading = false;
        this.userToDeleteId = null;
      }
    });
  }

  getInitials(first: string, last: string): string {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }
}