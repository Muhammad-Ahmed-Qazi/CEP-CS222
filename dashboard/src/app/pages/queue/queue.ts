import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrintDataService } from '../../services/print-data.service';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './queue.html',
  styleUrl: './queue.css',
})
export class Queue implements OnInit {

  constructor(private dataService: PrintDataService) {}







ngOnInit() {
  setInterval(() => {

    const randomStatuses = ['Pending', 'Printing', 'Completed'];

    const randomJob = this.jobs[
      Math.floor(Math.random() * this.jobs.length)
    ];

    randomJob.status =
      randomStatuses[Math.floor(Math.random() * randomStatuses.length)];

  }, 5000);
}















  searchText = '';
  selectedStatus = 'All';
  page = 1;
  pageSize = 5;

  get jobs() {
    return this.dataService.getJobs();
  }

  get filteredJobs() {
    let filtered = this.jobs;

    if (this.selectedStatus !== 'All') {
      filtered = filtered.filter(j => j.status === this.selectedStatus);
    }

    if (this.searchText) {
      filtered = filtered.filter(j =>
        j.user.toLowerCase().includes(this.searchText.toLowerCase()) ||
        j.file.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }

    return filtered;
  }

  get paginatedJobs() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredJobs.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredJobs.length / this.pageSize);
  }
}