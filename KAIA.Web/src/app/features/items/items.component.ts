import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ItemApiService, ApiError } from '../../core/services/item-api.service';
import { Item } from '../../core/models/item.model';
import { ItemFormModalComponent } from './item-form.modal';
import { DeleteConfirmModalComponent } from './delete-confirm.modal';

type SortField   = 'name' | 'unitPrice' | 'createdAt';
type SortDir     = 'asc' | 'desc';
type PresetFilter = '' | 'high' | 'budget' | 'recent';

interface Toast { type: 'success' | 'error'; message: string; }

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  FD: { label: 'Food',      color: '#F08C22' },
  HY: { label: 'Hygiene',   color: '#5BA8B0' },
  ED: { label: 'Education', color: '#6B8CBE' },
  SH: { label: 'Shelter',   color: '#B8D438' },
  MD: { label: 'Medical',   color: '#E04E3C' },
  OT: { label: 'Other',     color: '#E91E8C' }
};

const BRANDS_VISIBLE_DEFAULT = 10;

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule, ItemFormModalComponent, DeleteConfirmModalComponent],
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.scss']
})
export class ItemsComponent implements OnInit {
  private readonly api = inject(ItemApiService);

  readonly allItems = signal<Item[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);

  readonly searchQuery    = signal('');
  readonly brandFilter    = signal('');
  readonly categoryFilter = signal('');
  readonly presetFilter   = signal<PresetFilter>('');
  readonly sortBy         = signal<SortField>('createdAt');
  readonly sortDir        = signal<SortDir>('desc');
  readonly page           = signal(1);
  readonly pageSize       = 8;

  // ─── Brands sidebar state ──────────────────────────────────────────
  readonly brandSearchQuery = signal('');
  readonly showAllBrands    = signal(false);

  readonly priceMenuOpen = signal(false);

  readonly editMode      = signal(false);
  readonly selectedIds   = signal<Set<number>>(new Set());
  readonly bulkConfirm   = signal(false);
  readonly bulkDeleting  = signal(false);
  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly showFormModal   = signal(false);
  readonly editingItem     = signal<Item | null>(null);
  readonly showDeleteModal = signal(false);
  readonly deletingItem    = signal<Item | null>(null);

  readonly selectedItem = signal<Item | null>(null);
  readonly toast = signal<Toast | null>(null);
  private toastTimer: any = null;

  readonly brands     = computed(() => Array.from(new Set(this.allItems().map(i => i.brand))).sort());
  readonly categories = computed(() => Array.from(new Set(this.allItems().map(i => i.category))).sort());

