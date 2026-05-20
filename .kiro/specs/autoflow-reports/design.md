# Design: Unit 4 — รายงาน (Reports & Error Alerts)

## Overview

**Architecture**: Modular Monolith — NestJS module in Nx monorepo, Guard-based alert validation  
**Stack**: Angular (Material CDK Table) / NestJS / PostgreSQL / Prisma  
**Components**: 5 — AlertValidationGuard, AlertRuleService, AlertLogService, ReportQueryService, ReportsFrontendModule  
**Entities**: 2 — AlertLog, StockBalance (view)  
**Endpoints**: 7 — 2 alert endpoints + 5 report endpoints  
**PBT Properties**: 12 — covering alert rules, logging, history, aging, access control, and pagination

This unit provides pre-POST alert validation (5 hardcoded ERROR rules that block invalid transactions) and read-only reporting (stock balance, AP/AR aging, alert history, dashboard). The AlertValidationGuard intercepts TX POST requests, validates business rules via AlertRuleService, logs violations to AlertLog, and blocks the operation. ReportQueryService provides cross-schema read queries for operational reports.

## Architecture

**Pattern**: NestJS Guard-based validation + Read-only report queries

```
┌─────────────────────────────────────────────────────────────────┐
│                    Reports Module (libs/reports/)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐    ┌────────────────────────────┐ │
│  │  AlertValidationGuard   │    │   ReportQueryService       │ │
│  │  (NestJS Guard)         │    │   (Stock, AP/AR Aging)     │ │
│  │                         │    │                            │ │
│  │  ┌───────────────────┐  │    │  ┌──────────────────────┐  │ │
│  │  │ AlertRuleService  │  │    │  │ Pagination + Filter  │  │ │
│  │  │ (5 hardcoded      │  │    │  │ Cross-schema queries │  │ │
│  │  │  ERROR rules)     │  │    │  └──────────────────────┘  │ │
│  │  └───────────────────┘  │    └────────────────────────────┘ │
│  │           │              │                │                  │
│  │  ┌───────────────────┐  │    ┌────────────────────────────┐ │
│  │  │ AlertLogService   │  │    │   Mock Data Services       │ │
│  │  │ (alert_log table) │  │    │   (implements shared       │ │
│  │  └───────────────────┘  │    │    interfaces)             │ │
│  └─────────────────────────┘    └────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Database: reports schema (alert_log)                           │
│  Reads: master_data, transactions schemas (cross-schema)       │
│  Mocks: ITxLogService, IStockValidationService, IPeriodService │
└─────────────────────────────────────────────────────────────────┘
```

**Flow — Alert Validation (Pre-POST)**:
```
TX POST Request
    │
    ▼
AlertValidationGuard (applied to POST endpoints)
    │
    ├── AlertRuleService.validatePrePost(createTxDto)
    │       ├── Rule: Stock Negative (US-028)
    │       ├── Rule: CN_RETURN Inventory (US-029)
    │       ├── Rule: Duplicate Invoice (US-030)
    │       ├── Rule: INVOICE_FROM_DO Stock (US-031)
    │       └── Rule: Period Lock (US-032)
    │
    ├── IF any rule fails → AlertLogService.log(error) → throw DomainException
    │
    └── IF all pass → continue to controller
```

---

## Components and Interfaces

### AlertValidationGuard
- **Purpose**: NestJS Guard that intercepts TX POST requests and runs all ERROR validation rules before allowing the operation to proceed
- **Technology**: NestJS CanActivate Guard with custom decorator
- **Responsibilities**: Extract CreateTxDto from request body, invoke AlertRuleService, block request if any rule fails
- **Exposes**: `@ValidateAlerts()` decorator to apply on TX POST endpoints
- **Consumes**: AlertRuleService, request body (CreateTxDto)

### AlertRuleService
- **Purpose**: Contains all 5 hardcoded ERROR alert validation rules as pure business logic
- **Technology**: NestJS Injectable service
- **Responsibilities**: Validate stock negative, CN_RETURN inventory protection, duplicate invoice, INVOICE_FROM_DO stock protection, period lock
- **Exposes**: `validatePrePost(dto: CreateTxDto): Promise<AlertValidationResult>`
- **Consumes**: IStockValidationService (mock), IPeriodService (mock), ITxLogService (mock for reference lookups)

