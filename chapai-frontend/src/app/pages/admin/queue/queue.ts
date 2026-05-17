import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

export interface AdminJob {
  id: string;
  studentName: string;
  studentId: string; // Used as student email / identifier in the view
  fileName: string;
  fileType: string;
  copies: number;
  colorMode: 'Color' | 'B&W';
  paperSize: string;
  pageCount: number;
  totalPages: number;
  status: 'Pending' | 'Printing' | 'Binned' | 'Collected' | 'Discarded';
  priority: 'Faculty' | 'Student';
  submittedAt: string;
  collectionSlot: string;
  assignedBin: string | null;
  kioskLabel: string;
  kioskLocation: string;
}

@Component({
  selector: 'app-admin-queue',
  templateUrl: './queue.html',
  styleUrls: ['./queue.scss'],
  standalone: false
})
export class Queue implements OnInit, OnDestroy {
  jobs: AdminJob[] = [];
  filteredJobs: AdminJob[] = [];
  
  isLoading: boolean = true;
  expandedJobId: string | null = null;
  
  // API Pagination
  currentPage: number = 1;
  limit: number = 20;
  totalJobs: number = 0;
  
  // Client-side filtering
  filters = ['All', 'Pending', 'Printing', 'Binned', 'Collected', 'Discarded'];
  currentFilter: string = 'All';

  // Stats derived from fetched page
  stats = { total: 0, pending: 0, printing: 0, binned: 0 };
  
  private refreshInterval: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchJobs();
    this.refreshInterval = setInterval(() => this.fetchJobs(true), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  fetchJobs(isSilent: boolean = false): void {
    if (!isSilent) this.isLoading = true;
    
    const token = localStorage.getItem('access_token') || '';
    const url = `http://localhost:3000/admin/jobs?page=${this.currentPage}&limit=${this.limit}`;
    
    this.http.get<any>(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (res) => {
        
        let rawJobs: any[] = [];
        
        if (res && Array.isArray(res)) {
          rawJobs = res;
          this.totalJobs = res.length;
        } else if (res && Array.isArray(res.data)) {
          rawJobs = res.data;
          this.totalJobs = res.total || res.data.length;
        } else {
          rawJobs = [];
          this.totalJobs = 0;
        }

        // Map backend schemas safely to frontend interface properties
        this.jobs = rawJobs.map((item: any) => {
          // Dynamic full name generation from userFirstName and userLastName
          const firstName = item.userFirstName || '';
          const lastName = item.userLastName || '';
          const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Student';

          return {
            id: item.jobId?.toString() || '',
            studentName: fullName,
            studentId: item.userEmail || '-', 
            fileName: this.extractFileName(item.document || 'document.pdf'),
            fileType: this.extractFileType(item.document || ''),
            copies: item.copies || 1,
            colorMode: item.colorMode || (item.isColor ? 'Color' : 'B&W'),
            paperSize: item.paperSize || 'A4',
            pageCount: item.pageCount || 0,
            totalPages: item.totalPages || item.pageCount || 0,
            status: this.normalizeStatus(item.statusName),
            priority: this.normalizePriority(item.priorityLevel, item.jobType),
            submittedAt: item.submissionTime || new Date().toISOString(),
            collectionSlot: item.collectionSlot || 'As soon as binned',
            assignedBin: item.assignedBin || item.binLabel || null,
            kioskLabel: item.kioskLabel || 'Kiosk-1',
            kioskLocation: item.kioskLocation || 'Main Campus'
          };
        });

        this.applyFilter(this.currentFilter);
        this.calculateStats();
      },
      error: (err) => {
        this.jobs = [];
        this.applyFilter(this.currentFilter);
      }
    });
  }

  applyFilter(filter: string): void {
    this.currentFilter = filter;
    
    if (filter === 'All') {
      this.filteredJobs = [...this.jobs];
    } else {
      this.filteredJobs = this.jobs.filter(j => j.status.toLowerCase() === filter.toLowerCase());
    }
    
  }

  calculateStats(): void {
    this.stats.total = this.jobs.length;
    this.stats.pending = this.jobs.filter(j => j.status === 'Pending').length;
    this.stats.printing = this.jobs.filter(j => j.status === 'Printing').length;
    this.stats.binned = this.jobs.filter(j => j.status === 'Binned').length;
  }

  toggleExpand(jobId: string): void {
    this.expandedJobId = this.expandedJobId === jobId ? null : jobId;
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchJobs();
    }
  }

  nextPage(): void {
    const maxPages = Math.ceil(this.totalJobs / this.limit);
    if (this.currentPage < maxPages) {
      this.currentPage++;
      this.fetchJobs();
    }
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  // --- Helper parsing methods ---
  private extractFileName(path: string): string {
    if (!path) return 'document.pdf';
    const segments = path.split('/');
    const rawName = segments[segments.length - 1];
    // Strips out storage prefixes like file-1778949737745-28349003-
    return rawName.replace(/^file-\d+-\d+-/, '');
  }

  private extractFileType(path: string): string {
    if (!path) return 'PDF';
    const dotIndex = path.lastIndexOf('.');
    return dotIndex !== -1 ? path.substring(dotIndex + 1).toUpperCase() : 'PDF';
  }

  private normalizeStatus(statusName: string): 'Pending' | 'Printing' | 'Binned' | 'Collected' | 'Discarded' {
    if (!statusName) return 'Pending';
    const lower = statusName.toLowerCase();
    if (lower.includes('pend')) return 'Pending';
    if (lower.includes('print')) return 'Printing';
    if (lower.includes('bin')) return 'Binned';
    if (lower.includes('collect')) return 'Collected';
    if (lower.includes('discard') || lower.includes('cancel')) return 'Discarded';
    return 'Pending';
  }

  private normalizePriority(priorityLevel: number, jobType: string): 'Faculty' | 'Student' {
    // Check by level integer (assuming higher numbers or specific flags indicate faculty)
    if (priorityLevel === 1 || (jobType && jobType.toLowerCase() === 'faculty')) {
      return 'Faculty';
    }
    return 'Student';
  }
}