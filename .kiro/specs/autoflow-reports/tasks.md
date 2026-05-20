# Implementation Plan: Unit 4 — รายงาน (Reports & Error Alerts)

## Overview

Implement the Reports & Error Alerts module as a NestJS library (`libs/reports/`) with Angular frontend (`apps/web/src/app/features/reports/`). The module provides 5 hardcoded ERROR alert validation rules via a NestJS Guard, alert log persistence, cross-schema report queries (Stock Balance, AP/AR Aging, Dashboard), and Angular Material CDK Table views with server-side pagination.

## Tasks

- [x] 1. Set up Reports library structure and shared interfaces
  - [x] 1.1 Generate NestJS library and configure module
    - Generate `libs/reports/` using Nx generator
    - Create `reports.module.ts` with module definition
    - Configure `project.json`, `tsconfig.lib.json`, `tsconfig.spec.json`, `jest.config.ts`
    - Add barrel export in `src/index.ts`
    - _Requirements: 6.1, 6.4, 13.1_

  - [x] 1.2 Define DTOs and shared types
    - Create `alerts/dto/alert-validation-result.dto.ts` — AlertValidationResult, AlertError interfaces
    - Create `alerts/dto/alert-query-filter.dto.ts` — AlertQueryFilterDto with class-validator decorators
    - Create `reports/dto/stock-balance.dto.ts` — StockBalanceView, StockBalanceResponse
    - Create `reports/dto/ap-aging.dto.ts` — APAgingView, APAgingResponse
    - Create `reports/dto/ar-aging.dto.ts` — ARAgingView, ARAgingResponse
    - Create `reports/dto/dashboard.dto.ts` — DashboardResponse
    - Create `reports/dto/report-filter.dto.ts` — ReportFilterDto with pagination params
    - _Requirements: 6.2, 6.3, 7.3, 8.1, 9.1, 10.1, 11.1, 14.1, 14.2_

  - [x] 1.3 Create mock services for cross-unit dependencies
    - Create `mocks/mock-tx-log.service.ts` implementing ITxLogService — returns mock TX entries, stock balance, invoice lookups
    - Create `mocks/mock-stock-validation.service.ts` implementing IStockValidationService — validates stock availability
    - Create `mocks/mock-period.service.ts` implementing IPeriodService — returns period status (OPEN/CLOSED)
    - Create `mocks/mock-data.ts` — seed/fixture data for reports (items, warehouses, vendors, customers, open items)
    - Register mock services in ReportsModule providers with interface tokens
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [x] 1.4 Create Prisma schema for alert_log table
    - Add `alert_log` table definition in reports schema
    - Define fields: id (UUID), alertCode, alertMessage, txType, txData (JSON), itemId, warehouseId, period, userId, createdAt
    - Add composite index on (alertCode, createdAt), indexes on userId, txType, createdAt
    - Run `prisma generate` to update client
    - _Requirements: 13.1, 13.2_

