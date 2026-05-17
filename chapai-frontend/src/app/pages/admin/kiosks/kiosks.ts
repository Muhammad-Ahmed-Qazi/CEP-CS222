import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

export interface Kiosk {
  id: string;
  label: string;
  location: string;
  status: string;
  binCount: number;
  activeBinCount: number;
  // UI State
  bins?: Bin[];
  isLoadingBins?: boolean;
}

export interface Bin {
  binId: string;
  label: string;
  capacityPages: number;
  maxPageCapacity?: number;
  usedPages: number;
  status: 'available' | 'full' | 'reserved' | string;
  jobCount: number;
}

@Component({
  selector: 'app-admin-kiosks',
  templateUrl: './kiosks.html',
  styleUrls: ['./kiosks.scss'],
  standalone: false
})
export class Kiosks implements OnInit {
  kiosks: Kiosk[] = [];
  isLoading: boolean = true;
  skeletonRows = Array(5).fill(0);

  // Pagination
  currentPage: number = 1;
  limit: number = 10;
  totalKiosks: number = 0;

  // Slide-in Panel State (Kiosks)
  isPanelOpen: boolean = false;
  panelMode: 'add' | 'edit' = 'add';
  editingKioskId: string | null = null;
  isSubmittingKiosk: boolean = false;
  panelError: string | null = null;
  kioskForm!: FormGroup;

  // Inline Row State
  expandedKioskId: string | null = null;

  // Inline Bin Form State
  isAddingBinToKioskId: string | null = null;
  editingBinId: string | null = null;
  isSubmittingBin: boolean = false;
  binFormError: string | null = null;
  binForm!: FormGroup;

