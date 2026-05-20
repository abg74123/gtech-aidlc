/**
 * Reports Feature Module
 *
 * This project uses standalone components with route-based lazy loading.
 * This file serves as a barrel export for the reports feature module.
 *
 * Routes are configured in reports.routes.ts and lazy-loaded via
 * loadChildren in app.routes.ts under /reports/*.
 *
 * Available routes:
 * - /reports/dashboard     — Dashboard summary metrics
 * - /reports/stock-balance — Stock balance report
 * - /reports/ap-aging      — AP aging report
 * - /reports/ar-aging      — AR aging report
 * - /reports/alerts        — Alert history
 */

export { REPORTS_ROUTES } from './reports.routes';
export { ReportsShellComponent } from './reports-shell.component';