- [x] 2. Implement Alert Validation Rules (AlertRuleService)
  - [x] 2.1 Implement AlertRuleService with 5 ERROR rules
    - Create `alerts/alert-rule.service.ts`
    - Implement `validatePrePost(dto: CreateTxDto): Promise<AlertValidationResult>`
    - Rule 1: STOCK_NEGATIVE — check if stock-decreasing TX would cause negative qty
    - Rule 2: CN_RETURN_INVENTORY — check if CN_RETURN has non-zero qty or totalCost
    - Rule 3: DUPLICATE_INVOICE — check if SALE_INVOICE/INVOICE_FROM_DO references JO with existing invoice or has_temp_do
    - Rule 4: INVOICE_FROM_DO_STOCK — check if INVOICE_FROM_DO has non-zero qty, totalCost, or arAmount
    - Rule 5: PERIOD_LOCKED — check if period status is CLOSED
    - Return ALL violated rules (not just first) in errors array
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 4.1, 4.2, 5.1, 6.1, 6.3_

  - [ ]* 2.2 Write property test: Stock Negative Always Blocked
    - **Property 1: Stock Negative Always Blocked**
    - **Validates: Requirements 1.1**
    - Use fast-check to generate arbitrary CreateTxDto with stock-decreasing txType and qty > available stock
    - Assert: result always contains STOCK_NEGATIVE error code

  - [ ]* 2.3 Write property test: CN_RETURN No Inventory
    - **Property 2: CN_RETURN No Inventory**
    - **Validates: Requirements 2.1**
    - Use fast-check to generate arbitrary CreateTxDto with txType CN_RETURN and non-zero inventory fields
    - Assert: result always contains CN_RETURN_INVENTORY error code

  - [ ]* 2.4 Write property test: Duplicate Invoice Blocked
    - **Property 3: Duplicate Invoice Blocked**
    - **Validates: Requirements 3.1, 3.2**
    - Use fast-check to generate arbitrary CreateTxDto with SALE_INVOICE/INVOICE_FROM_DO referencing JO with existing invoice
    - Assert: result always contains DUPLICATE_INVOICE error code

  - [ ]* 2.5 Write property test: INVOICE_FROM_DO No Stock
    - **Property 4: INVOICE_FROM_DO No Stock**
    - **Validates: Requirements 4.1, 4.2**
    - Use fast-check to generate arbitrary CreateTxDto with txType INVOICE_FROM_DO and non-zero qty/totalCost/arAmount
    - Assert: result always contains INVOICE_FROM_DO_STOCK error code

  - [ ]* 2.6 Write property test: Period Lock Always Blocked
    - **Property 5: Period Lock Always Blocked**
    - **Validates: Requirements 5.1**
    - Use fast-check to generate arbitrary CreateTxDto with any txType targeting a CLOSED period
    - Assert: result always contains PERIOD_LOCKED error code

  - [ ]* 2.7 Write property test: Multi-Rule All Violations Reported
    - **Property 7: Multi-Rule All Violations Reported**
    - **Validates: Requirements 6.3**
    - Use fast-check to generate CreateTxDto that violates multiple rules simultaneously
    - Assert: errors array contains ALL violated rule codes, not just the first

- [x] 3. Implement AlertLogService and AlertValidationGuard
  - [x] 3.1 Implement AlertLogService
    - Create `alerts/alert-log.service.ts`
    - Implement `logAlert(alert: CreateAlertLogDto): Promise<AlertLog>` — persist to alert_log table via Prisma
    - Implement `findAlerts(filter: AlertQueryFilterDto): Promise<{ data: AlertLog[], pagination }>` — query with filters and pagination
    - Ensure atomic persistence — if DB write fails, still throw DomainException
    - _Requirements: 1.2, 2.2, 3.3, 4.3, 5.2, 7.1, 7.2, 7.3, 13.1, 13.2, 13.3_

  - [ ]* 3.2 Write property test: Alert Log Completeness
    - **Property 6: Alert Log Completeness**
    - **Validates: Requirements 1.2, 2.2, 3.3, 4.3, 5.2, 13.1, 13.2**
    - Use fast-check to generate arbitrary alert events
    - Assert: persisted AlertLog always contains valid UUID, correct alertCode, non-empty alertMessage, txType, full txData, userId, and createdAt

  - [x] 3.3 Implement AlertValidationGuard
    - Create `alerts/alert-validation.guard.ts` — NestJS CanActivate Guard
    - Extract CreateTxDto from request body
    - Invoke AlertRuleService.validatePrePost()
    - If any rule fails: call AlertLogService.logAlert() for each error, then throw DomainException with HTTP 422
    - If all pass: return true (allow request to proceed)
    - _Requirements: 1.1, 1.3, 2.1, 3.1, 4.1, 5.1, 6.4_

  - [x] 3.4 Create @ValidateAlerts() decorator
    - Create `alerts/validate-alerts.decorator.ts`
    - Custom decorator that applies AlertValidationGuard to decorated endpoints
    - _Requirements: 6.4_

- [x] 4. Checkpoint - Ensure alert validation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Alerts Controller
  - [x] 5.1 Implement AlertsController
    - Create `alerts/alerts.controller.ts`
    - POST /api/v1/alerts/validate — accept CreateTxDto, return AlertValidationResult (200 or 422)
    - GET /api/v1/alerts/history — accept query filters, return paginated AlertLog[] (requires Manager/CFO/Admin role)
    - Apply JwtAuthGuard and RolesGuard on history endpoint
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 12.1, 12.2, 12.3, 12.4_

  - [ ]* 5.2 Write unit tests for AlertsController
    - Test POST /validate returns 200 when all rules pass
    - Test POST /validate returns 422 with all violated rules
    - Test GET /history returns paginated results for authorized roles
    - Test GET /history returns 401 for unauthenticated, 403 for unauthorized roles
    - _Requirements: 6.2, 6.3, 7.4, 7.5, 12.2, 12.3, 12.4_

  - [ ]* 5.3 Write property test: Alert History Sorted Descending
    - **Property 8: Alert History Sorted Descending**
    - **Validates: Requirements 7.1**
    - Use fast-check to generate arbitrary sets of AlertLog entries
    - Assert: query results are always sorted by createdAt descending

  - [ ]* 5.4 Write property test: Alert History Filter Correctness
    - **Property 9: Alert History Filter Correctness**
    - **Validates: Requirements 7.2**
    - Use fast-check to generate arbitrary filter combinations (alertCode, txType, dateFrom, dateTo, userId)
    - Assert: all returned entries match every specified filter criterion

