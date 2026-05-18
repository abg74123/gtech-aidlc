import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'master-data',
        loadChildren: () =>
          import('./features/master-data/master-data.routes').then(
            (m) => m.MASTER_DATA_ROUTES
          ),
      },
      {
        path: 'transactions',
        loadChildren: () =>
          import('./features/transactions/transactions.routes').then(
            (m) => m.TRANSACTIONS_ROUTES
          ),
      },
      {
        path: 'warehouse',
        loadChildren: () =>
          import('./features/warehouse/warehouse.routes').then(
            (m) => m.WAREHOUSE_ROUTES
          ),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then(
            (m) => m.REPORTS_ROUTES
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
