import {
  Component, OnInit, computed, inject, signal, viewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toPng } from 'html-to-image';
import { ReportApiService } from '../../core/services/report-api.service';
import { ApiError } from '../../core/services/item-api.service';
import {
  DonationReport,
  InventoryReport,
  DistributionReport,
  CauseProgress
} from '../../core/models/report.model';

type TabKey = 'donations' | 'inventory' | 'distributions' | 'causes';
type CauseStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';
type ViewMode = 'list' | 'grid';

interface Tab { key: TabKey; label: string; }
interface CauseStatusTab { key: CauseStatusFilter; label: string; count: number; }

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  private readonly api = inject(ReportApiService);

  readonly reportRoot = viewChild<ElementRef<HTMLElement>>('reportRoot');

  readonly tabs: Tab[] = [
    { key: 'donations',     label: 'Donations' },
    { key: 'inventory',     label: 'Inventory' },
    { key: 'distributions', label: 'Distributions' },
    { key: 'causes',        label: 'Cause progress' }
  ];

  readonly activeTab = signal<TabKey>('donations');

  readonly donationReport     = signal<DonationReport | null>(null);
  readonly inventoryReport    = signal<InventoryReport | null>(null);
  readonly distributionReport = signal<DistributionReport | null>(null);
  readonly causeProgress      = signal<CauseProgress[]>([]);

  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly exporting = signal(false);

  // ─── Cause tab: filter + search + view ─────────────────────────────
  readonly causeStatusFilter = signal<CauseStatusFilter>('all');
  readonly causeSearchQuery  = signal('');
  readonly causeViewMode     = signal<ViewMode>('list');

  readonly causeStatusTabs = computed<CauseStatusTab[]>(() => {
    const list = this.causeProgress();
    return [
      { key: 'all',       label: 'All',       count: list.length },
      { key: 'active',    label: 'Active',    count: list.filter(c => c.status === 'Active').length },
      { key: 'completed', label: 'Completed', count: list.filter(c => c.status === 'Completed').length },
      { key: 'cancelled', label: 'Cancelled', count: list.filter(c => c.status === 'Cancelled').length }
    ];
  });

  readonly filteredCauses = computed<CauseProgress[]>(() => {
    let list = this.causeProgress();

    const filter = this.causeStatusFilter();
    if (filter !== 'all') {
      list = list.filter(c => c.status.toLowerCase() === filter);
    }

    const q = this.causeSearchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.ngoName.toLowerCase().includes(q)
      );
    }

    return list;
  });

  readonly hasCauseFilters = computed(() =>
    !!this.causeSearchQuery().trim() || this.causeStatusFilter() !== 'all'
  );

  // ─── Chart maxes ───────────────────────────────────────────────────
  readonly activeDonationTrendMax = computed(() => {
    const trend = this.donationReport()?.monthlyTrend ?? [];
    return Math.max(...trend.map(t => t.totalValue), 1);
  });

  readonly activeDistributionTrendMax = computed(() => {
    const trend = this.distributionReport()?.monthlyTrend ?? [];
    return Math.max(...trend.map(t => t.totalQuantity), 1);
  });

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    Promise.all([
      this.api.donations().toPromise(),
      this.api.inventory().toPromise(),
      this.api.distributions().toPromise(),
      this.api.causes().toPromise()
    ]).then(([don, inv, dist, causes]) => {
      this.donationReport.set(don ?? null);
      this.inventoryReport.set(inv ?? null);
      this.distributionReport.set(dist ?? null);
      this.causeProgress.set(causes ?? []);
      this.loading.set(false);
    }).catch((err: ApiError) => {
      this.error.set(err.detail || err.message || 'Could not load reports.');
      this.loading.set(false);
    });
  }

  setTab(key: TabKey): void { this.activeTab.set(key); }
  setCauseStatus(key: CauseStatusFilter): void { this.causeStatusFilter.set(key); }
  onCauseSearch(value: string): void { this.causeSearchQuery.set(value); }
  setCauseView(v: ViewMode): void { this.causeViewMode.set(v); }
  clearCauseFilters(): void {
    this.causeSearchQuery.set('');
    this.causeStatusFilter.set('all');
  }

  // ─── Print ─────────────────────────────────────────────────────────
  // The @media print rules in styles.scss handle all layout expansion.
  // We don't touch the live DOM, so nothing widens on screen.
  printReport(): void {
    window.print();
  }

  // ─── Export PNG ────────────────────────────────────────────────────
  // Clones the report off-screen at a fixed width, captures the clone,
  // then removes it. The visible page never moves.
  async exportAsPng(): Promise<void> {
    const el = this.reportRoot()?.nativeElement;
    if (!el) return;

    this.exporting.set(true);

    const clone = el.cloneNode(true) as HTMLElement;

    Object.assign(clone.style, {
      position: 'fixed',
      top: '0',
      left: '-99999px',
      width: '1440px',
      maxWidth: 'none',
      minWidth: '0',
      overflow: 'visible',
      zIndex: '-1',
      pointerEvents: 'none',
      backgroundColor: '#ffffff'
    });

    // Expand scroll containers inside the clone so nothing is cut.
    clone.querySelectorAll<HTMLElement>(
      '.panel__scroll, .panel__scroll--tall'
    ).forEach(p => {
      p.style.maxHeight = 'none';
      p.style.overflow = 'visible';
    });

    // Un-stick sticky headers inside the clone.
    clone.querySelectorAll<HTMLElement>('.report-table thead th').forEach(th => {
      th.style.position = 'static';
    });

    document.body.appendChild(clone);

    try {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const height = Math.max(clone.scrollHeight, clone.offsetHeight);

      const dataUrl = await toPng(clone, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        width: 1440,
        height
      });

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const link = document.createElement('a');
      link.download = `kaia-report-${this.activeTab()}-${stamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      document.body.removeChild(clone);
      this.exporting.set(false);
    }
  }

  // ─── Formatting helpers ────────────────────────────────────────────
  formatCurrency(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPesoCompact(v: number): string {
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  formatPercent(v: number): string {
    return v.toFixed(1) + '%';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  deadlineClass(days: number): string {
    if (days < 0) return 'deadline--past';
    if (days <= 7) return 'deadline--soon';
    return 'deadline--ok';
  }

  deadlineLabel(days: number): string {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  progressClass(pct: number): string {
    if (pct >= 100) return 'progress--complete';
    if (pct >= 60) return 'progress--good';
    if (pct >= 25) return 'progress--mid';
    return 'progress--low';
  }
}