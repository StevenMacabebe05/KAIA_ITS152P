import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CauseApiService } from '../../core/services/cause-api.service';
import { NgoApiService } from '../../core/services/ngo-api.service';
import { ApiError } from '../../core/services/item-api.service';
import { Cause, CauseStatus, NgoOption } from '../../core/models/cause.model';
import { CauseFormModalComponent } from './cause-form.modal';
import { CauseDeleteConfirmModalComponent } from './delete-confirm.modal';

type StatusFilter = '' | CauseStatus;

interface Toast { id: number; type: 'success' | 'error'; message: string; duration: number; }

@Component({
  selector: 'app-causes',
  standalone: true,
  imports: [CommonModule, FormsModule, CauseFormModalComponent, CauseDeleteConfirmModalComponent],
  templateUrl: './causes.component.html',
  styleUrls: ['./causes.component.scss']
})
export class CausesComponent implements OnInit {
  private readonly api    = inject(CauseApiService);
  private readonly ngoApi = inject(NgoApiService);

  readonly allCauses = signal<Cause[]>([]);
  readonly ngos      = signal<NgoOption[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);

  readonly searchQuery   = signal('');
  readonly statusFilter  = signal<StatusFilter>('');
  readonly ngoFilter     = signal<number>(0);   // 0 = all NGOs

  readonly showFormModal   = signal(false);
  readonly editingCause    = signal<Cause | null>(null);
  readonly showDeleteModal = signal(false);
  readonly deletingCause   = signal<Cause | null>(null);

  readonly toast = signal<Toast | null>(null);
  readonly toastList = computed(() => { const t = this.toast(); return t ? [t] : []; });
  private toastTimer: any = null;
  private toastIdCounter = 0;

  readonly filteredCauses = computed<Cause[]>(() => {
    let list = this.allCauses();

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        c.ngoName.toLowerCase().includes(q)
      );
    }

    const sf = this.statusFilter();
    if (sf) list = list.filter(c => c.status === sf);

    const nf = this.ngoFilter();
    if (nf > 0) list = list.filter(c => c.ngoId === nf);

    return list;
  });

  readonly counts = computed(() => {
    const list = this.allCauses();
    return {
      total:     list.length,
      active:    list.filter(c => c.status === 'Active').length,
      completed: list.filter(c => c.status === 'Completed').length,
      cancelled: list.filter(c => c.status === 'Cancelled').length
    };
  });

  readonly hasActiveFilters = computed(() =>
    !!this.searchQuery().trim() || !!this.statusFilter() || this.ngoFilter() > 0
  );

  ngOnInit(): void {
    this.loadNgos();
    this.loadCauses();
  }

  loadNgos(): void {
    this.ngoApi.getAll().subscribe({
      next: list => this.ngos.set(list.map(n => ({ id: n.id, name: n.name }))),
      error: () => { /* silent — dropdown just stays empty */ }
    });
  }

  loadCauses(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getAll().subscribe({
      next: causes => {
        this.allCauses.set(causes);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.detail || 'Could not load causes.');
        this.loading.set(false);
      }
    });
  }

  // ─── Filters ───────────────────────────────────────────────────────
  onSearchInput(value: string): void { this.searchQuery.set(value); }
  onStatusChange(value: StatusFilter): void { this.statusFilter.set(value); }
  onNgoChange(value: number): void { this.ngoFilter.set(value); }
  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.ngoFilter.set(0);
  }

  // ─── Add / Edit / Delete ───────────────────────────────────────────
  openAddModal(): void {
    this.editingCause.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(cause: Cause, event?: Event): void {
    event?.stopPropagation();
    this.editingCause.set(cause);
    this.showFormModal.set(true);
  }

  onFormClosed(): void {
    this.showFormModal.set(false);
    this.editingCause.set(null);
  }

  onFormSaved(_: Cause): void {
    const isEdit = this.editingCause() !== null;
    this.showFormModal.set(false);
    this.editingCause.set(null);
    this.showToast('success', isEdit ? 'Changes saved.' : 'Cause added.');
    this.loadCauses();
  }

  openDeleteModal(cause: Cause, event?: Event): void {
    event?.stopPropagation();
    this.deletingCause.set(cause);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletingCause.set(null);
  }

  onDeleteConfirmed(id: number): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.deletingCause.set(null);
        this.showToast('success', 'Cause deleted.');
        this.loadCauses();
      },
      error: (err: ApiError) => {
        this.showDeleteModal.set(false);
        this.deletingCause.set(null);
        this.showToast('error', err.detail || 'Could not delete cause.');
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

  daysRemaining(deadline: string): number {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  deadlineLabel(deadline: string): string {
    const days = this.daysRemaining(deadline);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  statusClass(status: CauseStatus): string {
    return 'status-pill--' + status.toLowerCase();
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