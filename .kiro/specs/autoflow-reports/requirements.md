# Requirements Document

## Introduction

เอกสารนี้กำหนด Requirements สำหรับ Unit 4: รายงาน (Reports & Error Alerts) ของระบบ Autoflow ครอบคลุม 2 ส่วนหลัก:

1. **ERROR Alert Validation** — ระบบ Guard ที่สกัดกั้น TX POST ที่ละเมิดกฎธุรกิจ (5 กฎ) พร้อมบันทึก Alert Log
2. **Report Views** — รายงาน Stock Balance, AP/AR Aging, Dashboard และ Alert History พร้อม Pagination

Requirements ทั้งหมดอ้างอิงจาก Design Document ที่ผ่านการอนุมัติแล้ว โดยใช้ NestJS Guard-based validation architecture และ cross-schema Prisma queries

## Glossary

- **AlertValidationGuard**: NestJS Guard ที่ intercept TX POST requests เพื่อตรวจสอบ ERROR rules ก่อนอนุญาตให้ดำเนินการ
- **AlertRuleService**: Service ที่มี 5 hardcoded ERROR validation rules เป็น pure business logic
- **AlertLogService**: Service ที่บันทึก blocked ERROR events ลง alert_log table
- **ReportQueryService**: Service ที่สร้างรายงาน Stock Balance และ AP/AR Aging ด้วย cross-schema queries
- **CreateTxDto**: DTO ที่ใช้สร้าง Transaction ใหม่ — เป็น input หลักของ alert validation
- **DomainException**: Custom exception class ที่ extend HttpException สำหรับ domain-specific errors
- **AlertLog**: Entity ที่เก็บข้อมูล blocked ERROR events ใน reports schema
- **StockBalanceView**: Read-only view แสดง qty, MA, total value ต่อ item+warehouse
- **APAgingView**: Read-only view แสดง AP open items จัดกลุ่มตาม vendor พร้อม aging buckets
- **ARAgingView**: Read-only view แสดง AR open items จัดกลุ่มตาม customer พร้อม aging buckets
- **Period**: ช่วงเวลาทางบัญชีที่มีสถานะ OPEN หรือ CLOSED
- **TX_Type**: ประเภท Transaction เช่น SALE_INVOICE, GR_RECEIVE, CN_RETURN, INVOICE_FROM_DO
- **Moving_Average**: ต้นทุนเฉลี่ยถ่วงน้ำหนัก = มูลค่าสินค้าคงคลังรวม ÷ จำนวนรวม

## Requirements

### Requirement 1: Stock Negative Prevention (US-028)

**User Story:** As a system, I want to block any TX POST that would cause negative stock, so that data integrity is never compromised.

#### Acceptance Criteria

1. WHEN any stock-decreasing TX is about to POST, IF the resulting stock quantity would be negative, THEN THE AlertValidationGuard SHALL throw a DomainException with code STOCK_NEGATIVE and block the operation
2. WHEN a STOCK_NEGATIVE error is thrown, THEN THE AlertLogService SHALL persist an AlertLog entry with txType, itemId, warehouseId, attempted qty, and current available stock
3. WHEN a STOCK_NEGATIVE error is thrown, THEN THE AlertValidationGuard SHALL return HTTP 422 with error code STOCK_NEGATIVE and a Thai-language message describing the violation

### Requirement 2: CN_RETURN Inventory Protection (US-029)

**User Story:** As a system, I want to block CN_RETURN transactions that attempt to modify inventory fields, so that the business rule "CN_RETURN ไม่แตะ Inventory" is enforced.

#### Acceptance Criteria

1. WHEN a CreateTxDto with txType CN_RETURN has any non-zero inventory field (qty or totalCost), THEN THE AlertValidationGuard SHALL throw a DomainException with code CN_RETURN_INVENTORY and block the POST
2. WHEN a CN_RETURN_INVENTORY error is thrown, THEN THE AlertLogService SHALL persist an AlertLog entry with message "CN_RETURN แตะ Inventory Fields" and the full txData snapshot

### Requirement 3: Duplicate Invoice Prevention (US-030)

**User Story:** As a system, I want to prevent issuing duplicate invoices from the same Job Order, so that revenue is not double-counted.

#### Acceptance Criteria