### AlertLogService
- **Purpose**: Persists blocked ERROR events to the alert_log table for audit and reporting
- **Technology**: NestJS Injectable + Prisma
- **Responsibilities**: Create alert log entries, query alert history
- **Exposes**: `logAlert(alert: CreateAlertLogDto): Promise<AlertLog>`, `findAlerts(filter): Promise<AlertLog[]>`
- **Consumes**: PrismaService (reports schema)

### ReportQueryService
- **Purpose**: Generates stock balance and AP/AR aging reports with pagination and filtering
- **Technology**: NestJS Injectable + Prisma cross-schema queries
- **Responsibilities**: Stock balance report, AP aging report, AR aging report, alert history report
- **Exposes**: `getStockReport(filter)`, `getAPAging(filter)`, `getARAging(filter)`, `getAlertHistory(filter)`
- **Consumes**: PrismaService (cross-schema: master_data, transactions, reports)

### ReportsFrontendModule
- **Purpose**: Angular lazy-loaded feature module for report views and alert history
- **Technology**: Angular + Angular Material CDK Table
- **Responsibilities**: Report table views with server-side pagination, filter forms, alert history dashboard
- **Exposes**: Lazy-loaded routes under `/reports/*`
- **Consumes**: API endpoints via HttpClient

---

## Data Models

### AlertLog
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, default uuid() | Unique alert identifier |
| alertCode | String | Not null | Error code (STOCK_NEGATIVE, CN_RETURN_INVENTORY, DUPLICATE_INVOICE, INVOICE_FROM_DO_STOCK, PERIOD_LOCKED) |
| alertMessage | String | Not null | Human-readable error message (Thai) |
| txType | TxType | Not null | TX type that triggered the alert |
| txData | JSON | Not null | Snapshot of the CreateTxDto that was blocked |
| itemId | String | Nullable | Item involved (if applicable) |
| warehouseId | String | Nullable | Warehouse involved (if applicable) |
| period | String | Nullable | Period involved (if applicable) |
| userId | String | Not null | User who attempted the operation |
| createdAt | DateTime | Default now() | When the alert was triggered |

**Schema**: `reports`
**Indexes**: alertCode + createdAt (composite), userId, txType, createdAt (for time-range queries)

### StockBalanceView (Read-only — cross-schema query, not a table)
| Field | Type | Source | Description |
|-------|------|--------|-------------|
| itemId | UUID | master_data.items | Item identifier |
| itemName | String | master_data.items | Item display name |
| warehouseId | UUID | master_data.warehouses | Warehouse identifier |
| warehouseName | String | master_data.warehouses | Warehouse display name |
| currentQty | Decimal | Computed from TX Log | Current stock quantity |
| currentMA | Decimal(10,2) | Computed from TX Log | Current Moving Average cost |
| totalValue | Decimal(10,2) | qty × MA | Total inventory value |

### APAgingView (Read-only — cross-schema query)
| Field | Type | Source | Description |
|-------|------|--------|-------------|
| vendorId | UUID | master_data.vendors | Vendor identifier |
| vendorName | String | master_data.vendors | Vendor display name |
| totalOpen | Decimal(10,2) | transactions.ap_items | Total open AP amount |
| current | Decimal(10,2) | Computed | 0-30 days |
| days31_60 | Decimal(10,2) | Computed | 31-60 days |
| days61_90 | Decimal(10,2) | Computed | 61-90 days |
| over90 | Decimal(10,2) | Computed | Over 90 days |

### ARAgingView (Read-only — cross-schema query)
| Field | Type | Source | Description |
|-------|------|--------|-------------|
| customerId | UUID | master_data.customers | Customer identifier |
| customerName | String | master_data.customers | Customer display name |
| totalOpen | Decimal(10,2) | transactions.ar_items | Total open AR amount |
| current | Decimal(10,2) | Computed | 0-30 days |
| days31_60 | Decimal(10,2) | Computed | 31-60 days |
| days61_90 | Decimal(10,2) | Computed | 61-90 days |
| over90 | Decimal(10,2) | Computed | Over 90 days |

---

## API Specification

**Base URL**: `/api/v1`
**Auth**: JWT Bearer token
**Pagination**: Offset-based — `?page=1&limit=20`
**Response format**: `{ data: T[], pagination: { page, limit, total, totalPages } }`

