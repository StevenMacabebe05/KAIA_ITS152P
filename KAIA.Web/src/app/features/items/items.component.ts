import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ItemApiService, ApiError } from '../../core/services/item-api.service';
import { Item } from '../../core/models/item.model';
import { ItemFormModalComponent } from './item-form.modal';
import { DeleteConfirmModalComponent } from './delete-confirm.modal';
import { QrCodeComponent } from '../../shared/qr-code.component';

type SortField    = 'name' | 'unitPrice' | 'createdAt';
type SortDir      = 'asc' | 'desc';
type PresetFilter = '' | 'high' | 'budget' | 'recent';
type ViewMode     = 'table' | 'grid';
type Density      = 'compact' | 'comfortable' | 'spacious';
type ColumnKey    = 'name' | 'code' | 'brand' | 'price';

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
  duration: number;
}

interface AdvancedFilter {
  priceMin: number | null;
  priceMax: number | null;
  categories: Set<string>;
  dateFrom: string;
  dateTo: string;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  FD: { label: 'Food',      color: '#F08C22' },
  HY: { label: 'Hygiene',   color: '#5BA8B0' },
  ED: { label: 'Education', color: '#6B8CBE' },
  SH: { label: 'Shelter',   color: '#B8D438' },
  MD: { label: 'Medical',   color: '#E04E3C' },
  OT: { label: 'Other',     color: '#E91E8C' }
};

const BRANDS_VISIBLE_DEFAULT = 10;
const DEFAULT_COLUMNS: ColumnKey[] = ['name', 'code', 'brand', 'price'];

@Component({
  selector: 'app-items',
  standalone: true,
    imports: [
    CommonModule,
    FormsModule,
    ItemFormModalComponent,
    DeleteConfirmModalComponent,
    QrCodeComponent
  ],
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.scss']
})
export class ItemsComponent implements OnInit {
  private readonly api = inject(ItemApiService);

