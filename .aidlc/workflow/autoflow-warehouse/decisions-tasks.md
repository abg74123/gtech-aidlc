# Tasks Decisions — Unit 3: คลังสินค้า (Warehouse Operations)

## Context Summary
- **Unit**: warehouse (คลังสินค้า)
- **Design**: 5 components, 6 entities, 14 endpoints, 9 PBT properties
- **Stories**: 4 (US-022, US-023, US-024, US-025)
- **Stack**: Angular Material / NestJS / PostgreSQL / Prisma
- **Mock Strategy**: Interface + Mock implementation (self-contained)
- **Constraint**: ไม่ link กับ real data จาก team อื่น — ใช้ mock services + JSON fixtures

---

## Decision Questions

### D4-1: Task Breakdown Strategy
**Question**: จะแบ่ง tasks อย่างไรสำหรับ warehouse unit (5 components, 14 endpoints)?
- 1) Component-first — build services ก่อน, แล้ว controller, แล้ว UI **(Recommended)**
- 2) Vertical slice — ทำ Stock Count ครบ (backend+frontend) ก่อน, แล้ว Transfer, แล้ว Write-off
- 3) Layer-by-layer — data layer ทั้งหมดก่อน, แล้ว service layer, แล้ว API, แล้ว UI
- 4) Other (please specify): _______

**Answer**: 
2
---

### D4-2: Implementation Approach
**Question**: จะเขียน tests อย่างไร?
- 1) Test-first (TDD) — เขียน test ก่อน implement **(Recommended)**
- 2) Test-after — implement ก่อน, เขียน test ทีหลัง
- 3) Outside-in — เริ่มจาก E2E/integration test, แล้ว drill down
- 4) Other (please specify): _______

**Answer**: 
2
---

### D4-3: Component Priority
**Question**: จะ build component ไหนก่อน?
- 1) Mock services + Data layer ก่อน — เป็น foundation ของทุก feature **(Recommended)**
- 2) StockCountService ก่อน — complex ที่สุด, ลด risk
- 3) WarehouseController ก่อน — validate API contract เร็ว
- 4) Other (please specify): _______

**Answer**: 
1
---

### D4-4: Testing Scope
**Question**: จะ test ถึงระดับไหนใน phase นี้?
- 1) Unit + Integration + PBT — ครบ pyramid **(Recommended)**
- 2) Unit + PBT only — skip integration tests
- 3) Unit only — defer PBT and integration to later
- 4) Other (please specify): _______

**Answer**: 
1
---

### D4-5: Task Granularity
**Question**: ขนาด task ที่เหมาะสม?
- 1) Standard (1-2 days per task) — balanced **(Recommended)**
- 2) Fine-grained (2-4 hours per task) — more checkpoints
- 3) Coarse (3-5 days per task) — fewer tasks, bigger chunks
- 4) Other (please specify): _______

**Answer**: 
1
---

### D4-6: Frontend Priority
**Question**: จะทำ Angular UI เมื่อไหร่?
- 1) After backend complete — backend ทำงานได้ก่อน, แล้วค่อยทำ UI **(Recommended)**
- 2) Parallel with backend — ทำ UI พร้อมกัน (ใช้ mock API)
- 3) UI first — prototype UI ก่อน, แล้ว connect backend
- 4) Other (please specify): _______

**Answer**: 
1
---

## Decisions Summary
<!-- Machine-readable compact summary. Downstream agents: read ONLY this section. -->
<!-- Auto-populated after user fills answers above. One line per decision. -->
- D4-1 Strategy: Vertical slice — Stock Count ครบก่อน, แล้ว Transfer, แล้ว Write-off
- D4-2 Testing Approach: Test-after — implement ก่อน, เขียน test ทีหลัง
- D4-3 Priority: Mock services + Data layer ก่อน — foundation ของทุก feature
- D4-4 Testing Scope: Unit + Integration + PBT — ครบ pyramid
- D4-5 Granularity: Standard (1-2 days per task)
- D4-6 Frontend: After backend complete — backend ทำงานได้ก่อน, แล้วค่อยทำ UI

---

**Instructions**: Fill in your answers above and respond with "done"