- [x] 6. Implement ReportQueryService
  - [x] 6.1 Implement Stock Balance report query
    - Create `reports/report-query.service.ts`
    - Implement `getStockReport(filter: ReportFilterDto)` — cross-schema query for item+warehouse stock with currentQty, currentMA, totalValue
    - Support filters: itemId, warehouseId, search keyword
    - Include summary: totalItems, totalValue
    - Implement `getStockDetail(itemId: string)` — stock for specific item across all warehouses
    - Return 404 if itemId not found
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 14.1, 14.2_

  - [x] 6.2 Implement AP Aging report query
    - Implement `getAPAging(filter: ReportFilterDto)` — cross-schema query for open AP grouped by vendor
    - Compute aging buckets: current (0-30 days), 31-60, 61-90, over 90 based on asOfDate vs creation date
    - Support filters: vendorId, asOfDate
    - Include summary: totalOpen, totalVendors
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 14.1, 14.2_

  - [x] 6.3 Implement AR Aging report query
    - Implement `getARAging(filter: ReportFilterDto)` — cross-schema query for open AR grouped by customer
    - Compute aging buckets: current (0-30 days), 31-60, 61-90, over 90 based on asOfDate vs creation date
    - Support filters: customerId, asOfDate
    - Include summary: totalOpen, totalCustomers
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 14.1, 14.2_

  - [x] 6.4 Implement Dashboard summary query
    - Implement `getDashboard()` — aggregate metrics: totalAlerts, alertsByCode, stockValue, totalAP, totalAR, recentAlerts (latest 5)
    - Compute all metrics from current data (no caching)
    - _Requirements: 11.1, 11.2_

  - [ ]* 6.5 Write property test: Aging Bucket Classification
    - **Property 10: Aging Bucket Classification**
    - **Validates: Requirements 9.1, 9.4, 10.1, 10.4**
    - Use fast-check to generate arbitrary open items with known creation dates and asOfDate
    - Assert: bucket assignment is deterministic — current (0-30), 31-60, 61-90, over 90

  - [ ]* 6.6 Write property test: Pagination Slice Correctness
    - **Property 12: Pagination Slice Correctness**
    - **Validates: Requirements 14.1, 14.2**
    - Use fast-check to generate arbitrary datasets of N items with valid page/limit params
    - Assert: returned slice has at most `limit` items, totalPages = ceil(N/limit), correct offset position

