import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DonationApiService } from '../../core/services/donation-api.service';
import { CauseApiService } from '../../core/services/cause-api.service';
import { DonorApiService } from '../../core/services/donor-api.service';
import { ApiError } from '../../core/services/item-api.service';
import { Donation } from '../../core/models/donation.model';
import { Cause } from '../../core/models/cause.model';
import { Donor } from '../../core/models/donor.model';
import { DonationFormModalComponent } from './donation-form.modal';
import { DonationDeleteConfirmModalComponent } from './delete-confirm.modal';

interface Toast { id: number; type: 'success' | 'error'; message: string; duration: number; }

@Component({
  selector: 'app-donations',
  standalone: true,
  imports: [CommonModule, FormsModule, DonationFormModalComponent, DonationDeleteConfirmModalComponent],
  templateUrl: './donations.component.html',
  styleUrls: ['./donations.component.scss']
})
export class DonationsComponent implements OnInit {
  private readonly api      = inject(DonationApiService);
  private readonly causeApi = inject(CauseApiService);
  private readonly donorApi = inject(DonorApiService);

  readonly allDonations = signal<Donation[]>([]);
  readonly causes       = signal<Cause[]>([]);
  readonly donors       = signal<Donor[]>([]);
  readonly loading      = signal(true);
  readonly error        = signal<string | null>(null);

  readonly searchQuery = signal('');
  readonly donorFilter = signal<number>(0);
  readonly causeFilter = signal<number>(0);

  readonly showFormModal     = signal(false);
  readonly editingDonation   = signal<Donation | null>(null);
  readonly showDeleteModal   = signal(false);
  readonly deletingDonation  = signal<Donation | null>(null);
  readonly expandedId        = signal<number | null>(null);

  readonly toast = signal<Toast | null>(null);
  readonly toastList = computed(() => { const t = this.toast(); return t ? [t] : []; });
  private toastTimer: any = null;
  private toastIdCounter = 0;

  readonly filteredDonations = computed<Donation[]>(() => {
    let list = this.allDonations();

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(d =>
        d.donorName.toLowerCase().includes(q) ||
        d.causeTitle.toLowerCase().includes(q) ||
        d.ngoName.toLowerCase().includes(q) ||
        d.lines.some(l =>
          l.itemName.toLowerCase().includes(q) ||
          l.itemCode.toLowerCase().includes(q)
        )
      );
    }

    const df = this.donorFilter();
    if (df > 0) list = list.filter(d => d.donorId === df);

    const cf = this.causeFilter();
    if (cf > 0) list = list.filter(d => d.causeId === cf);

    return list;
  });

  readonly stats = computed(() => {
    const list = this.allDonations();
    const total = list.reduce((s, d) => s + d.totalValue, 0);
    const totalLines = list.reduce((s, d) => s + d.lines.length, 0);
    return {
      count: list.length,
      totalValue: total,
      totalLines,
      averageValue: list.length === 0 ? 0 : total / list.length
    };
  });

  readonly hasActiveFilters = computed(() =>
    !!this.searchQuery().trim() || this.donorFilter() > 0 || this.causeFilter() > 0
  );

  ngOnInit(): void {
    this.loadReference();
    this.loadDonations();
  }

  loadReference(): void {
    this.donorApi.getAll().subscribe({ next: list => this.donors.set(list) });
    this.causeApi.getAll().subscribe({ next: list => this.causes.set(list) });
  }

  loadDonations(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAll().subscribe({
      next: donations => {
        this.allDonations.set(donations);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.detail || 'Could not load donations.');
        this.loading.set(false);
      }
    });
  }

  // ─── Filters ───────────────────────────────────────────────────────
  onSearchInput(value: string): void { this.searchQuery.set(value); }
  onDonorChange(v: number): void { this.donorFilter.set(v); }
  onCauseChange(v: number): void { this.causeFilter.set(v); }
  clearFilters(): void {
    this.searchQuery.set('');
    this.donorFilter.set(0);
    this.causeFilter.set(0);
  }

  // ─── Expand/collapse lines ─────────────────────────────────────────
  toggleExpand(id: number): void {
    this.expandedId.update(current => current === id ? null : id);
  }

  // ─── CRUD ──────────────────────────────────────────────────────────
  openAddModal(): void {
    this.editingDonation.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(donation: Donation, event?: Event): void {
    event?.stopPropagation();
    this.editingDonation.set(donation);
    this.showFormModal.set(true);
  }

  onFormClosed(): void {
    this.showFormModal.set(false);
    this.editingDonation.set(null);
  }

  onFormSaved(_: Donation): void {
    const isEdit = this.editingDonation() !== null;
    this.showFormModal.set(false);
    this.editingDonation.set(null);
    this.showToast('success', isEdit ? 'Changes saved.' : 'Donation recorded.');
    this.loadDonations();
  }

  openDeleteModal(donation: Donation, event?: Event): void {
    event?.stopPropagation();
    this.deletingDonation.set(donation);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletingDonation.set(null);
  }

  onDeleteConfirmed(id: number): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.deletingDonation.set(null);
        this.showToast('success', 'Donation deleted.');
        this.loadDonations();
      },
      error: (err: ApiError) => {
        this.showDeleteModal.set(false);
        this.deletingDonation.set(null);
        this.showToast('error', err.detail || 'Could not delete donation.');
      }
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────
  formatCurrency(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPesoCompact(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  private showToast(type: 'success' | 'error', message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    const id = ++this.toastIdCounter;
    const duration = 4000;
    this.toast.set({ id, type, message, duration });
    this.toastTimer = setTimeout(() => this.toast.set(null), duration);
  }

  dismissToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(null);
  }
}