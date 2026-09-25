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
  { path: '**', redirectTo: 'dashboard' }
]