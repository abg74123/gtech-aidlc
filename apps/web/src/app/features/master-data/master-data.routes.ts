import { Route } from '@angular/router';

export const MASTER_DATA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./master-data-shell.component').then(
        (m) => m.MasterDataShellComponent
      ),
  },
];
