import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgoApiService } from '../../core/services/ngo-api.service';
import { ApiError } from '../../core/services/item-api.service';
import { Ngo, NgoVerificationStatus } from '../../core/models/ngo.model';
import { NgoFormModalComponent } from './ngo-form.modal';
import { NgoDeleteConfirmModalComponent } from './delete-confirm.modal';

type StatusFilter = '' | NgoVerificationStatus;

interface Toast { id: number; type: 'success' | 'error'; message: string; duration: number; }

@Component({
  selector: 'app-ngos',
  standalone: true,
  imports: [CommonModule, FormsModule, NgoFormModalComponent, NgoDeleteConfirmModalComponent],
  templateUrl: './ngos.component.html',
  styleUrls: ['./ngos.component.scss']
})
export class NgosComponent implements OnInit {
  private readonly api = inject(NgoApiService);

  readonly allNgos = signal<Ngo[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly searchQuery  = signal('');
  readonly statusFilter = signal<StatusFilter>('');

  readonly showFormModal     = signal(false);
  readonly editingNgo        = signal<Ngo | null>(null);
  readonly showDeleteModal   = signal(false);
  readonly deletingNgo       = signal<Ngo | null>(null);
  readonly statusMenuOpenId  = signal<number | null>(null);

  readonly toast = signal<Toast | null>(null);
  readonly toastList = computed(() => {
    const t = this.toast();
    return t ? [t] : [];
  });
  private toastTimer: any = null;
  private toastIdCounter = 0;

  readonly filteredNgos = computed<Ngo[]>(() => {
    let list = this.allNgos();

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(n =>
        n.name.toLowerCase().includes(q) ||
        (n.contactEmail ?? '').toLowerCase().includes(q) ||
        (n.description ?? '').toLowerCase().includes(q)
      );
    }

    const sf = this.statusFilter();
    if (sf) list = list.filter(n => n.verificationStatus === sf);

    return list;
  });

  readonly counts = computed(() => {
    const list = this.allNgos();
    return {
      total:    list.length,
      verified: list.filter(n => n.verificationStatus === 'Verified').length,
      pending:  list.filter(n => n.verificationStatus === 'Pending').length,
      rejected: list.filter(n => n.verificationStatus === 'Rejected').length
    };
  });

  readonly hasActiveFilters = computed(() =>
    !!this.searchQuery().trim() || !!this.statusFilter()
  );

  ngOnInit(): void { this.loadNgos(); }

  loadNgos(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAll().subscribe({
      next: ngos => {
        this.allNgos.set(ngos);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.detail || 'Could not load NGOs.');
        this.loading.set(false);
      }
    });
  }

  // ─── Filters ───────────────────────────────────────────────────────
  onSearchInput(value: string): void { this.searchQuery.set(value); }
  onStatusChange(value: StatusFilter): void { this.statusFilter.set(value); }
  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
  }

  // ─── Add / Edit ────────────────────────────────────────────────────
  openAddModal(): void {
    this.editingNgo.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(ngo: Ngo, event?: Event): void {
    event?.stopPropagation();
    this.editingNgo.set(ngo);
    this.showFormModal.set(true);
  }

  onFormClosed(): void {
    this.showFormModal.set(false);
    this.editingNgo.set(null);
  }

  onFormSaved(_: Ngo): void {
    const isEdit = this.editingNgo() !== null;
    this.showFormModal.set(false);
    this.editingNgo.set(null);
    this.showToast('success', isEdit ? 'Changes saved.' : 'NGO added.');
    this.loadNgos();
  }

  // ─── Delete ────────────────────────────────────────────────────────
  openDeleteModal(ngo: Ngo, event?: Event): void {
    event?.stopPropagation();
    this.deletingNgo.set(ngo);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletingNgo.set(null);
  }

  onDeleteConfirmed(id: number): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.deletingNgo.set(null);
        this.showToast('success', 'NGO deleted.');
        this.loadNgos();
      },
      error: (err: ApiError) => {
        this.showDeleteModal.set(false);
        this.deletingNgo.set(null);
        this.showToast('error', err.detail || 'Could not delete NGO.');
      }
    });
  }

  // ─── Verification status ───────────────────────────────────────────
  toggleStatusMenu(ngo: Ngo, event: Event): void {
    event.stopPropagation();
    this.statusMenuOpenId.update(current => current === ngo.id ? null : ngo.id);
  }

  setStatus(ngo: Ngo, status: NgoVerificationStatus, event: Event): void {
    event.stopPropagation();
    this.statusMenuOpenId.set(null);

    if (ngo.verificationStatus === status) return;

    this.api.updateVerification(ngo.id, { verificationStatus: status }).subscribe({
      next: updated => {
        this.showToast('success', `${updated.name} is now ${status}.`);
        this.loadNgos();
      },
      error: (err: ApiError) => {
        this.showToast('error', err.detail || 'Could not update status.');
      }
    });
  }

  closeAllMenus(): void { this.statusMenuOpenId.set(null); }

  // ─── Toast ─────────────────────────────────────────────────────────
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

  // ─── Helpers ───────────────────────────────────────────────────────
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  statusClass(status: NgoVerificationStatus): string {
    return 'status-pill--' + status.toLowerCase();
  }
}