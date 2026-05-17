import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

export interface Kiosk {
  id: string;
  label: string;
  location: string;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  assignedKiosk: Kiosk | null;
  joinedAt: string;
}

@Component({
  selector: 'app-admin-operators',
  templateUrl: './operators.html',
  styleUrls: ['./operators.scss'],
  standalone: false
})
export class Operators implements OnInit {
  operators: Operator[] = [];
  isLoading: boolean = true;
  isPanelOpen: boolean = false;
  isSubmitting: boolean = false;
  panelError: string | null = null;

  // Pagination State
  currentPage: number = 1;
  limit: number = 10;
  totalOperators: number = 0;

  operatorForm!: FormGroup;
  skeletonRows: number[] = Array(5).fill(0);

  kiosks: Kiosk[] = [];
  isLoadingKiosks: boolean = false;

  // Destructive Actions State Layer
  activeDeletePopoverOperatorId: string | null = null;
  isDeletingOperatorId: string | null = null;
  rowErrorOperatorId: string | null = null;
  rowErrorMessage: string | null = null;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private eRef: ElementRef
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.fetchKiosks(); // Pre-populate the lookup maps right away
    this.fetchOperators();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('access_token') || '';
    return { 'Authorization': `Bearer ${token}` };
  }

  fetchKiosks(): void {
    this.isLoadingKiosks = true;
    const url = 'http://localhost:3000/admin/kiosks';

    this.http.get<any>(url, { headers: this.getAuthHeaders() })
      .pipe(finalize(() => this.isLoadingKiosks = false))
      .subscribe({
        next: (res) => {
          if (!res) {
            this.kiosks = [];
            return;
          }
          const rawKiosks = Array.isArray(res) ? res : (res.data || []);
          this.kiosks = rawKiosks.map((k: any) => ({
            id: (k.id || k.kioskId || '').toString(),
            label: k.label || `Kiosk #${k.id || k.kioskId}`,
            location: k.location || k.locationName || 'N/A'
          }));
          console.log('[DEBUG] Form Selection Context - Populated Kiosks:', this.kiosks);
        },
        error: (err) => {
          console.error('[Operators] Failed to pull kiosk infrastructure map:', err);
        }
      });
  }

  toggleDeletePopover(event: Event, operatorId: string): void {
    event.stopPropagation();
    this.rowErrorOperatorId = null;
    this.rowErrorMessage = null;

    this.activeDeletePopoverOperatorId =
      this.activeDeletePopoverOperatorId === operatorId ? null : operatorId;
  }

  cancelDelete(): void {
    this.activeDeletePopoverOperatorId = null;
    this.rowErrorOperatorId = null;
    this.rowErrorMessage = null;
  }

  confirmDeleteOperator(operatorId: string): void {
    this.isDeletingOperatorId = operatorId;
    this.rowErrorOperatorId = null;
    const url = `http://localhost:3000/admin/users/${operatorId}`;

    this.http.delete<any>(url, { headers: this.getAuthHeaders() })
      .pipe(finalize(() => this.isDeletingOperatorId = null))
      .subscribe({
        next: () => {
          this.activeDeletePopoverOperatorId = null;
          this.fetchOperators();
        },
        error: (err) => {
          this.rowErrorOperatorId = operatorId;
          this.rowErrorMessage = err?.error?.message || 'Failed to delete operator.';
        }
      });
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (this.activeDeletePopoverOperatorId && !this.eRef.nativeElement.contains(event.target)) {
      this.cancelDelete();
    }
  }

  initForm(): void {
    this.operatorForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      kioskId: ['']
    });
  }

  fetchOperators(): void {
    this.isLoading = true;
    const url = `http://localhost:3000/admin/operators?page=${this.currentPage}&limit=${this.limit}`;

    this.http.get<any[]>(url, { headers: this.getAuthHeaders() })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          console.log('[DEBUG] Get Operators API Response payload stream:', res);

          if (!res || !Array.isArray(res)) {
            this.operators = [];
            this.totalOperators = 0;
            return;
          }

          this.operators = res.map((item: any) => {
            let kioskData: Kiosk | null = null;

            // Extract the raw foreign key reference ID from any potential response property variations
            const rawKioskId = item.assignedKiosk ?? item.kioskId ?? item.kiosk;

            if (rawKioskId !== undefined && rawKioskId !== null) {
              const targetIdStr = rawKioskId.toString();

              // Search through the cached component lookup array populated during panel initialization
              const matchingKiosk = this.kiosks.find(k => k.id === targetIdStr);

              if (matchingKiosk) {
                kioskData = { ...matchingKiosk };
              } else {
                // Safe client-side structural fallback if the full list hasn't loaded yet
                kioskData = {
                  id: targetIdStr,
                  label: `Kiosk #${targetIdStr}`,
                  location: item.kioskLocation || 'Assigned'
                };
              }
            }

            return {
              id: item.userId?.toString() || item.id?.toString() || '',
              name: `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unknown Operator',
              email: item.email || '',
              assignedKiosk: kioskData,
              joinedAt: item.joinedAt || new Date().toISOString()
            };
          });

          this.totalOperators = this.operators.length;
        },
        error: (err) => {
          console.error('[Operators] Fetch tracking issue:', err);
          this.operators = [];
        }
      });
  }

  openAddOperatorPanel(): void {
    this.operatorForm.reset({ kioskId: '' });
    this.panelError = null;
    this.isPanelOpen = true;
    this.fetchKiosks();
  }

  closePanel(): void {
    this.isPanelOpen = false;
    this.panelError = null;
  }

  onSubmit(): void {
    if (this.operatorForm.invalid) {
      this.operatorForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.panelError = null;

    const formRaw = this.operatorForm.value;
    console.log('[DEBUG] Raw values pulled directly from Reactive Form control properties:', formRaw);

    const nameParts = (formRaw.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload: any = {
      firstName: firstName,
      lastName: lastName,
      email: formRaw.email,
      password: formRaw.password
    };

    // Swap 'kioskId' for 'assignedKiosk' to match backend requirements
    if (formRaw.kioskId && String(formRaw.kioskId).trim() !== '') {
      const numericId = Number(formRaw.kioskId);
      payload.assignedKiosk = !isNaN(numericId) ? numericId : formRaw.kioskId;
      console.log(`[DEBUG] Evaluated assignedKiosk format validation step. Final type: ${typeof payload.assignedKiosk}, Value:`, payload.assignedKiosk);
    } else {
      console.log('[DEBUG] kioskId value missing; sending without assignedKiosk relationship payload.');
    }

    console.log('[DEBUG] Outgoing POST payload composition being sent to /admin/operators:', payload);

    this.http.post('http://localhost:3000/admin/operators', payload, {
      headers: this.getAuthHeaders(),
      responseType: 'text'
    })
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (serverResponse) => {
          console.log('[DEBUG] Success response received from backend execution context:', serverResponse);
          this.closePanel();
          this.currentPage = 1;
          this.fetchOperators();
        },
        error: (err) => {
          console.error('[DEBUG] Failed API creation transaction telemetry block:', err);
          this.panelError = err?.error?.message || 'Failed to create operator account.';
        }
      });
  }

  get totalPages(): number {
    return Math.ceil(this.totalOperators / this.limit) || 1;
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchOperators();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.fetchOperators();
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.operatorForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}