import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem {
  label: string;
  path: string;
  disabled: boolean;
  badge?: string;
}

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.scss']
})
export class TopNavComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard',        path: '/dashboard',  disabled: false },
    { label: 'Donation Items',   path: '/items',      disabled: false },
    // Reserved for M3. Rendered as disabled with a badge so the roadmap is visible.
    { label: 'NGOs',             path: '/ngos',       disabled: true, badge: 'M3' },
    { label: 'Causes',           path: '/causes',     disabled: true, badge: 'M3' },
    { label: 'Donations',        path: '/donations',  disabled: true, badge: 'M3' },
    { label: 'Inventory',        path: '/inventory',  disabled: true, badge: 'M3' },
    { label: 'Reports',          path: '/reports',    disabled: true, badge: 'M3' }
  ];
}