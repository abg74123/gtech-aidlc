import { Route } from '@angular/router';
import { environment } from '../../../environments/environment';
import { WAREHOUSE_API_BASE_URL } from '@autoflow/warehouse-ui';

export const WAREHOUSE_ROUTES: Route[] = [
  {
    path: '',
    providers: [
      {
        provide: WAREHOUSE_API_BASE_URL,
        useValue: `${environment.apiBaseUrl}/warehouse`,
      },
    ],
    loadComponent: () =>
      import('./warehouse-shell.component').then(
        (m) => m.WarehouseShellComponent
      ),
    loadChildren: () =>
      import('@autoflow/warehouse-ui').then((m) => m.WAREHOUSE_UI_ROUTES),
  },
];
