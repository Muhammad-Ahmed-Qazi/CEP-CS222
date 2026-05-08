import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrintDataService } from '../../services/print-data.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports {

  constructor(private dataService: PrintDataService) {}

  get jobs() {
    return this.dataService.getJobs();
  }

  get totalJobs() {
    return this.jobs.length;
  }

  get pendingJobs() {
    return this.jobs.filter(j => j.status === 'Pending').length;
  }

  get printingJobs() {
    return this.jobs.filter(j => j.status === 'Printing').length;
  }

  get completedJobs() {
    return this.jobs.filter(j => j.status === 'Completed').length;
  }
}