### POST /api/v1/alerts/validate
- **Description**: Validate a TX DTO against all ERROR rules (used by other units before POST)
- **Auth**: Any authenticated user
- **Request**: `CreateTxDto` (from @autoflow/shared-types)
- **Response 200**: `{ valid: true, errors: [] }`
- **Response 422**: `{ valid: false, errors: [{ code: string, message: string, details: object }] }`
- **Notes**: This endpoint is called programmatically by other units. The AlertValidationGuard also calls this logic automatically on TX POST endpoints.

### GET /api/v1/alerts/history
- **Description**: Query alert log history with filters
- **Auth**: Manager, CFO, Admin
- **Query Params**: `?page=1&limit=20&alertCode=STOCK_NEGATIVE&txType=SALE_INVOICE&dateFrom=2025-01-01&dateTo=2025-01-31&userId=uuid`
- **Response 200**: `{ data: AlertLog[], pagination: { page, limit, total, totalPages } }`
- **Errors**: 401 Not authenticated, 403 Insufficient role

### GET /api/v1/reports/stock-balance
- **Description**: Stock balance report — current qty, MA, and total value per item+warehouse
- **Auth**: Manager, CFO, Admin
- **Query Params**: `?page=1&limit=20&itemId=uuid&warehouseId=uuid&search=keyword`
- **Response 200**: `{ data: StockBalanceView[], pagination: {...}, summary: { totalItems, totalValue } }`
- **Errors**: 401, 403

### GET /api/v1/reports/ap-aging
- **Description**: AP aging report — open AP grouped by vendor with aging buckets
- **Auth**: Manager, CFO, Admin
- **Query Params**: `?page=1&limit=20&vendorId=uuid&asOfDate=2025-01-31`
- **Response 200**: `{ data: APAgingView[], pagination: {...}, summary: { totalOpen, totalVendors } }`
- **Errors**: 401, 403

### GET /api/v1/reports/ar-aging
- **Description**: AR aging report — open AR grouped by customer with aging buckets
- **Auth**: Manager, CFO, Admin
- **Query Params**: `?page=1&limit=20&customerId=uuid&asOfDate=2025-01-31`
- **Response 200**: `{ data: ARAgingView[], pagination: {...}, summary: { totalOpen, totalCustomers } }`
- **Errors**: 401, 403

### GET /api/v1/reports/dashboard
- **Description**: Dashboard summary — key metrics for operational overview
- **Auth**: Manager, CFO, Admin
- **Response 200**: `{ totalAlerts: number, alertsByCode: Record<string, number>, stockValue: number, totalAP: number, totalAR: number, recentAlerts: AlertLog[] }`
- **Errors**: 401, 403

### GET /api/v1/reports/stock-balance/:itemId
- **Description**: Stock detail for a specific item across all warehouses
- **Auth**: Manager, CFO, Admin
- **Response 200**: `{ item: { id, name }, warehouses: StockBalanceView[] }`
- **Errors**: 401, 403, 404

---

## Integration Points

| External System | Protocol | Purpose | Error Handling | Mock Strategy |
|----------------|----------|---------|----------------|---------------|
| ข้อมูลหลัก (TX Log) | Direct import (future) / Mock service (now) | Read TX entries, stock balance, MA | Return empty/default on error | MockTxLogService implementing ITxLogService |
| ข้อมูลหลัก (Stock) | Direct import (future) / Mock service (now) | Validate stock availability | Return valid=true on mock | MockStockValidationService implementing IStockValidationService |
| ข้อมูลหลัก (Period) | Direct import (future) / Mock service (now) | Check period lock status | Return OPEN on mock | MockPeriodService implementing IPeriodService |
| ข้อมูลพื้นฐาน (AP/AR) | Cross-schema query (future) / Mock data (now) | AP/AR open items for aging | Return mock data | Seed data in transactions schema |
| คลังสินค้า (Count) | Cross-schema query (future) / Mock data (now) | Count session status | Return not-frozen | Mock in StockValidationService |

---

## Error Handling

### Alert Validation Errors (DomainException)

