import {
  Component, HostListener, OnInit, computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ItemApiService, ApiError } from '../../core/services/item-api.service';
import { NgoApiService } from '../../core/services/ngo-api.service';
import { CauseApiService } from '../../core/services/cause-api.service';
import { DonorApiService } from '../../core/services/donor-api.service';
import { ThemeService } from '../../core/services/theme.service';
import { Item } from '../../core/models/item.model';
import { Ngo } from '../../core/models/ngo.model';
import { Cause } from '../../core/models/cause.model';
import { Donor } from '../../core/models/donor.model';

interface NavItem {
  label: string;
  path: string;
  disabled: boolean;
}

interface AppNotification {
  id: string;
  icon: 'package' | 'calendar' | 'trending' | 'star';
  tone: 'info' | 'success' | 'accent';
  title: string;
  body: string;
  timestamp: string;
}

interface SearchResult {
  kind: 'item' | 'ngo' | 'cause' | 'donor';
  id: number;
  label: string;
  sublabel: string;
  meta?: string;
  path: string;
}

const LAST_CHECKED_KEY = 'kaia.notifications.lastChecked';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.scss']
})
export class TopNavComponent implements OnInit {
  private readonly api      = inject(ItemApiService);
  private readonly ngoApi   = inject(NgoApiService);
  private readonly causeApi = inject(CauseApiService);
  private readonly donorApi = inject(DonorApiService);
  private readonly themeS   = inject(ThemeService);
  private readonly router   = inject(Router);

