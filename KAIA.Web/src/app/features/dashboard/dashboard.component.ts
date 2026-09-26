import {
  Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toPng } from 'html-to-image';
import { ItemApiService, ApiError } from '../../core/services/item-api.service';
import { Item } from '../../core/models/item.model';
import { CountUpDirective } from '../../core/directives/count-up.directive';

// ─── Interfaces ──────────────────────────────────────────────────────
interface CategoryStat {
  prefix: string;
  label: string;
  color: string;
  colorDark: string;     
  count: number;
  totalValue: number;
  percentOfTotal: number;
  donutDash: string;
  donutOffset: number;
}
interface BrandStat {
  brand: string; count: number; totalValue: number;
}

interface ChartData {
  linePath: string; areaPath: string; maxValue: number;
  xLabels: { x: number; text: string }[];
  yLabels: { y: number; text: string }[];
  lastPoint: { x: number; y: number };
  hasData: boolean;
}

interface WeeklyBucket {
  weekStartMs: number;
  label: string;
  count: number;
  percentOfMax: number;
}

interface CategorySparkline {
  prefix: string; label: string; color: string;
  path: string; lastValue: number;
}

interface ImpactItem {
  icon: 'heart' | 'utensils' | 'shield' | 'book';
  headline: string;
  sub: string;
}

interface Trend {
  direction: 'up' | 'down' | 'flat' | 'new';
  percent: number;
}

interface HeroSlide {
  image: string;
  alt: string;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  FD: { label: 'Food',      color: '#F08C22' },
  HY: { label: 'Hygiene',   color: '#5BA8B0' },
  ED: { label: 'Education', color: '#6B8CBE' },
  SH: { label: 'Shelter',   color: '#B8D438' },
  MD: { label: 'Medical',   color: '#E04E3C' },
  OT: { label: 'Other',     color: '#E91E8C' }
};

const DAY  = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