  // Destructive Actions State
  activeDeleteKioskId: string | null = null;
  activeDeleteBinId: string | null = null;
  isDeleting: boolean = false;
  rowErrorId: string | null = null;
  rowErrorMessage: string | null = null;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private eRef: ElementRef
  ) { }

  ngOnInit(): void {
    console.log('[DEBUG] Initialising Kiosks Dashboard Component Layer...');
    this.initForms();
    this.fetchKiosks();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('access_token') || '';
    return { 'Authorization': `Bearer ${token}` };
  }

  initForms(): void {
    this.kioskForm = this.fb.group({
      locationName: ['', Validators.required],
      status: ['active', Validators.required]
    });

    this.binForm = this.fb.group({
      binId: ['', [Validators.required, Validators.maxLength(10)]],
      maxPageCapacity: [100, [Validators.required, Validators.min(1)]]
    });
  }

  // --- Kiosk API Logic ---

  fetchKiosks(): void {
    this.isLoading = true;
    const url = `http://localhost:3000/admin/kiosks?page=${this.currentPage}&limit=${this.limit}`;
    console.log(`[DEBUG] Outgoing GET request dispatched to: ${url}`);

    this.http.get<any>(url, { headers: this.getAuthHeaders() })
      .pipe(finalize(() => {
        this.isLoading = false;
        console.log('[DEBUG] GET /admin/kiosks transaction sequence completed.');
      }))
      .subscribe({
        next: (res) => {
          console.log('[DEBUG] Raw Kiosks response payload stream unpacked:', res);

          const rawItems = res?.data || (Array.isArray(res) ? res : null);
          console.log('[DEBUG] Extracted raw array items for mapping evaluation:', rawItems);

          if (!rawItems || !Array.isArray(rawItems)) {
            console.warn('[DEBUG] Evaluation Warning: Target iterator block is not an array format.');
            this.kiosks = [];
            this.totalKiosks = 0;
            return;
          }

          this.kiosks = rawItems.map((k: any) => {
            const mappedId = (k.id || k.kioskId || k.KIOSK_ID || '').toString();

            return {
              ...k,
              id: mappedId,
              label: k.label || k.kioskName || `Kiosk #${mappedId}`,
              location: k.locationName || k.location || 'N/A',
              status: k.status || 'active',
              binCount: Number(k.binCount ?? k.totalBins ?? 0),
              activeBinCount: Number(k.activeBinCount ?? k.availableBins ?? 0),
              bins: undefined,
              isLoadingBins: false
            };
          });

          this.totalKiosks = res.total || this.kiosks.length;
          console.log('[DEBUG] Corrected local client component array model state:', this.kiosks);
        },
        error: (err) => {
          console.error('[DEBUG] Failed fetching kiosk list context stream:', err);
        }
      });
  }

  openAddKiosk(): void {
    this.panelMode = 'add';
    this.editingKioskId = null;
    this.kioskForm.reset({
      locationName: '',
      status: 'active'
    });
    this.panelError = null;
    this.isPanelOpen = true;
  }

  openEditKiosk(kiosk: Kiosk, event: Event): void {
    event.stopPropagation();
    this.panelMode = 'edit';
    this.editingKioskId = kiosk.id;
    console.log(`[DEBUG] Preparing slide panel for Edit. Loading object state for Kiosk ID: ${kiosk.id}`, kiosk);

    this.kioskForm.patchValue({
      locationName: kiosk.location,
      status: kiosk.status || 'active'
    });
    this.panelError = null;
    this.isPanelOpen = true;
  }

  closeKioskPanel(): void {
    this.isPanelOpen = false;
  }

  submitKiosk(): void {
    if (this.kioskForm.invalid) {
      console.warn('[DEBUG] Form submission halted. Form validation failed.', this.kioskForm.value);
      this.kioskForm.markAllAsTouched();
      return;
    }

    this.isSubmittingKiosk = true;
    this.panelError = null;

    const payload = this.kioskForm.value;

    console.log(`[DEBUG] Form validated. Mode: [${this.panelMode}]. Preparing payload context:`, payload);

    const url = this.panelMode === 'add'
      ? 'http://localhost:3000/admin/kiosks'
      : `http://localhost:3000/admin/kiosks/${this.editingKioskId}`;

    const req$ = this.panelMode === 'add'
      ? this.http.post(url, payload, { headers: this.getAuthHeaders() })
      : this.http.patch(url, payload, { headers: this.getAuthHeaders() });

    req$.pipe(finalize(() => this.isSubmittingKiosk = false)).subscribe({
      next: (serverResponse) => {
        console.log('[DEBUG] Success response received from Kiosk structural alteration:', serverResponse);
        this.closeKioskPanel();
        this.fetchKiosks();
      },
      error: (err) => {
        console.error('[DEBUG] API transaction failure for kiosk configurations:', err);
        this.panelError = err?.error?.message || `Failed to ${this.panelMode} kiosk.`;
      }
    });
  }

  // --- Kiosk Deletion ---

  toggleDeleteKioskPopover(kioskId: string, event: Event): void {
    event.stopPropagation();
    this.activeDeleteBinId = null;
    this.rowErrorId = null;
    this.activeDeleteKioskId = this.activeDeleteKioskId === kioskId ? null : kioskId;
  }

  confirmDeleteKiosk(kioskId: string): void {
    this.isDeleting = true;
    const url = `http://localhost:3000/admin/kiosks/${kioskId}`;

    this.http.delete(url, { headers: this.getAuthHeaders() })
      .pipe(finalize(() => this.isDeleting = false))
      .subscribe({
        next: (res) => {
          console.log('[DEBUG] Successfully truncated kiosk item database reference row context:', res);
          this.activeDeleteKioskId = null;
          if (this.expandedKioskId === kioskId) this.expandedKioskId = null;
          this.fetchKiosks();
        },
        error: (err) => {
          console.error('[DEBUG] Exception handling during deletion transaction sequence:', err);
          this.rowErrorId = kioskId;
          this.rowErrorMessage = err?.error?.message || 'Failed to delete kiosk.';
        }
      });
  }

  // --- Row Expansion & Bins Logic ---

  toggleExpand(kioskId: string): void {
    console.log(`[DEBUG] Row element interaction registered. Targeted Kiosk expansion key: ${kioskId}`);
    if (this.expandedKioskId === kioskId) {
      this.expandedKioskId = null;
      return;
    }

    this.expandedKioskId = kioskId;
    this.cancelBinForm();

    const kiosk = this.kiosks.find(k => k.id === kioskId);
    if (kiosk && !kiosk.bins) {
      this.fetchBins(kiosk);
    }
  }

  fetchBins(kiosk: Kiosk): void {
    kiosk.isLoadingBins = true;
    const url = `http://localhost:3000/admin/kiosks/${kiosk.id}/bins`;

    this.http.get<any>(url, { headers: this.getAuthHeaders() })
      .pipe(finalize(() => kiosk.isLoadingBins = false))
      .subscribe({
        next: (res) => {
          console.log(`[DEBUG] Raw response payload stream for Bins map received:`, res);
          const parsedBins = res?.data || (Array.isArray(res) ? res : []);

          kiosk.bins = parsedBins.map((b: any) => ({
            ...b,
            binId: (b.binId || b.id || b.BIN_ID || '').toString(),
            label: b.label || b.binLabel || b.binId || 'Unnamed Bin',
            capacityPages: Number(b.maxPageCapacity ?? b.capacityPages ?? b.capacity ?? 100),
            usedPages: Number(b.usedPages ?? b.used ?? 0),
            status: b.binStatus || b.status || 'available',
            jobCount: Number(b.jobCount ?? b.jobs?.length ?? 0)
          }));

          console.log(`[DEBUG] Successfully populated Kiosk model reference array [ID: ${kiosk.id}] with bins:`, kiosk.bins);
        },
        error: (err) => console.error('[DEBUG] Sub-table infrastructure pull failed:', err)
      });
  }

  // --- Bin Management ---

  openAddBin(kioskId: string): void {
    this.cancelBinForm();
    this.isAddingBinToKioskId = kioskId;
    this.binForm.reset({ 
      binId: '', 
      maxPageCapacity: 100 
    });
    this.binForm.get('binId')?.enable();
  }

  openEditBin(bin: Bin, kioskId: string): void {
    this.cancelBinForm();
    this.editingBinId = bin.binId;
    this.isAddingBinToKioskId = kioskId;
    
    this.binForm.setValue({
      binId: bin.binId,
      maxPageCapacity: bin.capacityPages
    });
    
    this.binForm.get('binId')?.disable();
  }

  cancelBinForm(): void {
    this.isAddingBinToKioskId = null;
    this.editingBinId = null;
    this.binFormError = null;
    this.binForm.reset();
  }

  submitBin(kioskId: string): void {
    if (this.binForm.invalid) {
      this.binForm.markAllAsTouched();
      return;
    }

    this.isSubmittingBin = true;
    this.binFormError = null;

    const rawValues = this.binForm.getRawValue();

    const payload = {
      binId: String(rawValues.binId).trim(),
      maxPageCapacity: Number(rawValues.maxPageCapacity)
    };

    const url = this.editingBinId
      ? `http://localhost:3000/admin/kiosks/${kioskId}/bins/${this.editingBinId}`
      : `http://localhost:3000/admin/kiosks/${kioskId}/bins`;

    console.log('[DEBUG] Outgoing clean mapped request payload body configuration:', JSON.stringify(payload, null, 2));

    const req$ = this.editingBinId
      ? this.http.patch(url, payload, { headers: this.getAuthHeaders() })
      : this.http.post(url, payload, { headers: this.getAuthHeaders() });

    req$.pipe(finalize(() => this.isSubmittingBin = false)).subscribe({
      next: () => {
        this.cancelBinForm();
        const kiosk = this.kiosks.find(k => k.id === kioskId);
        if (kiosk) this.fetchBins(kiosk);
        this.fetchKiosks();
      },
      error: (err) => {
        console.error('[DEBUG] Sub-table entry storage failure validation trace:', err);
        this.binFormError = err?.error?.message || 'Failed to save bin.';
      }
    });
  }

  confirmDeleteBin(kioskId: string, binId: string): void {
    this.isDeleting = true;
    const url = `http://localhost:3000/admin/kiosks/${kioskId}/bins/${binId}`;
    console.log(`[DEBUG] Executing HTTP DELETE towards endpoint target layout: ${url}`);

    this.http.delete(url, { headers: this.getAuthHeaders() })
      .pipe(finalize(() => this.isDeleting = false))
      .subscribe({
        next: () => {
          console.log(`[DEBUG] Successfully pruned bin engine instance with index reference: ${binId}`);
          this.activeDeleteBinId = null;
          const kiosk = this.kiosks.find(k => k.id === kioskId);
          if (kiosk) this.fetchBins(kiosk);
          this.fetchKiosks();
        },
        error: (err) => {
          console.error('[DEBUG] Sub-table resource clearing exception traced:', err);
          this.rowErrorId = binId;
          this.rowErrorMessage = err?.error?.message || 'Failed to delete bin.';
        }
      });
  }

  // --- Utilities ---

  toggleDeleteBinPopover(binId: string, event: Event): void {
    event.stopPropagation();
    this.activeDeleteKioskId = null;
    this.rowErrorId = null;
    this.activeDeleteBinId = this.activeDeleteBinId === binId ? null : binId;
  }

  get totalPages(): number {
    return Math.ceil(this.totalKiosks / this.limit) || 1;
  }

  changePage(dir: number): void {
    const newPage = this.currentPage + dir;
    if (newPage > 0 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.fetchKiosks();
    }
  }

  getCapacityFill(bin: Bin): number {
    if (!bin.capacityPages) return 0;
    return Math.min((bin.usedPages / bin.capacityPages) * 100, 100);
  }

  getCapacityClass(bin: Bin): string {
    const fill = this.getCapacityFill(bin);
    if (fill >= 100) return 'error';
    if (fill >= 75) return 'warning';
    return 'success';
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if ((this.activeDeleteKioskId || this.activeDeleteBinId) && !this.eRef.nativeElement.contains(event.target)) {
      this.activeDeleteKioskId = null;
      this.activeDeleteBinId = null;
      this.rowErrorId = null;
    }
  }
}