| Error Code | Condition | HTTP Status | Response |
|------------|-----------|-------------|----------|
| STOCK_NEGATIVE | TX would cause stock qty < 0 | 422 | `{ code: "STOCK_NEGATIVE", message: "สต็อกไม่เพียงพอ", details: { itemId, warehouseId, available, requested } }` |
| CN_RETURN_INVENTORY | CN_RETURN has non-zero inventory fields | 422 | `{ code: "CN_RETURN_INVENTORY", message: "CN_RETURN ห้ามมีรายการสต็อก", details: { qty, totalCost } }` |
| DUPLICATE_INVOICE | Job Order already has an invoice | 422 | `{ code: "DUPLICATE_INVOICE", message: "ใบสั่งงานนี้มีใบแจ้งหนี้แล้ว", details: { refJoId, existingInvoiceId } }` |
| INVOICE_FROM_DO_STOCK | INVOICE_FROM_DO has non-zero stock/AR fields | 422 | `{ code: "INVOICE_FROM_DO_STOCK", message: "INVOICE_FROM_DO ห้ามมีรายการสต็อก/AR", details: { qty, totalCost, arAmount } }` |
| PERIOD_LOCKED | Target period is CLOSED | 422 | `{ code: "PERIOD_LOCKED", message: "งวดบัญชีถูกปิดแล้ว", details: { period, status } }` |

### API Errors

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Not authenticated | 401 | `{ statusCode: 401, message: "Unauthorized" }` |
| Insufficient role | 403 | `{ statusCode: 403, message: "Forbidden resource" }` |
| Item not found (stock detail) | 404 | `{ statusCode: 404, message: "Item not found" }` |
| Invalid query params | 400 | `{ statusCode: 400, message: "Validation failed", errors: [...] }` |

### Cross-Schema Query Errors

| Scenario | Handling | Recovery |
|----------|----------|----------|
| Referenced schema unavailable | Catch Prisma error, return 503 | Retry with exponential backoff (future) |
| Data inconsistency (orphan references) | Log warning, exclude from results | Alert admin via structured log |
| Query timeout (large datasets) | Prisma query timeout (30s default) | Return partial results with warning header |

### Mock Service Fallback Behavior

During the mock phase, external service failures are handled gracefully:
- **MockTxLogService**: Returns empty array on error → no stock data available
- **MockStockValidationService**: Returns `{ valid: true }` on error → allows TX through (fail-open for mocks only)
- **MockPeriodService**: Returns `{ status: "OPEN" }` on error → period treated as open

---

## Testing Strategy

### Unit Testing

- **Framework**: Jest (co-located `*.spec.ts` files)
- **Coverage target**: 90%+ for AlertRuleService, AlertLogService, ReportQueryService
- **Approach**: Test each alert rule in isolation with mocked dependencies
- **Key test cases**:
  - Each of the 5 alert rules: valid input passes, invalid input fails with correct error code
  - AlertLogService: persists correct fields, handles concurrent writes
  - ReportQueryService: correct pagination, filter application, aging bucket calculation

### Property-Based Testing

- **Framework**: fast-check
- **Location**: `libs/reports/src/alerts/alert-rule.service.pbt.spec.ts` (Properties 1-7), `libs/reports/src/reports/report-query.service.pbt.spec.ts` (Properties 8-12)
- **Properties**: 12 total — covering alert rules, logging completeness, history ordering, filter correctness, aging classification, role access, and pagination slicing
- **Generators**: Custom arbitraries for CreateTxDto, TxType, AlertLog, pagination params

### Integration Testing

- **Framework**: Jest + Supertest
- **Scope**: Full request lifecycle through NestJS app (Guard → Controller → Service → Prisma)
- **Database**: In-memory PostgreSQL (pg-mem) or test schema with transaction rollback
- **Key scenarios**:
  - AlertValidationGuard blocks invalid TX and logs to alert_log
  - Report endpoints return correct paginated data with role enforcement
  - Cross-schema queries return joined data correctly

### Frontend Testing

- **Framework**: Jest (component unit tests) + Playwright (E2E)
- **Scope**: Report table rendering, pagination interaction, filter form behavior
- **Key scenarios**:
  - Tables render correct columns and data
  - Pagination controls navigate correctly
  - Filter forms submit correct query params

---

## Implementation

