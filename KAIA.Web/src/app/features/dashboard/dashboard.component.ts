import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ItemApiService, ApiError } from '../../core/services/item-api.service';
import { Item } from '../../core/models/item.model';

interface CategoryStat {
  prefix: string;
  label: string;
  color: string;
  count: number;
  totalValue: number;
  percentOfTotal: number;
  donutDash: string;
  donutOffset: number;
}

interface BrandStat {
  brand: string;
  count: number;
  totalValue: number;
}

interface ChartData {
  linePath: string;
  areaPath: string;
  maxValue: number;
  xLabels: { x: number; text: string }[];
  yLabels: { y: number; text: string }[];
  lastPoint: { x: number; y: number };
  hasData: boolean;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  FD: { label: 'Food',      color: '#F08C22' },
  HY: { label: 'Hygiene',   color: '#5BA8B0' },
  ED: { label: 'Education', color: '#6B8CBE' },
  SH: { label: 'Shelter',   color: '#B8D438' },
  MD: { label: 'Medical',   color: '#E04E3C' },
  OT: { label: 'Other',     color: '#E91E8C' }
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ItemApiService);

  readonly items   = signal<Item[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly totalItems    = computed(() => this.items().length);
  readonly totalValue    = computed(() => this.items().reduce((s, i) => s + i.unitPrice, 0));
  readonly categoryCount = computed(() => new Set(this.items().map(i => i.category)).size);
  readonly addedThisWeek = computed(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.items().filter(i => new Date(i.createdAtUtc).getTime() >= cutoff).length;
  });

  readonly averageValue = computed(() => {
    const n = this.items().length;
    return n === 0 ? 0 : this.totalValue() / n;
  });

  readonly topCategory = computed(() => {
    const list = this.items();
    if (list.length === 0) return null;
    const counts = new Map<string, number>();
    for (const i of list) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
    const [prefix, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      prefix,
      label: CATEGORY_META[prefix]?.label ?? prefix,
      color: CATEGORY_META[prefix]?.color ?? '#E91E8C',
      count
    };
  });

  readonly mostExpensiveItem = computed<Item | null>(() => {
    const list = this.items();
    if (list.length === 0) return null;
    return list.reduce((max, i) => i.unitPrice > max.unitPrice ? i : max, list[0]);
  });

  readonly categories = computed<CategoryStat[]>(() => {
    const map = new Map<string, { count: number; totalValue: number }>();
    for (const item of this.items()) {
      const k = item.category || 'OT';
      const e = map.get(k) ?? { count: 0, totalValue: 0 };
      e.count++; e.totalValue += item.unitPrice;
      map.set(k, e);
    }
    const total = this.totalValue() || 1;
    const sorted = Array.from(map.entries())
      .map(([prefix, { count, totalValue }]) => ({
        prefix,
        label: CATEGORY_META[prefix]?.label ?? prefix,
        color: CATEGORY_META[prefix]?.color ?? '#E91E8C',
        count,
        totalValue,
        percentOfTotal: (totalValue / total) * 100
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const CIRC = 226.19;
    let cum = 0;
    return sorted.map(c => {
      const len = (c.percentOfTotal / 100) * CIRC;
      const row = { ...c, donutDash: `${len} ${CIRC - len}`, donutOffset: -cum };
      cum += len;
      return row;
    });
  });

  readonly topBrands = computed<BrandStat[]>(() => {
    const map = new Map<string, { count: number; totalValue: number }>();
    for (const item of this.items()) {
      const e = map.get(item.brand) ?? { count: 0, totalValue: 0 };
      e.count++; e.totalValue += item.unitPrice;
      map.set(item.brand, e);
    }
    return Array.from(map.entries())
      .map(([brand, { count, totalValue }]) => ({ brand, count, totalValue }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  });

  readonly topItems = computed<Item[]>(() =>
    [...this.items()].sort((a, b) => b.unitPrice - a.unitPrice).slice(0, 5)
  );

  readonly chart = computed<ChartData>(() => {
    const empty: ChartData = {
      linePath: '', areaPath: '', maxValue: 0,
      xLabels: [], yLabels: [], lastPoint: { x: 0, y: 0 }, hasData: false
    };

    const items = [...this.items()].sort((a, b) =>
      new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime());

    if (items.length < 2) return empty;

    let cum = 0;
    const points = items.map(i => {
      cum += i.unitPrice;
      return { t: new Date(i.createdAtUtc).getTime(), v: cum };
    });

    const W = 900, H = 260, PAD_X = 48, PAD_Y = 32;
    const max = cum || 1;
    const xMin = points[0].t;
    const xMax = points[points.length - 1].t;
    const xRange = xMax - xMin || 1;

    const coords = points.map(p => ({
      x: PAD_X + ((p.t - xMin) / xRange) * (W - PAD_X - 24),
      y: H - PAD_Y - (p.v / max) * (H - PAD_Y - 24)
    }));

    let line = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i - 1] ?? coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] ?? p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      line += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    const firstX = coords[0].x.toFixed(2);
    const lastX = coords[coords.length - 1].x.toFixed(2);
    const baseline = (H - PAD_Y).toFixed(2);
    const area = `${line} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;

    const fmt = (t: number) => new Date(t).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    const midIdx = Math.floor(points.length / 2);
    const xLabels = [
      { x: coords[0].x, text: fmt(points[0].t) },
      { x: coords[midIdx].x, text: fmt(points[midIdx].t) },
      { x: coords[coords.length - 1].x, text: fmt(points[points.length - 1].t) }
    ];

    const yLabels = [0, 0.33, 0.66, 1].map(f => ({
      y: H - PAD_Y - f * (H - PAD_Y - 24),
      text: this.formatPesoCompact(Math.round(max * f))
    }));

    return {
      linePath: line, areaPath: area, maxValue: max,
      xLabels, yLabels, lastPoint: coords[coords.length - 1], hasData: true
    };
  });

  ngOnInit(): void { this.loadItems(); }

  loadItems(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAll().subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: (err: ApiError) => {
        this.error.set(err.detail || 'Could not load items.');
        this.loading.set(false);
      }
    });
  }

  formatCurrency(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  formatPesoCompact(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  formatPercent(v: number): string { return v.toFixed(1) + '%'; }
}