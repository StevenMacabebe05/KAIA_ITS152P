import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DonorApiService } from '../../core/services/donor-api.service';
import { ApiError } from '../../core/services/item-api.service';
import { Donor, DonorType } from '../../core/models/donor.model';
import { DonorFormModalComponent } from './donor-form.modal';
import { DonorDeleteConfirmModalComponent } from './delete-confirm.modal';

type TypeFilter = '' | DonorType;

interface Toast { id: number; type: 'success' | 'error'; message: string; duration: number; }

@Component({
  selector: 'app-donors',
  standalone: true,
  imports: [CommonModule, FormsModule, DonorFormModalComponent, DonorDeleteConfirmModalComponent],
  templateUrl: './donors.component.html',
  styleUrls: ['./donors.component.scss']
})
export class DonorsComponent implements OnInit {
  private readonly api = inject(DonorApiService);

  readonly allDonors = signal<Donor[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);

  readonly searchQuery = signal('');
  readonly typeFilter  = signal<TypeFilter>('');

  readonly showFormModal   = signal(false);
  readonly editingDonor    = signal<Donor | null>(null);
  readonly showDeleteModal = signal(false);
  readonly deletingDonor   = signal<Donor | null>(null);

  readonly toast = signal<Toast | null>(null);
  readonly toastList = computed(() => { const t = this.toast(); return t ? [t] : []; });
  private toastTimer: any = null;
  private toastIdCounter = 0;

  readonly filteredDonors = computed<Donor[]>(() => {
    let list = this.allDonors();

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.email ?? '').toLowerCase().includes(q) ||
        (d.phone ?? '').toLowerCase().includes(q)
      );
    }

    const tf = this.typeFilter();
    if (tf) list = list.filter(d => d.type === tf);

    return list;
  });

  readonly counts = computed(() => {
    const list = this.allDonors();
    return {
      total:        list.length,
      individuals:  list.filter(d => d.type === 'Individual').length,
      organizations: list.filter(d => d.type === 'Organization').length
    };
  });

  readonly hasActiveFilters = computed(() =>
    !!this.searchQuery().trim() || !!this.typeFilter()
  );

  ngOnInit(): void { this.loadDonors(); }

  loadDonors(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAll().subscribe({
      next: donors => {
        this.allDonors.set(donors);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.detail || 'Could not load donors.');
        this.loading.set(false);
      }
    });
  }

  // ─── Filters ───────────────────────────────────────────────────────
  onSearchInput(value: string): void { this.searchQuery.set(value); }
  onTypeChange(value: TypeFilter): void { this.typeFilter.set(value); }
  clearFilters(): void {
    this.searchQuery.set('');
    this.typeFilter.set('');
  }

  // ─── Add / Edit / Delete ───────────────────────────────────────────
  openAddModal(): void {
    this.editingDonor.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(donor: Donor, event?: Event): void {
    event?.stopPropagation();
    this.editingDonor.set(donor);
    this.showFormModal.set(true);
  }

  onFormClosed(): void {
    this.showFormModal.set(false);
    this.editingDonor.set(null);
  }

  onFormSaved(_: Donor): void {
    const isEdit = this.editingDonor() !== null;
    this.showFormModal.set(false);
    this.editingDonor.set(null);
    this.showToast('success', isEdit ? 'Changes saved.' : 'Donor added.');
    this.loadDonors();
  }

  openDeleteModal(donor: Donor, event?: Event): void {
    event?.stopPropagation();
    this.deletingDonor.set(donor);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletingDonor.set(null);
  }

  onDeleteConfirmed(id: number): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.deletingDonor.set(null);
        this.showToast('success', 'Donor deleted.');
        this.loadDonors();
      },
      error: (err: ApiError) => {
        this.showDeleteModal.set(false);
        this.deletingDonor.set(null);
        this.showToast('error', err.detail || 'Could not delete donor.');
      }
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────
  initials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  typeClass(type: DonorType): string {
    return 'type-pill--' + type.toLowerCase();
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