const HERO_SLIDE_DURATION_MS = 5000;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink,CountUpDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ItemApiService);

  @ViewChild('dashboardRoot', { static: false })
  dashboardRoot?: ElementRef<HTMLDivElement>;

  readonly items     = signal<Item[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly exporting = signal(false);

  // ─── Hero carousel ─────────────────────────────────────────────────
  /** Add or reorder slides here. Files live in KAIA.Web/public/hero/. */
  readonly heroSlides: HeroSlide[] = [
    { image: 'hero/hero-1.jpg', alt: 'Volunteers packing relief goods' },
    { image: 'hero/hero-2.jpg', alt: 'Community outreach' },
    { image: 'hero/hero-3.jpg', alt: 'School supplies distribution' }
  ];

  readonly heroIndex = signal(0);
  private heroTimer: any = null;

  // ─── Headline metrics ──────────────────────────────────────────────
  readonly totalItems    = computed(() => this.items().length);
  readonly totalValue    = computed(() => this.items().reduce((s, i) => s + i.unitPrice, 0));
  readonly categoryCount = computed(() => new Set(this.items().map(i => i.category)).size);
  readonly brandCount    = computed(() => new Set(this.items().map(i => i.brand)).size);

  readonly addedThisWeek = computed(() => {
    const cutoff = Date.now() - 7 * DAY;
    return this.items().filter(i => new Date(i.createdAtUtc).getTime() >= cutoff).length;
  });

  readonly lastUpdated = computed(() => {
    if (this.items().length === 0) return '—';
    const max = Math.max(...this.items().map(i => new Date(i.createdAtUtc).getTime()));
    return new Date(max).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  });

  // ─── Trends ────────────────────────────────────────────────────────
  readonly itemsTrend = computed<Trend>(() => {
    const now = Date.now();
    const curr = this.items().filter(i => new Date(i.createdAtUtc).getTime() >= now - 30 * DAY).length;
    const prev = this.items().filter(i => {
      const t = new Date(i.createdAtUtc).getTime();
      return t >= now - 60 * DAY && t < now - 30 * DAY;
    }).length;
    return this.computeTrend(curr, prev);
  });

  readonly valueTrend = computed<Trend>(() => {
    const now = Date.now();
    const curr = this.items()
      .filter(i => new Date(i.createdAtUtc).getTime() >= now - 30 * DAY)
      .reduce((s, i) => s + i.unitPrice, 0);
    const prev = this.items()
      .filter(i => {
        const t = new Date(i.createdAtUtc).getTime();
        return t >= now - 60 * DAY && t < now - 30 * DAY;
      })
      .reduce((s, i) => s + i.unitPrice, 0);
    return this.computeTrend(curr, prev);
  });

  readonly categoriesTrend = computed<Trend>(() => {
    const now = Date.now();
    const curr = new Set(
      this.items()
        .filter(i => new Date(i.createdAtUtc).getTime() >= now - 30 * DAY)
        .map(i => i.category)
    ).size;
    const prev = new Set(
      this.items()
        .filter(i => {
          const t = new Date(i.createdAtUtc).getTime();
          return t >= now - 60 * DAY && t < now - 30 * DAY;
        })
        .map(i => i.category)
    ).size;
    return this.computeTrend(curr, prev);
  });

  readonly weekTrend = computed<Trend>(() => {
    const now = Date.now();
    const curr = this.items().filter(i => new Date(i.createdAtUtc).getTime() >= now - 7 * DAY).length;
    const prev = this.items().filter(i => {
      const t = new Date(i.createdAtUtc).getTime();
      return t >= now - 14 * DAY && t < now - 7 * DAY;
    }).length;
    return this.computeTrend(curr, prev);
  });

  private computeTrend(current: number, previous: number): Trend {
    if (previous === 0 && current === 0) return { direction: 'flat', percent: 0 };
    if (previous === 0) return { direction: 'new', percent: 100 };
    const delta = ((current - previous) / previous) * 100;
    if (Math.abs(delta) < 1) return { direction: 'flat', percent: 0 };
    return { direction: delta > 0 ? 'up' : 'down', percent: Math.abs(delta) };
  }

  // ─── Weekly buckets ────────────────────────────────────────────────
  readonly weeklyBuckets = computed<WeeklyBucket[]>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dow = today.getDay() || 7;
    const monday = new Date(today.getTime() - (dow - 1) * DAY);

    const buckets: { weekStartMs: number; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      buckets.push({ weekStartMs: monday.getTime() - i * WEEK, count: 0 });
    }

    for (const item of this.items()) {
      const t = new Date(item.createdAtUtc).getTime();
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (t >= buckets[i].weekStartMs) { buckets[i].count++; break; }
      }
    }

    const max = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map(b => ({
      weekStartMs: b.weekStartMs,
      label: new Date(b.weekStartMs).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      count: b.count,
      percentOfMax: (b.count / max) * 100
    }));
  });

  // ─── Category sparklines ──────────────────────────────────────────
  readonly categorySparklines = computed<CategorySparkline[]>(() => {
    const cats = Array.from(new Set(this.items().map(i => i.category))).sort();
    if (cats.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dow = today.getDay() || 7;
    const monday = new Date(today.getTime() - (dow - 1) * DAY);
    const WEEKS = 8;

    const series = cats.map(prefix => ({
      prefix,
      points: new Array(WEEKS).fill(0) as number[]
    }));

    for (const item of this.items()) {
      const t = new Date(item.createdAtUtc).getTime();
      const weeksAgo = Math.floor((monday.getTime() - t) / WEEK);
      const idx = WEEKS - 1 - weeksAgo;
      if (idx >= 0 && idx < WEEKS) {
        const s = series.find(x => x.prefix === item.category);
        if (s) s.points[idx]++;
      }
    }

    for (const s of series) {
      for (let i = 1; i < WEEKS; i++) s.points[i] += s.points[i - 1];
    }

    const globalMax = Math.max(...series.flatMap(s => s.points), 1);
    const W = 100, H = 28, PAD = 2;
    const xStep = (W - 2 * PAD) / (WEEKS - 1);
    const yScale = (H - 2 * PAD) / globalMax;

    return series.map(s => {
      const pts = s.points.map((v, i) => ({
        x: PAD + i * xStep,
        y: H - PAD - v * yScale
      }));
      const path = pts.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
      ).join(' ');

      return {
        prefix: s.prefix,
        label: CATEGORY_META[s.prefix]?.label ?? s.prefix,
        color: CATEGORY_META[s.prefix]?.color ?? '#E91E8C',
        path,
        lastValue: s.points[s.points.length - 1]
      };
    });
  });

  getSparkline(prefix: string): CategorySparkline | null {
    return this.categorySparklines().find(s => s.prefix === prefix) ?? null;
  }

  // ─── Impact strip ─────────────────────────────────────────────────
  readonly impactStrip = computed<ImpactItem[]>(() => {
    const list = this.items();
    if (list.length === 0) return [];

    const total = this.totalValue();
    const reliefPackCost = 500;
    const reliefPacks = Math.floor(total / reliefPackCost);
    const meals = Math.floor(total / 50);
    const hygieneCount = list.filter(i => i.category === 'HY').length;
    const educationCount = list.filter(i => i.category === 'ED').length;

    return [
      { icon: 'heart',    headline: `≈ ${reliefPacks.toLocaleString()} relief packs`, sub: `at ₱${reliefPackCost} per pack` },
      { icon: 'utensils', headline: `≈ ${meals.toLocaleString()} meals`,             sub: 'at ₱50 per meal' },
      { icon: 'shield',   headline: `${hygieneCount} hygiene suppl${hygieneCount === 1 ? 'y' : 'ies'}`, sub: 'ready to distribute' },
      { icon: 'book',     headline: `${educationCount} education item${educationCount === 1 ? '' : 's'}`, sub: 'for students & schools' }
    ];
  });

  // ─── Donut categories ──────────────────────────────────────────────
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
      .map(([prefix, { count, totalValue }]) => {
        const base = CATEGORY_META[prefix]?.color ?? '#E91E8C';
        return {
          prefix,
          label: CATEGORY_META[prefix]?.label ?? prefix,
          color: base,
          colorDark: this.darkenHex(base, 0.72),
          count,
          totalValue,
          percentOfTotal: (totalValue / total) * 100
        };
      })
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

  // ─── Cumulative area chart ─────────────────────────────────────────
  readonly chart = computed<ChartData>(() => {
    const empty: ChartData = {
      linePath: '', areaPath: '', maxValue: 0,
      xLabels: [], yLabels: [], lastPoint: { x: 0, y: 0 }, hasData: false
    };
    const list = [...this.items()].sort((a, b) =>
      new Date(a.createdAtUtc).getTime() - new Date(b.createdAtUtc).getTime());
    if (list.length < 2) return empty;

    let cum = 0;
    const points = list.map(i => {
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

  // ─── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadItems();
    this.startHeroCarousel();
  }

  ngOnDestroy(): void {
    this.stopHeroCarousel();
  }

  // ─── Hero carousel logic ───────────────────────────────────────────
  startHeroCarousel(): void {
    this.stopHeroCarousel();
    this.heroTimer = setInterval(() => {
      this.heroIndex.update(i => (i + 1) % this.heroSlides.length);
    }, HERO_SLIDE_DURATION_MS);
  }

  stopHeroCarousel(): void {
    if (this.heroTimer) {
      clearInterval(this.heroTimer);
      this.heroTimer = null;
    }
  }

  setHeroSlide(index: number): void {
    this.heroIndex.set(index);
    this.startHeroCarousel();
  }

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

  // ─── Export PNG ────────────────────────────────────────────────────
  async exportAsPng(): Promise<void> {
    const el = this.dashboardRoot?.nativeElement;
    if (!el) return;

    this.exporting.set(true);
    try {
      await new Promise(r => setTimeout(r, 120));

      const dataUrl = await toPng(el, {
        backgroundColor: '#F8FAFC',
        pixelRatio: 2,
        cacheBust: true
      });

      const link = document.createElement('a');
      link.download = `KAIA-dashboard-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export failed', err);
    } finally {
      this.exporting.set(false);
    }
  }

  // ─── Formatting ────────────────────────────────────────────────────
  formatCurrency(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPesoCompact(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  formatPercent(v: number): string { return v.toFixed(1) + '%'; }

  trendLabel(t: Trend): string {
    if (t.direction === 'new')  return 'New';
    if (t.direction === 'flat') return 'Flat';
    return `${t.direction === 'up' ? '↑' : '↓'} ${t.percent.toFixed(0)}%`;
  }
    /** Returns a darker version of a hex color by scaling each RGB channel. */
  private darkenHex(hex: string, factor: number): string {
    const c = hex.replace('#', '');
    const r = Math.max(0, Math.round(parseInt(c.substring(0, 2), 16) * factor));
    const g = Math.max(0, Math.round(parseInt(c.substring(2, 4), 16) * factor));
    const b = Math.max(0, Math.round(parseInt(c.substring(4, 6), 16) * factor));
    return '#' + [r, g, b]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  }
}