### Directory Structure
```
libs/reports/
├── src/
│   ├── index.ts                          # Barrel export
│   ├── reports.module.ts                 # NestJS module definition
│   │
│   ├── alerts/
│   │   ├── alert-rule.service.ts         # 5 hardcoded validation rules
│   │   ├── alert-rule.service.spec.ts    # Unit tests
│   │   ├── alert-log.service.ts          # Persist alert events
│   │   ├── alert-log.service.spec.ts     # Unit tests
│   │   ├── alert-validation.guard.ts     # NestJS Guard
│   │   ├── alert-validation.guard.spec.ts
│   │   ├── validate-alerts.decorator.ts  # @ValidateAlerts() decorator
│   │   ├── alerts.controller.ts          # POST /validate, GET /history
│   │   ├── alerts.controller.spec.ts
│   │   └── dto/
│   │       ├── alert-validation-result.dto.ts
│   │       └── alert-query-filter.dto.ts
│   │
│   ├── reports/
│   │   ├── report-query.service.ts       # Stock, AP/AR aging queries
│   │   ├── report-query.service.spec.ts
│   │   ├── reports.controller.ts         # GET /stock-balance, /ap-aging, /ar-aging, /dashboard
│   │   ├── reports.controller.spec.ts
│   │   └── dto/
│   │       ├── stock-balance.dto.ts
│   │       ├── ap-aging.dto.ts
│   │       ├── ar-aging.dto.ts
│   │       ├── dashboard.dto.ts
│   │       └── report-filter.dto.ts
│   │
│   └── mocks/
│       ├── mock-tx-log.service.ts        # Implements ITxLogService
│       ├── mock-stock-validation.service.ts  # Implements IStockValidationService
│       ├── mock-period.service.ts        # Implements IPeriodService
│       └── mock-data.ts                  # Seed/fixture data for reports
│
├── project.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── jest.config.ts
└── eslint.config.js

apps/web/src/app/features/reports/
├── reports.module.ts                     # Angular feature module
├── reports-routing.module.ts             # Lazy-loaded routes
├── services/
│   └── reports-api.service.ts            # HttpClient wrapper
├── components/
│   ├── alert-history/
│   │   ├── alert-history.component.ts
│   │   ├── alert-history.component.html
│   │   └── alert-history.component.scss
│   ├── stock-balance/
│   │   ├── stock-balance.component.ts
│   │   ├── stock-balance.component.html
│   │   └── stock-balance.component.scss
│   ├── ap-aging/
│   │   ├── ap-aging.component.ts
│   │   ├── ap-aging.component.html
│   │   └── ap-aging.component.scss
│   ├── ar-aging/
│   │   ├── ar-aging.component.ts
│   │   ├── ar-aging.component.html
│   │   └── ar-aging.component.scss
│   └── dashboard/
│       ├── dashboard.component.ts
│       ├── dashboard.component.html
│       └── dashboard.component.scss
└── shared/
    ├── report-table/                     # Reusable Material CDK table wrapper
    │   ├── report-table.component.ts
    │   └── report-table.component.html
    └── pagination/
        └── pagination.component.ts
```

### Dev Setup
```bash
# Generate the reports library
npx nx g @nx/nest:library reports --directory=libs/reports

# Add Angular Material (if not already installed)
npx ng add @angular/material --project=web

# Run reports unit tests
npx nx test reports

# Run API with reports module
npx nx serve api
```

### Conventions
- **Files**: kebab-case (`alert-rule.service.ts`, `stock-balance.dto.ts`)
- **Code**: Layered — Controller → Service → Prisma (Guard intercepts before Controller)
- **Tests**: Jest co-located (`*.spec.ts`), fast-check for PBT
- **Imports**: `@autoflow/reports`, `@autoflow/shared-types`, `@autoflow/shared-errors`
- **Mock services**: Implement shared interfaces, injectable via NestJS DI (swap real services later)

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stock Negative Always Blocked

*For any* CreateTxDto where txType is a stock-decreasing type AND the requested qty exceeds available stock, AlertRuleService.validatePrePost SHALL return an error with code STOCK_NEGATIVE and the operation SHALL be blocked.

**Validates: Requirements 1.1**

### Property 2: CN_RETURN No Inventory

*For any* CreateTxDto where txType is CN_RETURN AND any inventory field is non-zero (qty ≠ 0 OR totalCost ≠ 0), AlertRuleService.validatePrePost SHALL return an error with code CN_RETURN_INVENTORY and the operation SHALL be blocked.

**Validates: Requirements 2.1**

### Property 3: Duplicate Invoice Blocked

*For any* CreateTxDto where txType is SALE_INVOICE or INVOICE_FROM_DO AND the refJoId references a Job Order that already has an existing invoice, AlertRuleService.validatePrePost SHALL return an error with code DUPLICATE_INVOICE.

**Validates: Requirements 3.1, 3.2**

### Property 4: INVOICE_FROM_DO No Stock

*For any* CreateTxDto where txType is INVOICE_FROM_DO AND any stock/AR field is non-zero (qty ≠ 0 OR totalCost ≠ 0 OR arAmount ≠ 0), AlertRuleService.validatePrePost SHALL return an error with code INVOICE_FROM_DO_STOCK and the operation SHALL be blocked.

