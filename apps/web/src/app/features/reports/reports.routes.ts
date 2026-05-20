import { Route } from '@angular/router';
import { ReportsShellComponent } from './reports-shell.component';

export const REPORTS_ROUTES: Route[] = [
  {
    path: '',
    component: ReportsShellComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'stock-balance',
        loadComponent: () =>
          import('./components/stock-balance/stock-balance.component').then(
            (m) => m.StockBalanceComponent
          ),
      },
      {
        path: 'ap-aging',
        loadComponent: () =>
          import('./components/ap-aging/ap-aging.component').then(
            (m) => m.ApAgingComponent
          ),
      },
      {
        path: 'ar-aging',
        loadComponent: () =>
          import('./components/ar-aging/ar-aging.component').then(
            (m) => m.ArAgingComponent
          ),
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./components/alert-history/alert-history.component').then(
            (m) => m.AlertHistoryComponent
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
