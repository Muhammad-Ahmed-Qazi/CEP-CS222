import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // This pulls 'http://localhost:3000' from your environment file
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Standard GET request
   */
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`);
  }

  /**
   * Standard POST request for JSON data
   */
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }

  /**
   * Specialized POST for Files (Multipart FormData)
   * IMPORTANT: We do NOT set headers here. 
   * The browser automatically detects FormData and sets the correct 
   * multipart/form-data boundary.
   */
  postMultipart<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, formData);
  }
}