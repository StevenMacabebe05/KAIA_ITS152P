import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'items',
    loadComponent: () =>
      import('./features/items/items.component').then(m => m.ItemsComponent)
  },
  {
    path: 'ngos',
    loadComponent: () =>
      import('./features/ngos/ngos.component').then(m => m.NgosComponent)
  },
  {
    path: 'causes',
    loadComponent: () =>
      import('./features/causes/causes.component').then(m => m.CausesComponent)
  },
  {
    path: 'donors',
    loadComponent: () =>
      import('./features/donors/donors.component').then(m => m.DonorsComponent)
  },
  {
    path: 'donations',
    loadComponent: () =>
      import('./features/donations/donations.component').then(m => m.DonationsComponent)
  },
  {
    path: 'distributions',
    loadComponent: () =>
      import('./features/distributions/distributions.component').then(m => m.DistributionsComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];