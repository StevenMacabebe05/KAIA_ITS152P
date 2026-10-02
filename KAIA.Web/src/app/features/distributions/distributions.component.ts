import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DistributionApiService } from '../../core/services/distribution-api.service';
import { CauseApiService } from '../../core/services/cause-api.service';
import { ApiError } from '../../core/services/item-api.service';
import { Distribution } from '../../core/models/distribution.model';
import { Cause } from '../../core/models/cause.model';
import { DistributionFormModalComponent } from './distribution-form.modal';
import { DistributionDeleteConfirmModalComponent } from './delete-confirm.modal';

interface Toast { id: number; type: 'success' | 'error'; message: string; duration: number; }

@Component({
  selector: 'app-distributions',
  standalone: true,
  imports: [CommonModule, FormsModule, DistributionFormModalComponent, DistributionDeleteConfirmModalComponent],
  templateUrl: './distributions.component.html',
  styleUrls: ['./distributions.component.scss']
})
export class DistributionsComponent implements OnInit {
  private readonly api      = inject(DistributionApiService);
  private readonly causeApi = inject(CauseApiService);

  readonly allDistributions = signal<Distribution[]>([]);
  readonly causes           = signal<Cause[]>([]);
  readonly loading          = signal(true);
  readonly error            = signal<string | null>(null);

  readonly searchQuery = signal('');
  readonly causeFilter = signal<number>(0);

  readonly showFormModal          = signal(false);
  readonly editingDistribution    = signal<Distribution | null>(null);
  readonly showDeleteModal        = signal(false);
  readonly deletingDistribution   = signal<Distribution | null>(null);
  readonly expandedId             = signal<number | null>(null);

  readonly toast = signal<Toast | null>(null);
  readonly toastList = computed(() => { const t = this.toast(); return t ? [t] : []; });
  private toastTimer: any = null;
  private toastIdCounter = 0;

  readonly filteredDistributions = computed<Distribution[]>(() => {
    let list = this.allDistributions();

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(d =>
        d.recipient.toLowerCase().includes(q) ||
        d.causeTitle.toLowerCase().includes(q) ||
        d.ngoName.toLowerCase().includes(q) ||
        d.lines.some(l =>
          l.itemName.toLowerCase().includes(q) ||
          l.itemCode.toLowerCase().includes(q)
        )
      );
    }

    const cf = this.causeFilter();
    if (cf > 0) list = list.filter(d => d.causeId === cf);

    return list;
  });

  readonly stats = computed(() => {
    const list = this.allDistributions();
    const totalItems = list.reduce((s, d) =>
      s + d.lines.reduce((ls, l) => ls + l.quantity, 0), 0);
    const uniqueRecipients = new Set(list.map(d => d.recipient)).size;
    return {
      count: list.length,
      totalItems,
      uniqueRecipients,
      avgItems: list.length === 0 ? 0 : totalItems / list.length
    };
  });

  readonly hasActiveFilters = computed(() =>
    !!this.searchQuery().trim() || this.causeFilter() > 0
  );

  ngOnInit(): void {
    this.causeApi.getAll().subscribe({ next: list => this.causes.set(list) });
    this.loadDistributions();
  }

  loadDistributions(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAll().subscribe({
      next: distributions => {
        this.allDistributions.set(distributions);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.error.set(err.message || 'Could not load distributions.');
        this.loading.set(false);
      }
    });
  }

  // Filters
  onSearchInput(v: string): void { this.searchQuery.set(v); }
  onCauseChange(v: number): void { this.causeFilter.set(v); }
  clearFilters(): void {
    this.searchQuery.set('');
    this.causeFilter.set(0);
  }

  // Expand / collapse lines
  toggleExpand(id: number): void {
    this.expandedId.update(cur => cur === id ? null : id);
  }

  // CRUD
  openAddModal(): void {
    this.editingDistribution.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(dist: Distribution, event?: Event): void {
    event?.stopPropagation();
    this.editingDistribution.set(dist);
    this.showFormModal.set(true);
  }

  onFormClosed(): void {
    this.showFormModal.set(false);
    this.editingDistribution.set(null);
  }

  onFormSaved(_: Distribution): void {
    const isEdit = this.editingDistribution() !== null;
    this.showFormModal.set(false);
    this.editingDistribution.set(null);
    this.showToast('success', isEdit ? 'Changes saved.' : 'Distribution recorded.');
    this.loadDistributions();
  }

  openDeleteModal(dist: Distribution, event?: Event): void {
    event?.stopPropagation();
    this.deletingDistribution.set(dist);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletingDistribution.set(null);
  }

  onDeleteConfirmed(id: number): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.deletingDistribution.set(null);
        this.showToast('success', 'Distribution deleted.');
        this.loadDistributions();
      },
      error: (err: ApiError) => {
        this.showDeleteModal.set(false);
        this.deletingDistribution.set(null);
        this.showToast('error', err.message || 'Could not delete distribution.');
      }
    });
  }

  // Helpers
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  totalItemsIn(dist: Distribution): number {
    return dist.lines.reduce((s, l) => s + l.quantity, 0);
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