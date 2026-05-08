import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrintDataService {

  jobs = [
    { id: 101, user: 'Ali', file: 'assignment.pdf', pages: 12, status: 'Pending', time: '10:30 AM' },
    { id: 102, user: 'Sara', file: 'report.docx', pages: 5, status: 'Printing', time: '10:35 AM' },
    { id: 103, user: 'Hassan', file: 'notes.pdf', pages: 20, status: 'Completed', time: '10:40 AM' }
  ];

  getJobs() {
    return this.jobs;
  }

  updateJobStatus(id: number, status: string) {
    const job = this.jobs.find(j => j.id === id);
    if (job) job.status = status;
  }

  deleteUser(id: number) {
    // (future use for users page)
  }
}