1. WHEN a SALE_INVOICE or INVOICE_FROM_DO is requested for a Job Order that already has an existing invoice (invoice_id != null), THEN THE AlertValidationGuard SHALL throw a DomainException with code DUPLICATE_INVOICE and message "Invoice ออกซ้ำจาก JO เดิม"
2. WHEN a SALE_INVOICE is requested for a Job Order with has_temp_do=true, THEN THE AlertValidationGuard SHALL throw a DomainException with code DUPLICATE_INVOICE and message "ห้ามสร้าง SALE_INVOICE จาก JO ที่มี TEMP_DO"
3. WHEN a DUPLICATE_INVOICE error is thrown, THEN THE AlertLogService SHALL persist an AlertLog entry with the refJoId and txType

### Requirement 4: INVOICE_FROM_DO Stock Protection (US-031)

**User Story:** As a system, I want to block INVOICE_FROM_DO transactions that attempt to cut stock or create AR, so that the business rule "INVOICE_FROM_DO is document-only" is enforced.

#### Acceptance Criteria

1. WHEN a CreateTxDto with txType INVOICE_FROM_DO has non-zero qty or totalCost, THEN THE AlertValidationGuard SHALL throw a DomainException with code INVOICE_FROM_DO_STOCK and block the POST
2. WHEN a CreateTxDto with txType INVOICE_FROM_DO has non-zero arAmount, THEN THE AlertValidationGuard SHALL throw a DomainException with code INVOICE_FROM_DO_STOCK and block the POST
3. WHEN an INVOICE_FROM_DO_STOCK error is thrown, THEN THE AlertLogService SHALL persist an AlertLog entry with the txData snapshot showing the non-zero fields

### Requirement 5: Period Lock Violation (US-032)

**User Story:** As a system, I want to block any TX POST attempted in a closed accounting period, so that financial period integrity is maintained.

#### Acceptance Criteria

1. WHEN any TX POST is attempted with a period that has status CLOSED, THEN THE AlertValidationGuard SHALL throw a DomainException with code PERIOD_LOCKED and message "POST ใน Period ที่ปิดแล้ว"
2. WHEN a PERIOD_LOCKED error is thrown, THEN THE AlertLogService SHALL persist an AlertLog entry with userId, txType, and the closed period identifier

### Requirement 6: Alert Validation API

**User Story:** As a developer integrating with the Reports module, I want a programmatic validation endpoint, so that other units can pre-validate TX DTOs before attempting POST.

#### Acceptance Criteria

1. WHEN a POST request is sent to /api/v1/alerts/validate with a valid CreateTxDto, THEN THE AlertRuleService SHALL evaluate all 5 ERROR rules and return a validation result
2. WHEN all rules pass, THEN THE AlertRuleService SHALL return HTTP 200 with `{ valid: true, errors: [] }`
3. IF any rule fails, THEN THE AlertRuleService SHALL return HTTP 422 with `{ valid: false, errors: [{ code, message, details }] }` listing all violated rules
4. THE AlertValidationGuard SHALL invoke the same AlertRuleService logic automatically on TX POST endpoints decorated with @ValidateAlerts()

### Requirement 7: Alert History Query

**User Story:** As a Manager/CFO/Admin, I want to view alert history with filters, so that I can audit blocked operations and identify patterns.

#### Acceptance Criteria

1. WHEN an authenticated user with role Manager, CFO, or Admin sends GET /api/v1/alerts/history, THEN THE AlertLogService SHALL return paginated AlertLog entries sorted by createdAt descending
2. WHEN filter parameters are provided (alertCode, txType, dateFrom, dateTo, userId), THEN THE AlertLogService SHALL apply all specified filters to the query
3. THE AlertLogService SHALL return results in format `{ data: AlertLog[], pagination: { page, limit, total, totalPages } }`
4. IF an unauthenticated user attempts access, THEN THE system SHALL return HTTP 401
5. IF an authenticated user without Manager/CFO/Admin role attempts access, THEN THE system SHALL return HTTP 403

### Requirement 8: Stock Balance Report

**User Story:** As a Manager/CFO/Admin, I want to view current stock balance per item and warehouse, so that I can monitor inventory levels and values.

#### Acceptance Criteria

1. WHEN an authorized user sends GET /api/v1/reports/stock-balance, THEN THE ReportQueryService SHALL return paginated stock balance data with itemId, itemName, warehouseId, warehouseName, currentQty, currentMA, and totalValue
2. WHEN filter parameters are provided (itemId, warehouseId, search keyword), THEN THE ReportQueryService SHALL apply all specified filters
3. THE ReportQueryService SHALL include a summary object with totalItems and totalValue in the response
4. WHEN an authorized user sends GET /api/v1/reports/stock-balance/:itemId, THEN THE ReportQueryService SHALL return stock detail for that item across all warehouses
5. IF the itemId does not exist, THEN THE ReportQueryService SHALL return HTTP 404

### Requirement 9: AP Aging Report