- [x] 7. Implement ReportsController
  - [x] 7.1 Implement ReportsController
    - Create `reports/reports.controller.ts`
    - GET /api/v1/reports/stock-balance — paginated stock balance with filters
    - GET /api/v1/reports/stock-balance/:itemId — stock detail for specific item
    - GET /api/v1/reports/ap-aging — paginated AP aging with filters
    - GET /api/v1/reports/ar-aging — paginated AR aging with filters
    - GET /api/v1/reports/dashboard — dashboard summary metrics
    - Apply JwtAuthGuard and RolesGuard (Manager, CFO, Admin) on all endpoints
    - Validate pagination params — return 400 for invalid (non-positive, non-integer)
    - _Requirements: 8.1, 8.4, 9.1, 10.1, 11.1, 12.1, 12.2, 14.1, 14.3_

  - [ ]* 7.2 Write property test: Role Access Denied for Unauthorized
    - **Property 11: Role Access Denied for Unauthorized**
    - **Validates: Requirements 12.2**
    - Use fast-check to generate arbitrary users with roles NOT in {Manager, CFO, Admin}
    - Assert: all GET requests to /reports/* and /alerts/history return HTTP 403

  - [ ]* 7.3 Write unit tests for ReportsController
    - Test GET /stock-balance returns paginated data with summary
    - Test GET /stock-balance/:itemId returns 404 for non-existent item
    - Test GET /ap-aging and /ar-aging return correct aging buckets
    - Test GET /dashboard returns all required metrics
    - Test 401/403 for unauthorized access
    - Test 400 for invalid pagination params
    - _Requirements: 8.5, 9.1, 10.1, 11.1, 12.3, 12.4, 14.3_

- [x] 8. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Angular Reports Frontend Module
  - [x] 9.1 Create ReportsFrontendModule structure and routing
    - Create `apps/web/src/app/features/reports/reports.module.ts` — Angular feature module
    - Create `reports-routing.module.ts` — lazy-loaded routes under /reports/*
    - Configure routes: /reports/dashboard, /reports/stock-balance, /reports/ap-aging, /reports/ar-aging, /reports/alerts
    - _Requirements: 15.1_

  - [x] 9.2 Implement ReportsApiService
    - Create `services/reports-api.service.ts` — HttpClient wrapper
    - Methods: getStockBalance(), getStockDetail(), getAPAging(), getARAging(), getDashboard(), getAlertHistory()
    - Handle pagination params and filter params
    - _Requirements: 15.2, 15.3_

  - [x] 9.3 Implement shared report table and pagination components
    - Create `shared/report-table/report-table.component.ts` — reusable Angular Material CDK Table wrapper
    - Create `shared/pagination/pagination.component.ts` — server-side pagination controls
    - Support configurable columns, sort, and data source
    - _Requirements: 15.2_

  - [x] 9.4 Implement Dashboard component
    - Create `components/dashboard/dashboard.component.ts` — summary metrics display
    - Show totalAlerts, alertsByCode breakdown, stockValue, totalAP, totalAR
    - Display recentAlerts list (latest 5)
    - _Requirements: 15.4_

  - [x] 9.5 Implement Stock Balance component
    - Create `components/stock-balance/stock-balance.component.ts` — CDK Table with server-side pagination
    - Filter form: itemId, warehouseId, search keyword
    - Display columns: itemName, warehouseName, currentQty, currentMA, totalValue
    - _Requirements: 15.2, 15.3_

  - [x] 9.6 Implement AP Aging and AR Aging components
    - Create `components/ap-aging/ap-aging.component.ts` — CDK Table with aging buckets
    - Create `components/ar-aging/ar-aging.component.ts` — CDK Table with aging buckets
    - Filter forms: vendorId/customerId, asOfDate
    - Display columns: name, totalOpen, current, 31-60, 61-90, over 90
    - _Requirements: 15.2, 15.3_

  - [x] 9.7 Implement Alert History component
    - Create `components/alert-history/alert-history.component.ts` — CDK Table with filters
    - Filter form: alertCode, txType, dateFrom, dateTo
    - Display columns: createdAt, alertCode, alertMessage, txType, userId
    - Show Thai-language error messages
    - _Requirements: 15.2, 15.3, 15.5_

- [x] 10. Wire module together and register in AppModule
  - [x] 10.1 Register ReportsModule in API AppModule
    - Import ReportsModule in `apps/api/src/app/app.module.ts`
    - Ensure all providers (AlertRuleService, AlertLogService, ReportQueryService, mock services) are properly registered
    - Verify Guard and decorator are exported for use by other units
    - _Requirements: 6.4_

  - [x] 10.2 Register Angular ReportsFrontendModule in app routing
    - Add lazy-loaded route in `apps/web/src/app/app-routing.module.ts` for /reports
    - Verify navigation links in app shell
    - _Requirements: 15.1_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (12 properties mapped to PBT sub-tasks)
- Unit tests validate specific examples and edge cases
- Mock services (ITxLogService, IStockValidationService, IPeriodService) will be swapped for real implementations when other units are integrated
- All user-facing messages should be in Thai (th)
- PBT file locations: `libs/reports/src/alerts/alert-rule.service.pbt.spec.ts` (Properties 1-7), `libs/reports/src/reports/report-query.service.pbt.spec.ts` (Properties 8-12)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["5.1", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "6.5", "6.6", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "9.1", "9.2"] },
    { "id": 7, "tasks": ["9.3", "9.4", "9.5", "9.6", "9.7"] },
    { "id": 8, "tasks": ["10.1", "10.2"] }
  ]
}
```
