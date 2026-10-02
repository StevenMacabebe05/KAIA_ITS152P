import {
  Component, HostListener, OnInit, computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ItemApiService, ApiError } from '../../core/services/item-api.service';
import { ThemeService } from '../../core/services/theme.service';
import { Item } from '../../core/models/item.model';

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

const LAST_CHECKED_KEY = 'kaia.notifications.lastChecked';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.scss']
})
export class TopNavComponent implements OnInit {
  private readonly api    = inject(ItemApiService);
  private readonly themeS = inject(ThemeService);

  readonly theme = this.themeS.theme;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',      path: '/dashboard',      disabled: false },
    { label: 'Inventory',      path: '/items',          disabled: false },
    { label: 'NGOs',           path: '/ngos',           disabled: false },
    { label: 'Causes',         path: '/causes',         disabled: false },
    { label: 'Donors',         path: '/donors',         disabled: false },
    { label: 'Donations',      path: '/donations',      disabled: false },
    { label: 'Distributions',  path: '/distributions',  disabled: false },
    { label: 'Reports',        path: '/reports',        disabled: true }
  ];

  readonly user = {
    name: 'Steven Macabebe',
    email: 'steven.macabebe@example.com',
    photo: 'profile.png',
    initials: 'SM'
  };

  readonly profileOpen       = signal(false);
  readonly notificationsOpen = signal(false);

  private readonly items = signal<Item[]>([]);
  private lastChecked    = signal<number>(this.loadLastChecked());

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

  ngOnInit(): void {
    this.api.getAll().subscribe({
      next: items => this.items.set(items),
      error: (_err: ApiError) => { /* silent — notifications are best-effort */ }
    });
  }

  toggleProfile(event: MouseEvent): void {
    event.stopPropagation();
    this.profileOpen.update(v => !v);
    this.notificationsOpen.set(false);
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsOpen.update(v => !v);
    this.profileOpen.set(false);
  }

  closeAll(): void {
    this.profileOpen.set(false);
    this.notificationsOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.closeAll(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeAll(); }

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

  toggleTheme(): void { this.themeS.toggle(); }

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
}