**Validates: Requirements 4.1, 4.2**

### Property 5: Period Lock Always Blocked

*For any* CreateTxDto with any txType where the specified period has status CLOSED, AlertRuleService.validatePrePost SHALL return an error with code PERIOD_LOCKED and the operation SHALL be blocked.

**Validates: Requirements 5.1**

### Property 6: Alert Log Completeness

*For any* TX that triggers any ERROR rule (STOCK_NEGATIVE, CN_RETURN_INVENTORY, DUPLICATE_INVOICE, INVOICE_FROM_DO_STOCK, or PERIOD_LOCKED), AlertLogService SHALL persist an AlertLog entry containing: a valid UUID id, the correct alertCode, a non-empty alertMessage, the txType, the full txData JSON snapshot, the userId, and a createdAt timestamp.

**Validates: Requirements 1.2, 2.2, 3.3, 4.3, 5.2, 13.1, 13.2**

### Property 7: Multi-Rule All Violations Reported

*For any* CreateTxDto that violates multiple ERROR rules simultaneously, AlertRuleService.validatePrePost SHALL return ALL violated rule codes in the errors array — not just the first violation encountered.

**Validates: Requirements 6.3**

### Property 8: Alert History Sorted Descending

*For any* set of AlertLog entries in the database, querying GET /api/v1/alerts/history SHALL return results sorted by createdAt in descending order (newest first).

**Validates: Requirements 7.1**

### Property 9: Alert History Filter Correctness

*For any* combination of filter parameters (alertCode, txType, dateFrom, dateTo, userId), all AlertLog entries returned by the history query SHALL match every specified filter criterion.

**Validates: Requirements 7.2**

### Property 10: Aging Bucket Classification

*For any* open item (AP or AR) with a known creation date and a given asOfDate, the aging bucket assignment SHALL be deterministic: current (0-30 days), 31-60 days, 61-90 days, or over 90 days — computed as the difference in days between asOfDate and the item's creation date.

**Validates: Requirements 9.1, 9.4, 10.1, 10.4**

### Property 11: Role Access Denied for Unauthorized

*For any* authenticated user with a role NOT in {Manager, CFO, Admin} (i.e., Cashier, Store Staff, or Supervisor), all GET requests to /api/v1/reports/* and /api/v1/alerts/history SHALL return HTTP 403.

**Validates: Requirements 12.2**

### Property 12: Pagination Slice Correctness

*For any* dataset of N items and valid pagination parameters (page, limit), the returned data slice SHALL contain at most `limit` items, the pagination metadata SHALL have totalPages = ceil(N / limit), and the items SHALL correspond to the correct offset position in the full sorted result set.

**Validates: Requirements 14.1, 14.2**

---

**Framework**: fast-check (already in node_modules)
**Location**: `libs/reports/src/alerts/alert-rule.service.pbt.spec.ts` (Properties 1-7), `libs/reports/src/reports/report-query.service.pbt.spec.ts` (Properties 8-12)

---

## Traceability

| Requirement | Component | API | Data |
|-------------|-----------|-----|------|
| US-028 Stock Negative | AlertRuleService, AlertValidationGuard | POST /alerts/validate | AlertLog |
| US-029 CN_RETURN Inventory | AlertRuleService, AlertValidationGuard | POST /alerts/validate | AlertLog |
| US-030 Duplicate Invoice | AlertRuleService, AlertValidationGuard | POST /alerts/validate | AlertLog |
| US-031 INVOICE_FROM_DO Stock | AlertRuleService, AlertValidationGuard | POST /alerts/validate | AlertLog |
| US-032 Period Lock | AlertRuleService, AlertValidationGuard | POST /alerts/validate | AlertLog |
| — (Report views) | ReportQueryService, ReportsFrontendModule | GET /reports/* | StockBalanceView, APAgingView, ARAgingView |
| — (Alert history) | AlertLogService, ReportsFrontendModule | GET /alerts/history | AlertLog |

---

## External References

| Source | Type | Used in |
|--------|------|---------|
| `libs/shared-types/src/interfaces/` | Service interfaces | Mock services design |
| `libs/shared-types/src/dto/create-tx.dto.ts` | DTO definition | Alert validation input |
| `libs/shared-errors/` | Exception classes | Error throwing pattern |
| `.kiro/specs/autoflow/requirements.md` (US-028–032) | Requirements | All components |
