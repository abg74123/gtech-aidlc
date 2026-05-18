import { Route } from '@angular/router';

export const WAREHOUSE_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./warehouse-shell.component').then(
        (m) => m.WarehouseShellComponent
      ),
  },
];
