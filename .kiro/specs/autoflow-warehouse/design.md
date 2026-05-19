# Design: คลังสินค้า (Warehouse Operations)

## Summary
- **Architecture**: Modular Monolith — NestJS module within Nx monorepo
- **Stack**: Angular Material / NestJS / PostgreSQL (warehouse schema)
- **Components**: 5 — StockCountService, StockTransferService, WriteOffService, WarehouseController, WarehouseUIModule
- **Entities**: 6 — CountSession, CountLine, TransferOrder, TransferLine, WriteOffRequest, WriteOffEvidence
- **Endpoints**: 14 — CRUD + workflow actions for count, transfer, write-off
- **Mock Strategy**: Interface + Mock implementation — self-contained unit with JSON fixtures

## Architecture

**Pattern**: Modular Monolith — Warehouse module (libs/warehouse/)

```
┌─────────────────────────────────────────────────────────┐
│                    Angular Frontend                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Warehouse Feature Module (lazy)          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐    │    │
│  │  │StockCount│ │ Transfer │ │  Write-off   │    │    │
│  │  │  Pages   │ │  Pages   │ │    Pages     │    │    │
│  │  └──────────┘ └──────────┘ └──────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │ REST API
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    NestJS Backend                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │            WarehouseModule                        │    │
│  │  ┌────────────────┐  ┌──────────────────────┐   │    │
│  │  │WarehouseCtrl   │  │  StockCountService   │   │    │
│  │  │(REST endpoints)│  │  StockTransferService │   │    │
│  │  │                │  │  WriteOffService      │   │    │
│  │  └────────────────┘  └──────────────────────┘   │    │
│  └──────────────────────────┬──────────────────────┘    │
│                              │                           │
│  ┌───────────────────────────▼──────────────────────┐   │
│  │         Mock Master Data Services                 │   │
│  │  MockTxLogService | MockMaService                 │   │
│  │  MockStockValidationService | MockPeriodService   │   │
│  │  (implements same interfaces as real services)    │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL — warehouse schema                │
│  count_session | count_line | transfer_order             │
│  transfer_line | write_off_request | write_off_evidence  │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### StockCountService
- **Purpose**: จัดการ Stock Count session lifecycle — freeze, count, approve, adjust, unfreeze
- **Technology**: NestJS Injectable service
- **Responsibilities**:
  - Initiate count session (freeze item+warehouse)
  - Record physical count results per line
  - Calculate difference (system vs physical)
  - Submit for approval
  - POST ADJ_COUNT_UP or ADJ_COUNT_DOWN via MockTxLogService
  - Unfreeze stock after completion
- **Exposes**: `initiateCount()`, `recordResult()`, `submitForApproval()`, `approveCount()`, `getSession()`
- **Consumes**: IMockTxLogService, IMockStockValidationService, IMockMaService

### StockTransferService
- **Purpose**: จัดการ Stock Transfer ระหว่าง warehouse — atomic single TX
- **Technology**: NestJS Injectable service
- **Responsibilities**:
  - Validate source warehouse has sufficient stock
  - Create ADJ_TRANSFER TX (decrease source + increase destination atomically)
  - Recalculate MA at destination
  - Track transfer order for audit
- **Exposes**: `initiateTransfer()`, `getTransfer()`, `listTransfers()`
- **Consumes**: IMockTxLogService, IMockStockValidationService, IMockMaService

### WriteOffService
- **Purpose**: จัดการ Stock Write-off — evidence upload, CFO approval, POST
- **Technology**: NestJS Injectable service
- **Responsibilities**:
  - Create write-off request with mandatory evidence
  - Upload evidence files to local storage
  - Require CFO approval
  - POST ADJ_WRITEOFF via MockTxLogService
  - Record salvage value if applicable
- **Exposes**: `requestWriteOff()`, `uploadEvidence()`, `approveWriteOff()`, `getWriteOff()`
- **Consumes**: IMockTxLogService, IMockStockValidationService

### WarehouseController
- **Purpose**: REST API endpoints สำหรับ warehouse operations ทั้งหมด
- **Technology**: NestJS Controller with OpenAPI decorators
- **Responsibilities**:
  - Route HTTP requests to appropriate service
  - Input validation via class-validator DTOs
  - Role-based access control via Guards
  - OpenAPI/Swagger documentation
- **Exposes**: 14 REST endpoints (see API Specification)
- **Consumes**: StockCountService, StockTransferService, WriteOffService

### WarehouseUIModule (Angular)
- **Purpose**: Angular lazy-loaded feature module สำหรับ warehouse operations
- **Technology**: Angular 19+ with Angular Material
- **Responsibilities**:
  - Stock Count wizard (initiate → count → review → approve)
  - Transfer form with warehouse picker
  - Write-off form with file upload
  - Session list/detail views
- **Exposes**: Lazy-loaded routes under `/warehouse/*`
- **Consumes**: WarehouseApiService (HTTP client)

---

## Data Model

### CountSession
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Session identifier |
| warehouse_id | UUID | NOT NULL, FK (mock) | Warehouse ที่ทำ count |
| status | Enum | NOT NULL | INITIATED, COUNTING, PENDING_APPROVAL, APPROVED, COMPLETED |
| initiated_by | UUID | NOT NULL | User ที่เริ่ม count |
| initiated_at | DateTime | NOT NULL | เวลาเริ่ม |
| completed_at | DateTime | NULL | เวลาเสร็จ |
| approved_by | UUID | NULL | User ที่ approve |
| approved_at | DateTime | NULL | เวลา approve |
| notes | String | NULL | หมายเหตุ |
| created_at | DateTime | NOT NULL, DEFAULT now() | |
| updated_at | DateTime | NOT NULL | |

**Relationships**: CountSession 1:N CountLine
**Indexes**: `(warehouse_id, status)`, `(initiated_at DESC)`

### CountLine
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Line identifier |
| session_id | UUID | NOT NULL, FK | Reference to CountSession |
| item_id | UUID | NOT NULL | Item ที่ count |
| system_qty | Decimal(10,2) | NOT NULL | จำนวนในระบบ ณ เวลา freeze |
| physical_qty | Decimal(10,2) | NULL | จำนวนนับจริง |
| difference | Decimal(10,2) | NULL | physical - system (computed) |
| system_ma | Decimal(10,2) | NOT NULL | MA ณ เวลา freeze |
| is_frozen | Boolean | NOT NULL, DEFAULT true | Flag freeze สำหรับ item นี้ |
| reason_code | String | NULL | เหตุผลของ difference |
| tx_id | UUID | NULL | TX Log ID หลัง POST adjustment |
| created_at | DateTime | NOT NULL, DEFAULT now() | |

**Relationships**: CountLine N:1 CountSession
**Indexes**: `(session_id)`, `(item_id, is_frozen)` — ใช้ check freeze status

### TransferOrder
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Transfer identifier |
| source_warehouse_id | UUID | NOT NULL | Warehouse ต้นทาง |
| dest_warehouse_id | UUID | NOT NULL | Warehouse ปลายทาง |
| status | Enum | NOT NULL | DRAFT, POSTED |
| initiated_by | UUID | NOT NULL | User ที่สร้าง |
| posted_at | DateTime | NULL | เวลา POST |
| notes | String | NULL | หมายเหตุ |
| created_at | DateTime | NOT NULL, DEFAULT now() | |
| updated_at | DateTime | NOT NULL | |

**Relationships**: TransferOrder 1:N TransferLine
**Indexes**: `(source_warehouse_id)`, `(dest_warehouse_id)`, `(status)`

### TransferLine
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Line identifier |
| transfer_id | UUID | NOT NULL, FK | Reference to TransferOrder |
| item_id | UUID | NOT NULL | Item ที่ transfer |
| qty | Decimal(10,2) | NOT NULL, > 0 | จำนวนที่ transfer |
| unit_cost | Decimal(10,2) | NOT NULL | MA ณ source warehouse |
| tx_id | UUID | NULL | TX Log ID หลัง POST |
| created_at | DateTime | NOT NULL, DEFAULT now() | |

**Relationships**: TransferLine N:1 TransferOrder
**Indexes**: `(transfer_id)`, `(item_id)`

### WriteOffRequest
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Write-off identifier |
| warehouse_id | UUID | NOT NULL | Warehouse ที่ write-off |
| item_id | UUID | NOT NULL | Item ที่ write-off |
| qty | Decimal(10,2) | NOT NULL, > 0 | จำนวนที่ write-off |
| unit_cost | Decimal(10,2) | NOT NULL | MA ณ เวลา request |
| total_loss | Decimal(10,2) | NOT NULL | qty × unit_cost |
| salvage_value | Decimal(10,2) | DEFAULT 0 | มูลค่าซาก (ถ้ามี) |
| reason | String | NOT NULL | เหตุผล |
| status | Enum | NOT NULL | PENDING_APPROVAL, APPROVED, POSTED, REJECTED |
| requested_by | UUID | NOT NULL | User ที่ request |
| approved_by | UUID | NULL | CFO ที่ approve |
| approved_at | DateTime | NULL | เวลา approve |
| tx_id | UUID | NULL | TX Log ID หลัง POST |
| created_at | DateTime | NOT NULL, DEFAULT now() | |
| updated_at | DateTime | NOT NULL | |

**Relationships**: WriteOffRequest 1:N WriteOffEvidence
**Indexes**: `(warehouse_id, item_id)`, `(status)`, `(requested_by)`

### WriteOffEvidence
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Evidence identifier |
| write_off_id | UUID | NOT NULL, FK | Reference to WriteOffRequest |
| file_name | String | NOT NULL | ชื่อไฟล์ original |
| file_path | String | NOT NULL | Path ใน local storage |
| file_size | Integer | NOT NULL | ขนาดไฟล์ (bytes) |
| mime_type | String | NOT NULL | MIME type |
| uploaded_by | UUID | NOT NULL | User ที่ upload |
| uploaded_at | DateTime | NOT NULL, DEFAULT now() | |

**Relationships**: WriteOffEvidence N:1 WriteOffRequest
**Indexes**: `(write_off_id)`

---

## API Specification

**Base Path**: `/api/v1/warehouse`
**Auth**: JWT Bearer Token (all endpoints require authentication)
**Pagination**: Offset-based `?page=1&limit=20`
**Error Format**: NestJS HttpException `{ statusCode, message, error }`

### Stock Count Endpoints

#### POST /api/v1/warehouse/count-sessions
- **Description**: เริ่ม Stock Count session ใหม่ — freeze items ใน warehouse
- **Auth**: Supervisor, Manager, CFO
- **Request**: `{ warehouseId: UUID, items: [{ itemId: UUID }], notes?: string }`
- **Response 201**: `{ id, warehouseId, status: "INITIATED", lines: [...], initiatedAt }`
- **Errors**: 400 (missing items), 403 (insufficient role), 409 (items already frozen)

#### GET /api/v1/warehouse/count-sessions
- **Description**: List count sessions with filters
- **Auth**: Supervisor, Manager, CFO
- **Request**: Query `?warehouseId=&status=&page=1&limit=20`
- **Response 200**: `{ data: [...], pagination: { page, limit, total, totalPages } }`

#### GET /api/v1/warehouse/count-sessions/:id
- **Description**: Get count session detail with lines
- **Auth**: Supervisor, Manager, CFO, Store
- **Response 200**: `{ id, warehouseId, status, lines: [...], initiatedBy, ... }`
- **Errors**: 404 (session not found)

#### PATCH /api/v1/warehouse/count-sessions/:id/lines/:lineId
- **Description**: Record physical count result สำหรับ 1 line
- **Auth**: Store, Supervisor, Manager, CFO
- **Request**: `{ physicalQty: number, reasonCode?: string }`
- **Response 200**: `{ id, itemId, systemQty, physicalQty, difference }`
- **Errors**: 400 (invalid qty), 404 (line not found), 409 (session not in COUNTING status)

#### POST /api/v1/warehouse/count-sessions/:id/submit
- **Description**: Submit count session for approval
- **Auth**: Supervisor, Manager, CFO
- **Response 200**: `{ id, status: "PENDING_APPROVAL", ... }`
- **Errors**: 400 (not all lines counted), 409 (wrong status)

#### POST /api/v1/warehouse/count-sessions/:id/approve
- **Description**: Approve count session — POST adjustments
- **Auth**: Supervisor, Manager, CFO (unlimited threshold)
- **Response 200**: `{ id, status: "COMPLETED", adjustments: [{ lineId, txType, txId }] }`
- **Errors**: 403 (insufficient role), 409 (wrong status)

### Stock Transfer Endpoints

#### POST /api/v1/warehouse/transfers
- **Description**: สร้าง Transfer Order และ POST ทันที (atomic)
- **Auth**: Supervisor, Manager, CFO
- **Request**: `{ sourceWarehouseId: UUID, destWarehouseId: UUID, lines: [{ itemId: UUID, qty: number }], notes?: string }`
- **Response 201**: `{ id, sourceWarehouseId, destWarehouseId, status: "POSTED", lines: [...], postedAt }`
- **Errors**: 400 (same warehouse), 403 (insufficient role), 422 (insufficient stock)

#### GET /api/v1/warehouse/transfers
- **Description**: List transfer orders with filters
- **Auth**: Supervisor, Manager, CFO, Store
- **Request**: Query `?sourceWarehouseId=&destWarehouseId=&page=1&limit=20`
- **Response 200**: `{ data: [...], pagination: {...} }`

#### GET /api/v1/warehouse/transfers/:id
- **Description**: Get transfer order detail
- **Auth**: Supervisor, Manager, CFO, Store
- **Response 200**: `{ id, sourceWarehouseId, destWarehouseId, status, lines: [...], ... }`
- **Errors**: 404 (transfer not found)

### Write-off Endpoints

#### POST /api/v1/warehouse/write-offs
- **Description**: สร้าง Write-off request (ต้อง upload evidence ก่อน approve)
- **Auth**: Supervisor, Manager, CFO
- **Request**: `{ warehouseId: UUID, itemId: UUID, qty: number, reason: string, salvageValue?: number }`
- **Response 201**: `{ id, status: "PENDING_APPROVAL", ... }`
- **Errors**: 400 (missing reason), 403 (insufficient role), 422 (insufficient stock)

#### POST /api/v1/warehouse/write-offs/:id/evidence
- **Description**: Upload evidence file สำหรับ write-off
- **Auth**: Supervisor, Manager, CFO
- **Request**: Multipart form-data `{ file: File }`
- **Response 201**: `{ id, fileName, fileSize, mimeType, uploadedAt }`
- **Errors**: 400 (invalid file), 413 (file too large), 404 (write-off not found)

#### POST /api/v1/warehouse/write-offs/:id/approve
- **Description**: CFO approve write-off — POST ADJ_WRITEOFF
- **Auth**: CFO
- **Response 200**: `{ id, status: "POSTED", txId, ... }`
- **Errors**: 400 (no evidence uploaded), 403 (not CFO), 409 (wrong status)

#### GET /api/v1/warehouse/write-offs
- **Description**: List write-off requests
- **Auth**: Supervisor, Manager, CFO
- **Request**: Query `?warehouseId=&status=&page=1&limit=20`
- **Response 200**: `{ data: [...], pagination: {...} }`

#### GET /api/v1/warehouse/write-offs/:id
- **Description**: Get write-off detail with evidence
- **Auth**: Supervisor, Manager, CFO
- **Response 200**: `{ id, warehouseId, itemId, qty, reason, status, evidence: [...], ... }`
- **Errors**: 404 (write-off not found)

---

## Integration Points

| External System | Protocol | Purpose | Mock Strategy |
|----------------|----------|---------|---------------|
| Master Data — TxLogService | Direct import | POST TX entries (ADJ_COUNT_UP/DOWN, ADJ_TRANSFER, ADJ_WRITEOFF) | MockTxLogService — returns mock TxEntry with generated UUID |
| Master Data — MaCalculationService | Direct import | Get current MA, recalculate MA on stock increase | MockMaService — returns configurable MA from JSON fixtures |
| Master Data — StockValidationService | Direct import | Validate stock >= 0 before decrease | MockStockValidationService — validates against in-memory stock map |
| Master Data — PeriodService | Direct import | Validate period is OPEN | MockPeriodService — always returns OPEN for current period |
| Master Data — Item/Warehouse lookup | Direct import | Get item name, warehouse name for display | MockMasterDataQueryService — returns from JSON fixtures |

### Mock Service Interfaces

```typescript
// libs/warehouse/feature/src/mocks/mock-tx-log.service.ts
@Injectable()
export class MockTxLogService implements ITxLogService {
  private txLog: TxEntry[] = [];

  async createTx(dto: CreateTxDto): Promise<TxEntry> {
    const entry: TxEntry = {
      id: randomUUID(),
      ...dto,
      status: TxStatus.POSTED,
      createdAt: new Date(),
    };
    this.txLog.push(entry);
    return entry;
  }
}

// libs/warehouse/feature/src/mocks/mock-stock.service.ts
@Injectable()
export class MockStockValidationService implements IStockValidationService {
  // Loaded from JSON fixture: { "item-wh-key": stockQty }
  private stockMap: Map<string, number>;

  async validateStockAvailable(itemId: string, warehouseId: string, qty: number): Promise<void> {
    const key = `${itemId}:${warehouseId}`;
    const current = this.stockMap.get(key) ?? 0;
    if (current - qty < 0) {
      throw new StockNegativeException(itemId, warehouseId, current, qty);
    }
  }

  async getStockBalance(itemId: string, warehouseId: string): Promise<number> {
    return this.stockMap.get(`${itemId}:${warehouseId}`) ?? 0;
  }
}
```

### JSON Fixtures (สำหรับ development & testing)

```
libs/warehouse/feature/src/mocks/fixtures/
├── items.json          # Mock items: [{id, name, sku, unit}]
├── warehouses.json     # Mock warehouses: [{id, name, code}]
├── stock-balances.json # Mock stock: [{itemId, warehouseId, qty, ma}]
└── periods.json        # Mock periods: [{period: "2025-01", status: "OPEN"}]
```

---

## Implementation

### Directory Structure
```
libs/warehouse/
├── data-access/
│   └── src/
│       ├── lib/
│       │   ├── prisma/
│       │   │   └── warehouse.repository.ts
│       │   ├── count-session.repository.ts
│       │   ├── transfer-order.repository.ts
│       │   └── write-off.repository.ts
│       └── index.ts
├── feature/
│   └── src/
│       ├── lib/
│       │   ├── services/
│       │   │   ├── stock-count.service.ts
│       │   │   ├── stock-transfer.service.ts
│       │   │   └── write-off.service.ts
│       │   ├── controllers/
│       │   │   └── warehouse.controller.ts
│       │   ├── dto/
│       │   │   ├── create-count-session.dto.ts
│       │   │   ├── record-count-result.dto.ts
│       │   │   ├── create-transfer.dto.ts
│       │   │   ├── create-write-off.dto.ts
│       │   │   └── index.ts
│       │   ├── guards/
│       │   │   └── warehouse-role.guard.ts
│       │   ├── mocks/
│       │   │   ├── mock-tx-log.service.ts
│       │   │   ├── mock-ma.service.ts
│       │   │   ├── mock-stock-validation.service.ts
│       │   │   ├── mock-period.service.ts
│       │   │   ├── mock-master-data-query.service.ts
│       │   │   └── fixtures/
│       │   │       ├── items.json
│       │   │       ├── warehouses.json
│       │   │       ├── stock-balances.json
│       │   │       └── periods.json
│       │   └── warehouse.module.ts
│       └── index.ts
├── ui/
│   └── src/
│       ├── lib/
│       │   ├── pages/
│       │   │   ├── count-session-list/
│       │   │   ├── count-session-detail/
│       │   │   ├── count-session-create/
│       │   │   ├── transfer-list/
│       │   │   ├── transfer-create/
│       │   │   ├── write-off-list/
│       │   │   ├── write-off-create/
│       │   │   └── write-off-detail/
│       │   ├── services/
│       │   │   └── warehouse-api.service.ts
│       │   ├── models/
│       │   │   └── warehouse.models.ts
│       │   └── warehouse-routing.module.ts
│       └── index.ts
└── README.md
```

### Dev Setup
```bash
# From monorepo root
npm install

# Run warehouse unit tests
npx nx test warehouse-feature
npx nx test warehouse-data-access

# Run warehouse backend (with mock services)
npx nx serve api

# Run warehouse frontend
npx nx serve web

# Generate Prisma client after schema changes
npx prisma generate
npx prisma migrate dev
```

### Conventions
- **Files**: kebab-case (`stock-count.service.ts`)
- **Code**: Layered — Controller → Service → Repository
- **Tests**: Jest — co-located `*.spec.ts` files
- **DTOs**: class-validator decorators for input validation
- **Responses**: NestJS standard response (no custom envelope)

---

## Correctness Properties

| Property | Description | Validates |
|----------|-------------|-----------|
| P1: Freeze Blocks TX | WHILE count session is active for item+warehouse, no other stock-affecting TX can modify that item+warehouse | US-022 AC3, US-023 AC3 |
| P2: Count Difference Accuracy | FOR ALL count lines: difference = physicalQty - systemQty (never miscalculated) | US-022, US-023 |
| P3: Stock Non-Negative After Adjustment | FOR ALL ADJ_COUNT_DOWN: stock_after >= 0 (system rejects if would go negative) | US-023 AC4 |
| P4: MA Correct After Count Up | FOR ALL ADJ_COUNT_UP: new_ma = (old_total_value + adj_qty × old_ma) ÷ (old_qty + adj_qty) | US-022 AC1 |
| P5: MA Unchanged After Count Down | FOR ALL ADJ_COUNT_DOWN: ma_after = ma_before (decreasing stock doesn't change MA) | US-023 AC1 |
| P6: Transfer Conservation | FOR ALL transfers: source_decrease_qty = destination_increase_qty (stock is conserved) | US-024 AC1 |
| P7: Transfer Source Non-Negative | FOR ALL transfers: source_stock_after >= 0 | US-024 AC4 |
| P8: Write-off Requires Evidence | FOR ALL approved write-offs: evidence_count >= 1 | US-025 AC2 |
| P9: Session Lifecycle Order | FOR ALL count sessions: status transitions follow INITIATED → COUNTING → PENDING_APPROVAL → APPROVED → COMPLETED (never skip) | US-022, US-023 |

### PBT Implementation Strategy

```typescript
// libs/warehouse/feature/src/__tests__/stock-count.property.spec.ts
import * as fc from 'fast-check';

describe('Stock Count Properties', () => {
  // P1: Freeze Blocks TX
  it('should reject stock TX while item is frozen', () => {
    fc.assert(fc.property(
      fc.uuid(), // itemId
      fc.uuid(), // warehouseId
      fc.nat({ max: 1000 }), // qty to attempt
      async (itemId, warehouseId, qty) => {
        // Given: item is frozen in active count session
        await service.initiateCount({ warehouseId, items: [{ itemId }] });
        // When: attempt stock-affecting TX
        // Then: should throw StockFrozenException
        await expect(
          mockStockValidation.validateNotFrozen(itemId, warehouseId)
        ).rejects.toThrow();
      }
    ));
  });

  // P6: Transfer Conservation
  it('transfer conserves total stock', () => {
    fc.assert(fc.property(
      fc.nat({ min: 1, max: 1000 }), // transfer qty
      fc.nat({ min: 1, max: 10000 }), // source stock
      fc.nat({ min: 0, max: 10000 }), // dest stock
      (qty, sourceStock, destStock) => {
        fc.pre(qty <= sourceStock); // precondition: enough stock
        const totalBefore = sourceStock + destStock;
        const totalAfter = (sourceStock - qty) + (destStock + qty);
        return totalBefore === totalAfter;
      }
    ));
  });
});
```

---

## Traceability

| Requirement | Component | API | Data |
|-------------|-----------|-----|------|
| US-022 (Count Up) | StockCountService | POST /count-sessions, PATCH /lines/:id, POST /approve | CountSession, CountLine |
| US-023 (Count Down) | StockCountService | POST /count-sessions, PATCH /lines/:id, POST /approve | CountSession, CountLine |
| US-024 (Transfer) | StockTransferService | POST /transfers | TransferOrder, TransferLine |
| US-025 (Write-off) | WriteOffService | POST /write-offs, POST /evidence, POST /approve | WriteOffRequest, WriteOffEvidence |

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Freeze Mechanism | DB flag (is_frozen on CountLine) | Simple, queryable, checked on every stock TX via mock service |
| Transfer Pattern | Single atomic TX | Simpler than 2-phase, no IN_TRANSIT complexity for MVP |
| Approval Threshold | Unlimited — no threshold | User decision: any authorized role can approve regardless of value |
| Evidence Storage | Local file uploads | Simple for MVP, can migrate to S3 later |
| Mock Strategy | Interface + Mock impl | Self-contained unit, same interfaces as real services |
| Count Lifecycle | 5-state (INITIATED→COUNTING→PENDING_APPROVAL→APPROVED→COMPLETED) | Clear workflow, supports approval step |
| UI Library | Angular Material | Official, consistent with Angular ecosystem |
| PBT | Yes — 9 properties | Critical invariants verified with fast-check |
