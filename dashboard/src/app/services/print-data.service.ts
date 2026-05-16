import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrintDataService {

  jobs = [
  { id: 101, user: 'Ali', file: 'assignment.pdf', pages: 12, status: 'Pending', time: '10:30 AM' },
  { id: 102, user: 'Sara', file: 'report.docx', pages: 5, status: 'Printing', time: '10:35 AM' },
  { id: 103, user: 'Hassan', file: 'notes.pdf', pages: 20, status: 'Completed', time: '10:40 AM' },
  { id: 104, user: 'Ayesha', file: 'slides.pptx', pages: 8, status: 'Pending', time: '10:45 AM' },
  { id: 105, user: 'Bilal', file: 'cv.pdf', pages: 2, status: 'Completed', time: '10:50 AM' },
  { id: 106, user: 'Fatima', file: 'labreport.pdf', pages: 18, status: 'Printing', time: '10:55 AM' },
  { id: 107, user: 'Usman', file: 'project.zip', pages: 30, status: 'Pending', time: '11:00 AM' },
  { id: 108, user: 'Hamza', file: 'resume.docx', pages: 4, status: 'Completed', time: '11:05 AM' },
  { id: 109, user: 'Zain', file: 'dbms_notes.pdf', pages: 25, status: 'Printing', time: '11:10 AM' },
  { id: 110, user: 'Iqra', file: 'thesis.pdf', pages: 40, status: 'Pending', time: '11:15 AM' },
  { id: 111, user: 'Mariam', file: 'research.docx', pages: 14, status: 'Completed', time: '11:20 AM' },
  { id: 112, user: 'Ahmed', file: 'diagram.png', pages: 1, status: 'Printing', time: '11:25 AM' }
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