  // ─── Core data ─────────────────────────────────────────────────────
  readonly allItems = signal<Item[]>([]);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);

  // ─── Filters ───────────────────────────────────────────────────────
  readonly searchQuery    = signal('');
  readonly brandFilter    = signal('');
  readonly categoryFilter = signal('');
  readonly presetFilter   = signal<PresetFilter>('');
  readonly sortBy         = signal<SortField>('createdAt');
  readonly sortDir        = signal<SortDir>('desc');
  readonly page           = signal(1);
  readonly pageSize       = 8;

  readonly brandSearchQuery = signal('');
  readonly showAllBrands    = signal(false);
  readonly priceMenuOpen    = signal(false);

  // ─── Advanced filters (B11) ────────────────────────────────────────
  readonly advancedFilter = signal<AdvancedFilter>({
    priceMin: null, priceMax: null, categories: new Set(), dateFrom: '', dateTo: ''
  });
  readonly draftAdvancedFilter = signal<AdvancedFilter>({
    priceMin: null, priceMax: null, categories: new Set(), dateFrom: '', dateTo: ''
  });
  readonly advancedFilterOpen = signal(false);

  readonly hasAdvancedFilter = computed(() => {
    const f = this.advancedFilter();
    return f.priceMin !== null || f.priceMax !== null ||
           f.categories.size > 0 || f.dateFrom !== '' || f.dateTo !== '';
  });

  // ─── View preferences (B8, B13, B17) ───────────────────────────────
  readonly viewMode = signal<ViewMode>(this.loadPref<ViewMode>('viewMode', 'table'));
  readonly density  = signal<Density>(this.loadPref<Density>('density', 'comfortable'));
  readonly visibleColumns = signal<Set<ColumnKey>>(this.loadColumns());
  readonly columnsOpen = signal(false);

  // ─── Favorites (B16) ───────────────────────────────────────────────
  readonly favoriteIds = signal<Set<number>>(this.loadFavorites());

  // ─── Inline quick-edit (B10) ───────────────────────────────────────
  readonly editingPriceId    = signal<number | null>(null);
  readonly editingPriceValue = signal<number>(0);

  // ─── Row hover preview (B14) ───────────────────────────────────────
  readonly hoveredItem = signal<Item | null>(null);
  readonly hoveredPos  = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // ─── Edit mode ─────────────────────────────────────────────────────
  readonly editMode          = signal(false);
  readonly selectedIds       = signal<Set<number>>(new Set());
  readonly bulkConfirm       = signal(false);
  readonly bulkDeleting      = signal(false);
  readonly bulkCategoryOpen  = signal(false);
  readonly selectedCount     = computed(() => this.selectedIds().size);

  // ─── Modals ────────────────────────────────────────────────────────
  readonly showFormModal   = signal(false);
  readonly editingItem     = signal<Item | null>(null);
  readonly showDeleteModal = signal(false);
  readonly deletingItem    = signal<Item | null>(null);
  readonly selectedItem    = signal<Item | null>(null);

  // ─── Toast ─────────────────────────────────────────────────────────
   readonly toast = signal<Toast | null>(null);

  /** @for wrapper so each new toast gets a fresh DOM node → animations restart */
  readonly toastList = computed(() => {
    const t = this.toast();
    return t ? [t] : [];
  });

  private toastTimer: any = null;
  private toastIdCounter = 0;

  // ─── Derived lists ─────────────────────────────────────────────────
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

  readonly brandBreakdown = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.allItems()) counts.set(item.brand, (counts.get(item.brand) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
  });

  readonly filteredBrands = computed(() => {
    const q = this.brandSearchQuery().trim().toLowerCase();
    if (!q) return this.brandBreakdown();
    return this.brandBreakdown().filter(b => b.brand.toLowerCase().includes(q));
  });

  /** All filtered brands. The visual cap comes from the CSS max-height on .brand-list. */
  readonly visibleBrands = computed(() => this.filteredBrands());

  readonly hasHiddenBrands = computed(() =>
    this.filteredBrands().length > BRANDS_VISIBLE_DEFAULT && !this.showAllBrands()
  );

  readonly noBrandMatches = computed(() =>
    this.filteredBrands().length === 0 && this.brandSearchQuery().trim().length > 0
  );

  readonly catalogSummary = computed(() => {
    const list = this.allItems();
    const total = list.reduce((s, i) => s + i.unitPrice, 0);
    return { count: list.length, totalValue: total };
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

  // ─── Filtered + sorted (favorites float to top) ────────────────────
  readonly filteredItems = computed<Item[]>(() => {
    let items = this.allItems();

    const q = this.searchQuery().trim().toLowerCase();
    if (q) items = items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.code.toLowerCase().includes(q) ||
      i.brand.toLowerCase().includes(q)
    );

    if (this.brandFilter())    items = items.filter(i => i.brand === this.brandFilter());
    if (this.categoryFilter()) items = items.filter(i => i.category === this.categoryFilter());

    const preset = this.presetFilter();
    if (preset === 'high')   items = items.filter(i => i.unitPrice >= 200);
    if (preset === 'budget') items = items.filter(i => i.unitPrice < 50);
    if (preset === 'recent') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      items = items.filter(i => new Date(i.createdAtUtc).getTime() >= cutoff);
    }

    const adv = this.advancedFilter();
    if (adv.priceMin !== null) items = items.filter(i => i.unitPrice >= adv.priceMin!);
    if (adv.priceMax !== null) items = items.filter(i => i.unitPrice <= adv.priceMax!);
    if (adv.categories.size > 0) items = items.filter(i => adv.categories.has(i.category));
    if (adv.dateFrom) {
      const from = new Date(adv.dateFrom).getTime();
      items = items.filter(i => new Date(i.createdAtUtc).getTime() >= from);
    }
    if (adv.dateTo) {
      const to = new Date(adv.dateTo).getTime() + 24 * 60 * 60 * 1000;
      items = items.filter(i => new Date(i.createdAtUtc).getTime() <= to);
    }

    const dir = this.sortDir() === 'asc' ? 1 : -1;
    const by  = this.sortBy();
    const favs = this.favoriteIds();
    return [...items].sort((a, b) => {
      const aFav = favs.has(a.id) ? 1 : 0;
      const bFav = favs.has(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
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
    !!this.searchQuery().trim() ||
    !!this.brandFilter() ||
    !!this.categoryFilter() ||
    !!this.presetFilter() ||
    this.hasAdvancedFilter()
  );

  readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.searchQuery().trim()) n++;
    if (this.brandFilter()) n++;
    if (this.categoryFilter()) n++;
    if (this.presetFilter()) n++;
    const adv = this.advancedFilter();
    if (adv.priceMin !== null || adv.priceMax !== null) n++;
    if (adv.categories.size > 0) n++;
    if (adv.dateFrom || adv.dateTo) n++;
    return n;
  });

  readonly rangeStart = computed(() =>
    this.totalFiltered() === 0 ? 0 : (this.page() - 1) * this.pageSize + 1
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize, this.totalFiltered())
  );

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

  // ─── Row click / hover ─────────────────────────────────────────────
  onRowClick(item: Item): void {
    if (this.editingPriceId() === item.id) return;
    if (this.editMode()) this.toggleSelected(item.id);
    else this.selectItem(item);
  }

  selectItem(item: Item): void {
    this.selectedItem.set(this.selectedItem()?.id === item.id ? null : item);
  }
  clearSelection(): void { this.selectedItem.set(null); }

  onRowHover(item: Item, event: MouseEvent): void {
    if (this.editMode() || this.viewMode() === 'grid') return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.hoveredItem.set(item);
    this.hoveredPos.set({
      x: rect.right + 12,
      y: Math.max(12, rect.top - 8)
    });
  }
  onRowLeave(): void { this.hoveredItem.set(null); }

  // ─── Edit mode ─────────────────────────────────────────────────────
  enterEditMode(): void {
    this.editMode.set(true);
    this.selectedItem.set(null);
    this.selectedIds.set(new Set());
    this.bulkConfirm.set(false);
    this.bulkCategoryOpen.set(false);
  }
  exitEditMode(): void {
    this.editMode.set(false);
    this.selectedIds.set(new Set());
    this.bulkConfirm.set(false);
    this.bulkCategoryOpen.set(false);
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

  // ─── Bulk delete ───────────────────────────────────────────────────
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

  // ─── Bulk category assignment (B9) ─────────────────────────────────
  toggleBulkCategoryMenu(): void { this.bulkCategoryOpen.update(v => !v); }

  assignCategoryToSelected(category: string): void {
    this.bulkCategoryOpen.set(false);
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0 || !category) return;

    const usedCodes = new Set(this.allItems().map(i => i.code));
    let nextNum = 9000;
    const nextCode = () => {
      while (usedCodes.has(`${category}-${nextNum}`)) nextNum++;
      const c = `${category}-${nextNum}`;
      usedCodes.add(c);
      nextNum++;
      return c;
    };

    const requests = ids.map(id => {
      const item = this.allItems().find(i => i.id === id);
      if (!item || item.category === category) return null;
      return this.api.update(id, {
        name: item.name,
        code: nextCode(),
        brand: item.brand,
        unitPrice: item.unitPrice
      });
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    if (requests.length === 0) {
      this.showToast('error', 'Nothing to update.');
      return;
    }

    forkJoin(requests).subscribe({
      next: () => {
        this.showToast('success', `${requests.length} item${requests.length === 1 ? '' : 's'} moved to ${CATEGORY_META[category]?.label ?? category}.`);
        this.exitEditMode();
        this.loadItems();
      },
      error: (err: ApiError) => {
        this.showToast('error', err.detail || 'Some items could not be moved.');
        this.exitEditMode();
        this.loadItems();
      }
    });
  }

  // ─── Inline quick-edit — price (B10) ───────────────────────────────
  startPriceEdit(item: Item, event: Event): void {
    event.stopPropagation();
    this.editingPriceId.set(item.id);
    this.editingPriceValue.set(item.unitPrice);
  }
  cancelPriceEdit(): void { this.editingPriceId.set(null); }

  commitPriceEdit(item: Item): void {
    const newPrice = Number(this.editingPriceValue());
    if (isNaN(newPrice) || newPrice <= 0 || Math.abs(newPrice - item.unitPrice) < 0.001) {
      this.editingPriceId.set(null);
      return;
    }
    const payload = {
      name: item.name, code: item.code, brand: item.brand, unitPrice: newPrice
    };
    this.api.update(item.id, payload).subscribe({
      next: () => {
        this.editingPriceId.set(null);
        this.showToast('success', 'Price updated.');
        this.loadItems();
      },
      error: (err: ApiError) => {
        this.editingPriceId.set(null);
        this.showToast('error', err.detail || 'Could not update price.');
      }
    });
  }

  // ─── Favorites (B16) ───────────────────────────────────────────────
  toggleFavorite(id: number, event: Event): void {
    event.stopPropagation();
    const next = new Set(this.favoriteIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.favoriteIds.set(next);
    try { localStorage.setItem('kaia.favorites', JSON.stringify(Array.from(next))); }
    catch { /* storage disabled */ }
  }
  isFavorite(id: number): boolean { return this.favoriteIds().has(id); }

  private loadFavorites(): Set<number> {
    try {
      const raw = localStorage.getItem('kaia.favorites');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  }

  // ─── View mode / density / columns ─────────────────────────────────
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.savePref('viewMode', mode);
    this.hoveredItem.set(null);
  }
  setDensity(d: Density): void {
    this.density.set(d);
    this.savePref('density', d);
  }
  toggleColumn(key: ColumnKey): void {
    const next = new Set(this.visibleColumns());
    if (next.has(key)) next.delete(key); else next.add(key);
    if (next.size === 0) next.add('name');
    this.visibleColumns.set(next);
    try { localStorage.setItem('kaia.columns', JSON.stringify(Array.from(next))); }
    catch { /* ignore */ }
  }
  isColumnVisible(key: ColumnKey): boolean { return this.visibleColumns().has(key); }
  toggleColumnsMenu(): void { this.columnsOpen.update(v => !v); }

  closeAllMenus(): void {
    this.priceMenuOpen.set(false);
    this.columnsOpen.set(false);
    this.bulkCategoryOpen.set(false);
  }

  // ─── Export CSV (B12) ──────────────────────────────────────────────
  exportCsv(): void {
    const rows = this.filteredItems();
    if (rows.length === 0) {
      this.showToast('error', 'Nothing to export.');
      return;
    }
    const header = ['Name', 'Code', 'Brand', 'Category', 'Unit Price', 'Added'];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...rows.map(i => [
        esc(i.name), esc(i.code), esc(i.brand),
        esc(CATEGORY_META[i.category]?.label ?? i.category),
        i.unitPrice.toFixed(2),
        new Date(i.createdAtUtc).toISOString().slice(0, 10)
      ].join(','))
    ];
    const csv  = '\ufeff' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `KAIA-items-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('success', `${rows.length} item${rows.length === 1 ? '' : 's'} exported.`);
  }

  // ─── Advanced filter drawer (B11) ──────────────────────────────────
  openAdvancedFilter(): void {
    const current = this.advancedFilter();
    this.draftAdvancedFilter.set({
      priceMin: current.priceMin,
      priceMax: current.priceMax,
      categories: new Set(current.categories),
      dateFrom: current.dateFrom,
      dateTo: current.dateTo
    });
    this.advancedFilterOpen.set(true);
  }
  closeAdvancedFilter(): void { this.advancedFilterOpen.set(false); }

  updateDraftFilter(patch: Partial<AdvancedFilter>): void {
    this.draftAdvancedFilter.update(f => ({ ...f, ...patch }));
  }

  toggleDraftCategory(cat: string): void {
    const next = new Set(this.draftAdvancedFilter().categories);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    this.draftAdvancedFilter.update(f => ({ ...f, categories: next }));
  }

  applyDraftFilter(): void {
    const d = this.draftAdvancedFilter();
    this.advancedFilter.set({
      priceMin: d.priceMin,
      priceMax: d.priceMax,
      categories: new Set(d.categories),
      dateFrom: d.dateFrom,
      dateTo: d.dateTo
    });
    this.page.set(1);
    this.advancedFilterOpen.set(false);
  }

  clearAdvancedFilter(): void {
    const empty: AdvancedFilter = {
      priceMin: null, priceMax: null, categories: new Set(), dateFrom: '', dateTo: ''
    };
    this.advancedFilter.set(empty);
    this.draftAdvancedFilter.set({ ...empty, categories: new Set() });
    this.page.set(1);
  }

  // ─── Simple filters ────────────────────────────────────────────────
  onSearchInput(value: string): void { this.searchQuery.set(value); this.page.set(1); }
  onBrandSearchInput(value: string): void {
    this.brandSearchQuery.set(value);
    this.showAllBrands.set(false);
  }
  clearBrandSearch(): void {
    this.brandSearchQuery.set('');
    this.showAllBrands.set(false);
  }
  selectBrand(brand: string): void { this.brandFilter.set(brand); this.page.set(1); }
  toggleCategoryFromSidebar(prefix: string): void {
    this.categoryFilter.set(this.categoryFilter() === prefix ? '' : prefix);
    this.page.set(1);
  }
  togglePreset(preset: PresetFilter): void {
    this.presetFilter.set(this.presetFilter() === preset ? '' : preset);
    this.page.set(1);
  }
  setSort(field: SortField, dir: SortDir): void {
    this.sortBy.set(field); this.sortDir.set(dir);
    this.priceMenuOpen.set(false); this.page.set(1);
  }
  togglePriceMenu(): void { this.priceMenuOpen.update(v => !v); }
  isSortActive(field: SortField, dir: SortDir): boolean {
    return this.sortBy() === field && this.sortDir() === dir;
  }
  clearFilters(): void {
    this.searchQuery.set('');
    this.brandFilter.set('');
    this.categoryFilter.set('');
    this.presetFilter.set('');
    this.clearAdvancedFilter();
    this.page.set(1);
  }

  // ─── Pagination ────────────────────────────────────────────────────
  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
  }
  nextPage(): void { this.goToPage(this.page() + 1); }
  prevPage(): void { this.goToPage(this.page() - 1); }

  // ─── Modals ────────────────────────────────────────────────────────
  openAddModal(): void { this.editingItem.set(null); this.showFormModal.set(true); }
  openEditModal(item: Item, event?: Event): void {
    event?.stopPropagation();
    this.editingItem.set(item);
    this.showFormModal.set(true);
  }
  onFormClosed(): void { this.showFormModal.set(false); this.editingItem.set(null); }

  onFormSaved(_: Item): void {
    const isEdit = this.editingItem() !== null;
    this.showFormModal.set(false);
    this.editingItem.set(null);
    this.showToast('success', isEdit ? 'Changes saved.' : 'Item added.');
    this.loadItems();
  }

  openDeleteModal(item: Item, event?: Event): void {
    event?.stopPropagation();
    this.deletingItem.set(item);
    this.showDeleteModal.set(true);
  }
  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletingItem.set(null);
  }
  onDeleteConfirmed(id: number): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.deletingItem.set(null);
        if (this.selectedItem()?.id === id) this.selectedItem.set(null);
        this.showToast('success', 'Item deleted.');
        this.loadItems();
      },
      error: (err: ApiError) => {
        this.showDeleteModal.set(false);
        this.deletingItem.set(null);
        this.showToast('error', err.detail || 'Could not delete item.');
      }
    });
  }

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
  categoryLabel(prefix: string): string { return CATEGORY_META[prefix]?.label ?? prefix; }
  categoryColor(prefix: string): string { return CATEGORY_META[prefix]?.color ?? '#E91E8C'; }

  initials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  formatCurrency(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  formatPesoCompact(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private loadPref<T extends string>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem('kaia.' + key);
      return (v as T) || fallback;
    } catch { return fallback; }
  }
  private savePref(key: string, value: string): void {
    try { localStorage.setItem('kaia.' + key, value); } catch { /* ignore */ }
  }
  private loadColumns(): Set<ColumnKey> {
    try {
      const raw = localStorage.getItem('kaia.columns');
      if (!raw) return new Set(DEFAULT_COLUMNS);
      const parsed = JSON.parse(raw) as ColumnKey[];
      return parsed.length > 0 ? new Set(parsed) : new Set(DEFAULT_COLUMNS);
    } catch { return new Set(DEFAULT_COLUMNS); }
  }
}

