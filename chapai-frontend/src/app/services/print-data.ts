import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { Job, Bin } from '../models/dashboard.interface';

@Injectable({ providedIn: 'root' })
export class PrintData {
  private readonly apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  getOperatorQueue(): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/operator/queue`, { headers: this.getHeaders() });
  }

  updateJobStatus(id: number, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/operator/jobs/${id}/status`, { status }, { headers: this.getHeaders() });
  }

  assignBin(id: number, binId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/operator/jobs/${id}/assign-bin`, { binId }, { headers: this.getHeaders() });
  }

  discardJob(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/operator/jobs/${id}/discard`, {}, { headers: this.getHeaders() });
  }

  getAvailableBins(pages: number): Observable<Bin[]> {
    return this.http.get<Bin[]>(
      `${this.apiUrl}/operator/available-bins?pages=${pages}`,
      { headers: this.getHeaders() }
    );
  }

  getJobByQr(token: string): Observable<Job> {
    return this.http.get<Job>(`${this.apiUrl}/jobs/qr/${token}`);
  }

  confirmHandover(jobId: number, updatePayload: { status: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/jobs/${jobId}/handover`, updatePayload);
  }

  getOperatorProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/operator/profile`, {
      headers: this.getHeaders()
    });
  }

  getAdminUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/users`, { headers: this.getHeaders() });
  }

  deleteAdminUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/users/${id}`, { headers: this.getHeaders() });
  }

  // 📊 Dedicated Report Methods
  getDailyReports(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reports/daily`, { headers: this.getHeaders() });
  }

  getUserSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reports/user-summary`, { headers: this.getHeaders() });
  }

  // Generic fallback if needed elsewhere
  get<T>(url: string): Observable<T> {
    return this.http.get<T>(url); 
  }
}