**User Story:** As a Manager/CFO/Admin, I want to view AP aging grouped by vendor with aging buckets, so that I can manage payment obligations.

#### Acceptance Criteria

1. WHEN an authorized user sends GET /api/v1/reports/ap-aging, THEN THE ReportQueryService SHALL return paginated AP aging data grouped by vendor with buckets: current (0-30 days), 31-60 days, 61-90 days, and over 90 days
2. WHEN filter parameters are provided (vendorId, asOfDate), THEN THE ReportQueryService SHALL apply the filters and compute aging relative to asOfDate
3. THE ReportQueryService SHALL include a summary object with totalOpen and totalVendors in the response
4. THE ReportQueryService SHALL compute aging buckets based on the difference between asOfDate (or current date) and the open item creation date

### Requirement 10: AR Aging Report

**User Story:** As a Manager/CFO/Admin, I want to view AR aging grouped by customer with aging buckets, so that I can manage collection efforts.

#### Acceptance Criteria

1. WHEN an authorized user sends GET /api/v1/reports/ar-aging, THEN THE ReportQueryService SHALL return paginated AR aging data grouped by customer with buckets: current (0-30 days), 31-60 days, 61-90 days, and over 90 days
2. WHEN filter parameters are provided (customerId, asOfDate), THEN THE ReportQueryService SHALL apply the filters and compute aging relative to asOfDate
3. THE ReportQueryService SHALL include a summary object with totalOpen and totalCustomers in the response
4. THE ReportQueryService SHALL compute aging buckets based on the difference between asOfDate (or current date) and the open item creation date

### Requirement 11: Dashboard Summary

**User Story:** As a Manager/CFO/Admin, I want a dashboard with key operational metrics, so that I can get a quick overview of system health.

#### Acceptance Criteria

1. WHEN an authorized user sends GET /api/v1/reports/dashboard, THEN THE ReportQueryService SHALL return totalAlerts, alertsByCode (breakdown per alert code), stockValue, totalAP, totalAR, and recentAlerts (latest 5 AlertLog entries)
2. THE ReportQueryService SHALL compute all dashboard metrics from current data without caching stale values

### Requirement 12: Report Access Control

**User Story:** As a system administrator, I want report endpoints restricted to authorized roles, so that sensitive financial data is protected.

#### Acceptance Criteria

1. THE system SHALL require JWT Bearer token authentication for all report and alert history endpoints
2. THE system SHALL restrict GET /api/v1/reports/* and GET /api/v1/alerts/history to users with role Manager, CFO, or Admin
3. IF an unauthenticated request is received, THEN THE system SHALL return HTTP 401
4. IF an authenticated user without sufficient role attempts access, THEN THE system SHALL return HTTP 403

### Requirement 13: Alert Log Persistence

**User Story:** As a system, I want all blocked ERROR events persisted to a structured table, so that they are queryable for audit and reporting.

#### Acceptance Criteria

1. THE AlertLogService SHALL persist every blocked ERROR event to the alert_log table in the reports schema
2. THE AlertLogService SHALL store: id (UUID), alertCode, alertMessage, txType, txData (full DTO snapshot as JSON), itemId, warehouseId, period, userId, and createdAt
3. THE AlertLogService SHALL create entries atomically — if persistence fails, the original DomainException SHALL still be thrown to block the TX

### Requirement 14: Server-Side Pagination

**User Story:** As a frontend developer, I want all report endpoints to support consistent pagination, so that large datasets are handled efficiently.

#### Acceptance Criteria

1. THE ReportQueryService SHALL support offset-based pagination with query parameters page (default 1) and limit (default 20)
2. THE ReportQueryService SHALL return pagination metadata: `{ page, limit, total, totalPages }` in every paginated response
3. WHEN page or limit parameters are invalid (non-positive, non-integer), THEN THE system SHALL return HTTP 400 with a descriptive error message

### Requirement 15: Reports Frontend Module

**User Story:** As a user with Manager/CFO/Admin role, I want Angular report views with data tables, so that I can browse reports in the web application.

#### Acceptance Criteria

1. THE ReportsFrontendModule SHALL be a lazy-loaded Angular feature module accessible under /reports/* routes
2. THE ReportsFrontendModule SHALL display report data using Angular Material CDK Table with server-side pagination controls
3. THE ReportsFrontendModule SHALL provide filter forms for each report type (stock balance, AP aging, AR aging, alert history)
4. THE ReportsFrontendModule SHALL display a dashboard view with summary metrics and recent alerts
5. WHEN the API returns an error, THEN THE ReportsFrontendModule SHALL display a user-friendly error message in Thai
