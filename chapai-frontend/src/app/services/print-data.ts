import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PrintData {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  // Securely generate authorized transport headers
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // 1. Fetch live jobs filtered by state from Oracle DB
  getAdminJobs(status?: string): Observable<any[]> {
    let url = `${this.apiUrl}/admin/jobs`;
    if (status && status !== 'All') {
      url += `?status=${status}`;
    }
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  getOperatorJobs(status?: string): Observable<any[]> {
    let url = `${this.apiUrl}/operator/queue`;
    if (status && status !== 'All') {
      url += `?status=${status}`;
    }
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  // 2. State machine transition execution directly from the request stream
  updateJobStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/operator/jobs/${id}/status`, { status }, { headers: this.getHeaders() });
  }

  // 3. Look up available bins across the campus network based on page criteria
  getAvailableBins(pages: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/operator/bins/available-bins?pages=${pages}`, { headers: this.getHeaders() });
  }

  // 4. Bind a print job sequence to a physical kiosk drawer slot
  assignBin(id: number, binId: string): Observable<any> {
    // Passes { binId } as the request body, which maps directly to {"binId": "binIdValue"}
    return this.http.patch(
      `${this.apiUrl}/operator/jobs/${id}/assign-bin`, 
      { binId }, 
      { headers: this.getHeaders() }
    );
  }
}