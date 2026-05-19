import { Routes } from '@angular/router';

export const WAREHOUSE_UI_ROUTES: Routes = [
  {
    path: 'count',
    loadComponent: () =>
      import('./pages/count-session-list/count-session-list.component').then(
        (m) => m.CountSessionListComponent
      ),
  },
  {
    path: 'count/create',
    loadComponent: () =>
      import('./pages/count-session-create/count-session-create.component').then(
        (m) => m.CountSessionCreateComponent
      ),
  },
  {
    path: 'count/:id',
    loadComponent: () =>
      import('./pages/count-session-detail/count-session-detail.component').then(
        (m) => m.CountSessionDetailComponent
      ),
  },
  {
    path: 'transfers',
    loadComponent: () =>
      import('./pages/transfer-list/transfer-list.component').then(
        (m) => m.TransferListComponent
      ),
  },
  {
    path: 'transfers/create',
    loadComponent: () =>
      import('./pages/transfer-create/transfer-create.component').then(
        (m) => m.TransferCreateComponent
      ),
  },
  {
    path: 'transfers/:id',
    loadComponent: () =>
      import('./pages/transfer-detail/transfer-detail.component').then(
        (m) => m.TransferDetailComponent
      ),
  },
  {
    path: 'write-offs',
    loadComponent: () =>
      import('./pages/write-off-list/write-off-list.component').then(
        (m) => m.WriteOffListComponent
      ),
  },
  {
    path: 'write-offs/create',
    loadComponent: () =>
      import('./pages/write-off-create/write-off-create.component').then(
        (m) => m.WriteOffCreateComponent
      ),
  },
  {
    path: 'write-offs/:id',
    loadComponent: () =>
      import('./pages/write-off-detail/write-off-detail.component').then(
        (m) => m.WriteOffDetailComponent
      ),
  },
  {
    path: '',
    redirectTo: 'count',
    pathMatch: 'full',
  },
];
