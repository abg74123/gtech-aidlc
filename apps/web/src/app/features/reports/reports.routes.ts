import { Route } from '@angular/router';

export const REPORTS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./reports-shell.component').then(
        (m) => m.ReportsShellComponent
      ),
  },
];