  readonly categoryBreakdown = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.allItems()) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    const max = Math.max(...Array.from(counts.values()), 1);
    const total = this.allItems().length || 1;
    return Array.from(counts.entries())
      .map(([prefix, count]) => ({
        prefix,
        label: CATEGORY_META[prefix]?.label ?? prefix,
        color: CATEGORY_META[prefix]?.color ?? '#E91E8C',
        count,
        percentOfTotal: (count / total) * 100,
        barWidth: (count / max) * 100
      }))
      .sort((a, b) => b.count - a.count);
  });

  // ─── Brand breakdown + search filtering ────────────────────────────
  readonly brandBreakdown = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.allItems()) counts.set(item.brand, (counts.get(item.brand) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
  });

  /** Brand list filtered by the sidebar's own search box. */
  readonly filteredBrands = computed(() => {
    const q = this.brandSearchQuery().trim().toLowerCase();
    if (!q) return this.brandBreakdown();
    return this.brandBreakdown().filter(b => b.brand.toLowerCase().includes(q));
  });

  /** The subset actually rendered (top N unless "See all" is on). */
  readonly visibleBrands = computed(() =>
    this.showAllBrands()
      ? this.filteredBrands()
      : this.filteredBrands().slice(0, BRANDS_VISIBLE_DEFAULT)
  );

  readonly hasHiddenBrands = computed(() =>
    this.filteredBrands().length > BRANDS_VISIBLE_DEFAULT && !this.showAllBrands()
  );

  readonly hiddenBrandCount = computed(() =>
    Math.max(0, this.filteredBrands().length - BRANDS_VISIBLE_DEFAULT)
  );

  /** Show "no brands match" hint in the sidebar when search yields nothing. */
  readonly noBrandMatches = computed(() =>
    this.filteredBrands().length === 0 && this.brandSearchQuery().trim().length > 0
  );

  readonly catalogSummary = computed(() => {
    const list = this.allItems();
    const total = list.reduce((s, i) => s + i.unitPrice, 0);
    return { count: list.length, totalValue: total, averageValue: list.length === 0 ? 0 : total / list.length };
  });

  readonly presetCounts = computed(() => {
    const list = this.allItems();
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      high:   list.filter(i => i.unitPrice >= 200).length,
      budget: list.filter(i => i.unitPrice < 50).length,
      recent: list.filter(i => new Date(i.createdAtUtc).getTime() >= cutoff).length
    };
  });

  readonly filteredItems = computed<Item[]>(() => {
    let items = this.allItems();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) items = items.filter(i =>
      i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q));
    if (this.brandFilter())    items = items.filter(i => i.brand === this.brandFilter());
    if (this.categoryFilter()) items = items.filter(i => i.category === this.categoryFilter());

    const preset = this.presetFilter();
    if (preset === 'high')   items = items.filter(i => i.unitPrice >= 200);
    if (preset === 'budget') items = items.filter(i => i.unitPrice < 50);
    if (preset === 'recent') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      items = items.filter(i => new Date(i.createdAtUtc).getTime() >= cutoff);
    }

    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const by = this.sortBy();
    return [...items].sort((a, b) => {
      if (by === 'name')      return a.name.localeCompare(b.name) * dir;
      if (by === 'unitPrice') return (a.unitPrice - b.unitPrice) * dir;
      return (new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime()) * dir;
    });
  });

  readonly totalFiltered = computed(() => this.filteredItems().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalFiltered() / this.pageSize)));
  readonly pagedItems = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredItems().slice(start, start + this.pageSize);
  });

  readonly hasActiveFilters = computed(() =>
    !!this.searchQuery().trim() || !!this.brandFilter() || !!this.categoryFilter() || !!this.presetFilter()
  );

  readonly rangeStart = computed(() => this.totalFiltered() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1);
  readonly rangeEnd = computed(() => Math.min(this.page() * this.pageSize, this.totalFiltered()));

  ngOnInit(): void { this.loadItems(); }

  loadItems(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAll().subscribe({
      next: items => {
        this.allItems.set(items);
        this.loading.set(false);
        const sel = this.selectedItem();
        if (sel) this.selectedItem.set(items.find(i => i.id === sel.id) ?? null);
        const selected = this.selectedIds();
        if (selected.size > 0) {
          const liveIds = new Set(items.map(i => i.id));
          const next = new Set<number>();
          selected.forEach(id => { if (liveIds.has(id)) next.add(id); });
          this.selectedIds.set(next);
        }
      },
      error: (err: ApiError) => {
        this.error.set(err.detail || 'Could not load items.');
        this.loading.set(false);
      }
    });
  }

  onRowClick(item: Item): void {
    if (this.editMode()) this.toggleSelected(item.id);
    else this.selectItem(item);
  }

  selectItem(item: Item): void {
    if (this.selectedItem()?.id === item.id) this.selectedItem.set(null);
    else this.selectedItem.set(item);
  }
  clearSelection(): void { this.selectedItem.set(null); }

  enterEditMode(): void {
    this.editMode.set(true);
    this.selectedItem.set(null);
    this.selectedIds.set(new Set());
    this.bulkConfirm.set(false);
  }
  exitEditMode(): void {
    this.editMode.set(false);
    this.selectedIds.set(new Set());
    this.bulkConfirm.set(false);
  }
  toggleSelected(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedIds.set(next);
    if (next.size === 0) this.bulkConfirm.set(false);
  }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }

  isAllVisibleSelected = computed(() => {
    const rows = this.pagedItems();
    if (rows.length === 0) return false;
    const sel = this.selectedIds();
    return rows.every(r => sel.has(r.id));
  });

  toggleSelectAllVisible(): void {
    const rows = this.pagedItems();
    const sel  = new Set(this.selectedIds());
    if (this.isAllVisibleSelected()) rows.forEach(r => sel.delete(r.id));
    else rows.forEach(r => sel.add(r.id));
    this.selectedIds.set(sel);
    if (sel.size === 0) this.bulkConfirm.set(false);
  }

  requestBulkDelete(): void {
    if (this.selectedCount() === 0) return;
    this.bulkConfirm.set(true);
  }
  cancelBulkDelete(): void { this.bulkConfirm.set(false); }

  confirmBulkDelete(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    this.bulkDeleting.set(true);
    forkJoin(ids.map(id => this.api.delete(id))).subscribe({
      next: () => {
        this.bulkDeleting.set(false);
        this.showToast('success', `${ids.length} ${ids.length === 1 ? 'item' : 'items'} deleted.`);
        this.exitEditMode();
        this.loadItems();
      },
      error: (err: ApiError) => {
        this.bulkDeleting.set(false);
        this.showToast('error', err.detail || 'Some items could not be deleted.');
        this.exitEditMode();
        this.loadItems();
      }
    });
  }

  onSearchInput(value: string): void { this.searchQuery.set(value); this.page.set(1); }

  setSort(field: SortField, dir: SortDir): void {
    this.sortBy.set(field); this.sortDir.set(dir);
    this.priceMenuOpen.set(false); this.page.set(1);
  }
  togglePriceMenu(): void { this.priceMenuOpen.update(v => !v); }
  isSortActive(field: SortField, dir: SortDir): boolean { return this.sortBy() === field && this.sortDir() === dir; }

  // ─── Brand sidebar interactions ────────────────────────────────────
  onBrandSearchInput(value: string): void {
    this.brandSearchQuery.set(value);
    // Collapse "See all" whenever the search changes, so we start small again
    this.showAllBrands.set(false);
  }

  clearBrandSearch(): void {
    this.brandSearchQuery.set('');
    this.showAllBrands.set(false);
  }

  selectBrand(brand: string): void {
    this.brandFilter.set(brand);
    this.page.set(1);
  }

  toggleCategoryFromSidebar(prefix: string): void {
    this.categoryFilter.set(this.categoryFilter() === prefix ? '' : prefix);
    this.page.set(1);
  }

  togglePreset(preset: PresetFilter): void {
    this.presetFilter.set(this.presetFilter() === preset ? '' : preset);
    this.page.set(1);
  }

  clearFilters(): void {
    this.searchQuery.set(''); this.brandFilter.set(''); this.categoryFilter.set('');
    this.presetFilter.set(''); this.page.set(1);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
  }
  nextPage(): void { this.goToPage(this.page() + 1); }
  prevPage(): void { this.goToPage(this.page() - 1); }

  openAddModal(): void { this.editingItem.set(null); this.showFormModal.set(true); }
  openEditModal(item: Item): void { this.editingItem.set(item); this.showFormModal.set(true); }
  onFormClosed(): void { this.showFormModal.set(false); this.editingItem.set(null); }

  onFormSaved(_: Item): void {
    const isEdit = this.editingItem() !== null;
    this.showFormModal.set(false);
    this.editingItem.set(null);
    this.showToast('success', isEdit ? 'Changes saved.' : 'Item added.');
    this.loadItems();
  }

  openDeleteModal(item: Item): void { this.deletingItem.set(item); this.showDeleteModal.set(true); }
  closeDeleteModal(): void { this.showDeleteModal.set(false); this.deletingItem.set(null); }

  onDeleteConfirmed(id: number): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.showDeleteModal.set(false); this.deletingItem.set(null);
        if (this.selectedItem()?.id === id) this.selectedItem.set(null);
        this.showToast('success', 'Item deleted.');
        this.loadItems();
      },
      error: (err: ApiError) => {
        this.showDeleteModal.set(false); this.deletingItem.set(null);
        this.showToast('error', err.detail || 'Could not delete item.');
      }
    });
  }

  private showToast(type: 'success' | 'error', message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ type, message });
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }
  dismissToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  categoryLabel(prefix: string): string { return CATEGORY_META[prefix]?.label ?? prefix; }
  categoryColor(prefix: string): string { return CATEGORY_META[prefix]?.color ?? '#E91E8C'; }

  formatCurrency(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  formatPesoCompact(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}