  readonly theme = this.themeS.theme;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',  path: '/dashboard', disabled: false },
    { label: 'Inventory',  path: '/items',     disabled: false },
    { label: 'NGOs',       path: '/ngos',      disabled: false },
    { label: 'Causes',     path: '/causes',    disabled: false },
    { label: 'Donors',     path: '/donors',    disabled: false },
    { label: 'Donations',  path: '/donations', disabled: false },
    { label: 'Reports',    path: '/reports',   disabled: false }
  ];

  readonly user = {
    name: 'Steven Macabebe',
    email: 'steven.macabebe@example.com',
    photo: 'profile.png',
    initials: 'SM'
  };

  readonly profileOpen       = signal(false);
  readonly notificationsOpen = signal(false);
  readonly searchOpen        = signal(false);
  readonly searchQuery       = signal('');
  readonly highlightIndex    = signal(0);

  private readonly items  = signal<Item[]>([]);
  private readonly ngos   = signal<Ngo[]>([]);
  private readonly causes = signal<Cause[]>([]);
  private readonly donors = signal<Donor[]>([]);

  private lastChecked = signal<number>(this.loadLastChecked());

  // ─── Search results ───────────────────────────────────────────────
  readonly searchResults = computed<SearchResult[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];

    const out: SearchResult[] = [];

    // Items
    for (const it of this.items()) {
      if (out.length >= 12) break;
      if (
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.brand.toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'item',
          id: it.id,
          label: it.name,
          sublabel: `${it.code} · ${it.brand}`,
          meta: '₱' + it.unitPrice.toFixed(2),
          path: '/items'
        });
      }
    }

    // NGOs
    for (const n of this.ngos()) {
      if (out.length >= 12) break;
      if (
        n.name.toLowerCase().includes(q) ||
        (n.contactEmail ?? '').toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'ngo',
          id: n.id,
          label: n.name,
          sublabel: n.verificationStatus,
          path: '/ngos'
        });
      }
    }

    // Causes
    for (const c of this.causes()) {
      if (out.length >= 12) break;
      if (
        c.title.toLowerCase().includes(q) ||
        c.ngoName.toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'cause',
          id: c.id,
          label: c.title,
          sublabel: c.ngoName,
          meta: c.status,
          path: '/causes'
        });
      }
    }

    // Donors
    for (const d of this.donors()) {
      if (out.length >= 12) break;
      if (
        d.name.toLowerCase().includes(q) ||
        (d.email ?? '').toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'donor',
          id: d.id,
          label: d.name,
          sublabel: d.type,
          path: '/donors'
        });
      }
    }

    return out.slice(0, 8);
  });

  readonly searchEmpty = computed(() =>
    this.searchQuery().trim().length > 0 && this.searchResults().length === 0
  );

  // ─── Notifications ────────────────────────────────────────────────
  readonly notifications = computed<AppNotification[]>(() => {
    const list = [...this.items()].sort(
      (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
    );
    if (list.length === 0) return [];

    const now = Date.now();
    const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;
    const result: AppNotification[] = [];

    const latest = list[0];
    result.push({
      id: 'latest',
      icon: 'package',
      tone: 'info',
      title: `${latest.name} just added`,
      body: `${latest.brand} · ${latest.code} — ₱${latest.unitPrice.toFixed(2)}`,
      timestamp: latest.createdAtUtc
    });

    const thisWeek = list.filter(i => new Date(i.createdAtUtc).getTime() >= weekCutoff).length;
    if (thisWeek > 0) {
      result.push({
        id: 'week',
        icon: 'calendar',
        tone: 'success',
        title: `${thisWeek} item${thisWeek === 1 ? '' : 's'} added this week`,
        body: 'Keep the momentum going — the catalog is growing.',
        timestamp: latest.createdAtUtc
      });
    }

    const total = list.reduce((s, i) => s + i.unitPrice, 0);
    result.push({
      id: 'value',
      icon: 'trending',
      tone: 'accent',
      title: `Catalog value at ₱${Math.round(total).toLocaleString('en-PH')}`,
      body: `Across ${list.length} donation items.`,
      timestamp: latest.createdAtUtc
    });

    const brandCounts = new Map<string, number>();
    for (const it of list) brandCounts.set(it.brand, (brandCounts.get(it.brand) ?? 0) + 1);
    const [topBrand, count] = Array.from(brandCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    result.push({
      id: 'brand',
      icon: 'star',
      tone: 'info',
      title: `Top brand: ${topBrand}`,
      body: `${count} item${count === 1 ? '' : 's'} sourced from this brand.`,
      timestamp: latest.createdAtUtc
    });

    return result;
  });

  readonly unreadCount = computed(() => {
    const cutoff = this.lastChecked();
    return this.items().filter(i => new Date(i.createdAtUtc).getTime() > cutoff).length;
  });

  // ─── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit(): void {
    const emptyItems:  Item[]  = [];
    const emptyNgos:   Ngo[]   = [];
    const emptyCauses: Cause[] = [];
    const emptyDonors: Donor[] = [];

    forkJoin({
      items:  this.api.getAll().pipe(catchError(() => of(emptyItems))),
      ngos:   this.ngoApi.getAll().pipe(catchError(() => of(emptyNgos))),
      causes: this.causeApi.getAll().pipe(catchError(() => of(emptyCauses))),
      donors: this.donorApi.getAll().pipe(catchError(() => of(emptyDonors)))
    }).subscribe({
      next: res => {
        this.items.set(res.items);
        this.ngos.set(res.ngos);
        this.causes.set(res.causes);
        this.donors.set(res.donors);
      }
    });
  }

  // ─── Panel toggles ─────────────────────────────────────────────────
  toggleProfile(event: MouseEvent): void {
    event.stopPropagation();
    this.profileOpen.update(v => !v);
    this.notificationsOpen.set(false);
    this.searchOpen.set(false);
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsOpen.update(v => !v);
    this.profileOpen.set(false);
    this.searchOpen.set(false);
  }

  toggleSearch(event?: MouseEvent): void {
    event?.stopPropagation();
    this.searchOpen.update(v => !v);
    this.profileOpen.set(false);
    this.notificationsOpen.set(false);

    if (this.searchOpen()) {
      this.searchQuery.set('');
      this.highlightIndex.set(0);
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('.search-panel__input');
        input?.focus();
      }, 40);
    }
  }

  closeAll(): void {
    this.profileOpen.set(false);
    this.notificationsOpen.set(false);
    this.searchOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.closeAll(); }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeAll();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggleSearch();
      return;
    }

    if (!this.searchOpen()) return;
    const results = this.searchResults();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightIndex.update(i => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex.update(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const pick = results[this.highlightIndex()];
      if (pick) this.navigateToResult(pick);
    }
  }

  // ─── Search interactions ───────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.highlightIndex.set(0);
  }

  navigateToResult(r: SearchResult): void {
    this.closeAll();
    this.router.navigate([r.path]);
  }

  // ─── Notifications ────────────────────────────────────────────────
  markAllRead(): void {
    const now = Date.now();
    this.lastChecked.set(now);
    try { localStorage.setItem(LAST_CHECKED_KEY, String(now)); } catch { /* ignore */ }
  }

  private loadLastChecked(): number {
    try {
      const raw = localStorage.getItem(LAST_CHECKED_KEY);
      return raw ? Number(raw) : 0;
    } catch { return 0; }
  }

  // ─── Theme ────────────────────────────────────────────────────────
  toggleTheme(): void { this.themeS.toggle(); }

  // ─── Helpers ──────────────────────────────────────────────────────
  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }

  searchKindLabel(kind: SearchResult['kind']): string {
    switch (kind) {
      case 'item':  return 'Item';
      case 'ngo':   return 'NGO';
      case 'cause': return 'Cause';
      case 'donor': return 'Donor';
    }
  }
}