# Design Decisions — Unit 3: คลังสินค้า (Warehouse Operations)

## Context Summary
- **Unit**: warehouse (คลังสินค้า)
- **Stories**: 4 (US-022, US-023, US-024, US-025) — Stock Count Up/Down, Transfer, Write-off
- **Complexity**: Medium
- **Dependencies**: ข้อมูลหลัก (Master Data) — TX Log, MA, Stock validation, Period check
- **Constraint**: ใช้ Mockup API/JSON แทนข้อมูลจริงจาก team อื่น — ทำให้ unit นี้ทำงานได้อิสระ
- **Foundation Decisions (settled)**: Monorepo/Nx, JWT+RBAC, NestJS HttpException, Direct module imports, Single DB multi-schema (warehouse schema), Prisma, REST+OpenAPI, Jest+Supertest+Playwright, Angular lazy-loaded modules

---

## Decision Questions

### D3-1: Stock Count Session Architecture
**Question**: Stock Count ต้อง freeze stock ระหว่าง count — จะ implement freeze mechanism อย่างไร?
- 1) Database flag per item+warehouse — `is_frozen=true` column, check on every stock TX **(Recommended)**
- 2) Separate freeze table — `stock_freeze` table tracking active freeze sessions
- 3) Optimistic locking — version column, reject if changed during count
- 4) Other (please specify): _______

**Answer**: 
1
---

### D3-2: Stock Transfer — Two-Phase vs Single TX
**Question**: Stock Transfer ระหว่าง warehouse ควร implement เป็น 1 TX หรือ 2 TX (source out + destination in)?
- 1) Single TX with ADJ_TRANSFER type — atomic decrease source + increase destination in one TX **(Recommended)**
- 2) Two TX — ADJ_TRANSFER_OUT + ADJ_TRANSFER_IN with IN_TRANSIT status tracking
- 3) Transfer Order pattern — create order, confirm dispatch, confirm receipt (3 steps)
- 4) Other (please specify): _______

**Answer**: 
1
---

### D3-3: Approval Threshold Configuration
**Question**: Approval threshold (< 1,000 = Supervisor, 1,000-10,000 = Manager, > 10,000 = CFO) ควรเก็บที่ไหน?
- 1) Database configuration table — `approval_thresholds` table, admin can update **(Recommended)**
- 2) Application config (environment variables) — fixed at deploy time
- 3) Hardcoded constants — simple, change requires code deploy
- 4) Other (please specify): _______

**Answer**: 
4: unlimited threshold no matter which roles.
---

### D3-4: Write-off Evidence Storage
**Question**: ADJ_WRITEOFF ต้องมี evidence of destruction — จะเก็บ attachment อย่างไร?
- 1) Local file storage (uploads directory) — simple for MVP, migrate later **(Recommended)**
- 2) Cloud object storage (S3/GCS) — scalable but needs cloud setup
- 3) Database BLOB — simple but impacts DB performance
- 4) Other (please specify): _______

**Answer**: 
1
---

### D3-5: Mockup Strategy for Master Data Dependencies
**Question**: Unit นี้ต้อง depend on Master Data (TX Log, MA, Stock validation) — จะ mock อย่างไรให้ทำงานอิสระได้?
- 1) Interface + Mock implementation — define interface, provide mock service with in-memory/JSON data **(Recommended)**
- 2) Seed database with test data — pre-populate master_data schema with fixtures
- 3) HTTP mock server (e.g., json-server) — separate process serving mock API
- 4) Other (please specify): _______

**Answer**: 
1
---

### D3-6: Count Session Lifecycle
**Question**: Stock Count session ควรมี lifecycle อย่างไร?
- 1) INITIATED → COUNTING → PENDING_APPROVAL → APPROVED → COMPLETED **(Recommended)**
- 2) OPEN → IN_PROGRESS → CLOSED (simple 3-state)
- 3) DRAFT → ACTIVE → REVIEW → POSTED (align with TX status pattern)
- 4) Other (please specify): _______

**Answer**: 
1
---

### D3-7: Frontend Component Strategy
**Question**: Angular UI สำหรับ Warehouse module ควรใช้ component library อะไร?
- 1) Angular Material — official, well-maintained, consistent with Angular ecosystem **(Recommended)**
- 2) PrimeNG — rich components, good for data-heavy enterprise apps
- 3) Custom components with Tailwind CSS — full control, lightweight
- 4) Other (please specify): _______

**Answer**: 
1
---

### D3-8: Correctness & Property-Based Testing
**Question**: จะใช้ Property-Based Testing (PBT) เพื่อ verify correctness properties ของ warehouse operations หรือไม่?
- 1) Yes — PBT for critical invariants (stock never negative after count, MA correct after adjustment, freeze blocks other TX) **(Recommended)**
- 2) No — rely on example-based unit tests only
- 3) Partial — PBT for MA calculation only, example-based for the rest
- 4) Other (please specify): _______

**Answer**: 
1
---

## Decisions Summary
<!-- Machine-readable compact summary. Downstream agents: read ONLY this section. -->
<!-- Auto-populated after user fills answers above. One line per decision. -->
- D3-1 Freeze Mechanism: Database flag per item+warehouse (is_frozen column, check on every stock TX)
- D3-2 Transfer Pattern: Single TX with ADJ_TRANSFER type — atomic decrease source + increase destination
- D3-3 Approval Config: Unlimited threshold — no role-based threshold differentiation, any authorized role can approve
- D3-4 Evidence Storage: Local file storage (uploads directory) — simple for MVP
- D3-5 Mock Strategy: Interface + Mock implementation — define interface, provide mock service with in-memory/JSON data
- D3-6 Count Lifecycle: INITIATED → COUNTING → PENDING_APPROVAL → APPROVED → COMPLETED
- D3-7 UI Library: Angular Material
- D3-8 PBT: Yes — PBT for critical invariants (stock never negative, MA correct, freeze blocks TX)

---

**Instructions**: Fill in your answers above and respond with "done"
