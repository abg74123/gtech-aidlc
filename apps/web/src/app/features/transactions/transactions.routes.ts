import { Route } from '@angular/router';

export const TRANSACTIONS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./transactions-shell.component').then(
        (m) => m.TransactionsShellComponent
      ),
  },
];
