# Design Decisions — Unit 4: รายงาน (Reports & Error Alerts)

## Context Summary
- **Unit**: รายงาน (Reports & Error Alerts)
- **Stories**: 5 (US-028 to US-032) — ERROR-level blocking alerts and report queries
- **Stack**: TypeScript / NestJS / Angular / PostgreSQL / Prisma (settled in Foundation)
- **Architecture**: Modular Monolith — NestJS module within Nx monorepo
- **Dependencies**: Reads from ข้อมูลหลัก (TX Log, Stock), ข้อมูลพื้นฐาน (AP/AR, JO), คลังสินค้า (Count sessions)
- **Constraint**: Use mockup API/JSON for cross-unit data — no real integration with other teams yet

### Pre-Settled (from Foundation)
- Repo: Nx Monorepo
- API: REST with OpenAPI/Swagger
- Auth: JWT + RBAC (6 roles)
- Errors: NestJS HttpException + DomainException
- DB: PostgreSQL, Prisma ORM, multi-schema (reports schema)
- Testing: Jest + Supertest + Playwright
- Inter-unit: Direct module imports (future), mockup for now

---

## Decision Questions

### D3-1: Alert Validation Architecture
**Question**: How should ERROR alert validations be implemented — as middleware/interceptors that run before TX POST, or as a dedicated validation service called explicitly by each TX operation?
- 1) NestJS Interceptor/Guard — auto-runs on all POST endpoints, centralized rule engine **(Recommended)**
- 2) Dedicated ValidationService — each TX service explicitly calls `alertService.validate(tx)` before POST
- 3) Event-driven — subscribe to "pre-POST" events and throw if validation fails
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-2: Alert Rule Configuration
**Question**: Should alert rules (stock negative, CN_RETURN inventory check, duplicate invoice, etc.) be hardcoded in service logic or configurable via database/config?
- 1) Hardcoded in service — rules are business-critical and rarely change, simpler to test **(Recommended)**
- 2) Database-driven rules — AlertRule table with conditions, allows runtime changes
- 3) Config file (JSON/YAML) — rules defined in config, loaded at startup
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-3: Error Logging & Alert Storage
**Question**: Where should blocked ERROR events be stored for audit/reporting purposes?
- 1) Dedicated `alert_log` table in reports schema — structured, queryable **(Recommended)**
- 2) Application log only (structured JSON) — simpler, use log aggregation for queries
- 3) Both — alert_log table + application log for redundancy
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-4: Report Data Access Pattern
**Question**: How should reports (stock balance, AP/AR aging) access data from other units' schemas?
- 1) Cross-schema Prisma queries — direct read from transactions/master_data schemas **(Recommended)**
- 2) Materialized views — pre-computed views in reports schema, refreshed periodically
- 3) Data replication — copy relevant data into reports schema via events
- 4) Mockup JSON service for now, real queries later
- 5) Other (please specify): _______

**Answer**: 1

---

### D3-5: Report Query Performance
**Question**: For stock balance and AP/AR aging reports, what approach for handling potentially large datasets?
- 1) Server-side pagination + filtering — standard REST pagination with query params **(Recommended)**
- 2) Cursor-based pagination — better for real-time scrolling
- 3) Pre-aggregated summary tables — batch-computed, fast reads
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-6: Frontend Report UI Components
**Question**: What UI component approach for report tables and data display in Angular?
- 1) Angular Material (CDK Table) — official Angular component library **(Recommended)**
- 2) PrimeNG — rich data table with built-in features (sort, filter, export)
- 3) AG Grid — enterprise-grade grid, powerful but heavier
- 4) Custom HTML tables with Tailwind — lightweight, full control
- 5) Other (please specify): _______

**Answer**: 1

---

### D3-7: Report Export Format
**Question**: Should reports support export functionality in MVP, and if so, what format?
- 1) No export in MVP — view-only, export deferred **(Recommended)**
- 2) CSV export — simple, universal
- 3) Excel (XLSX) export — richer formatting
- 4) Both CSV and Excel
- 5) Other (please specify): _______

**Answer**: 1

---

### D3-8: Mockup Data Strategy
**Question**: Since other units aren't built yet, how should this unit mock cross-unit dependencies for development and testing?
- 1) In-memory mock services implementing shared interfaces — injectable, testable **(Recommended)**
- 2) JSON fixture files loaded at startup — static data
- 3) Separate mock API server (e.g., json-server) — independent process
- 4) Seed database with representative test data in all schemas
- 5) Other (please specify): _______

**Answer**: 1

---

### D3-9: Correctness & Property-Based Testing
**Question**: Should this unit use property-based testing (PBT) to verify alert validation correctness?
- 1) Yes — PBT for alert validation rules (e.g., "any TX causing negative stock MUST be blocked") **(Recommended)**
- 2) No — standard unit tests are sufficient for 5 alert rules
- 3) Partial — PBT only for the most complex rule (stock negative across concurrent TXs)
- 4) Other (please specify): _______

**Answer**: 1

---

## Decisions Summary
<!-- Machine-readable compact summary. Downstream agents: read ONLY this section. -->
- D3-1 Alert Architecture: NestJS Interceptor/Guard — centralized rule engine auto-runs on POST endpoints
- D3-2 Rule Configuration: Hardcoded in service — business-critical, rarely change, simpler to test
- D3-3 Error Logging: Dedicated alert_log table in reports schema — structured, queryable
- D3-4 Report Data Access: Cross-schema Prisma queries — direct read from transactions/master_data schemas
- D3-5 Report Performance: Server-side pagination + filtering — standard REST with query params
- D3-6 Frontend UI: Angular Material (CDK Table) — official Angular component library
- D3-7 Report Export: No export in MVP — view-only, deferred
- D3-8 Mockup Strategy: In-memory mock services implementing shared interfaces — injectable, testable
- D3-9 PBT: Yes — PBT for alert validation rules

---

**Instructions**: Fill in your answers above and respond with "design decisions complete"
