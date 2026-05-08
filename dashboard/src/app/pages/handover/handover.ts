import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrintDataService } from '../../services/print-data.service';

@Component({
  selector: 'app-handover',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './handover.html',
  styleUrl: './handover.css',
})
export class Handover {

  constructor(private dataService: PrintDataService) {}

  token: string = '';
  selectedJob: any = null;

  get jobs() {
    return this.dataService.getJobs();
  }

  verifyJob() {
    this.selectedJob = this.jobs.find(j => j.id == Number(this.token));

    if (!this.selectedJob) {
      alert('Job not found ');
    }
  }

  completeJob() {
    if (this.selectedJob) {
      this.dataService.updateJobStatus(this.selectedJob.id, 'Completed');

      alert('Job handed over successfully ✅');
      this.token = '';
      this.selectedJob = null;
    }
  }
}