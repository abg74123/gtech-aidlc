# Solutions Review — autoflow

## Review Summary

- **Date**: 2026-05-20T10:00:00Z
- **Units Reviewed**: transactions (ข้อมูลพื้นฐาน), warehouse (คลังสินค้า), foundation
- **Alignment Status**: Partially Aligned
- **Issues**: 1 critical, 4 major, 5 minor

---

## Findings

### 🔴 Critical Issues

#### CR-1: Angular Version Mismatch Between Units
**Affected Units**: transactions, warehouse
**Category**: Technology
**Description**: Transactions unit specifies "Angular 17+" in its design doc, while Warehouse unit specifies "Angular 19+" with Angular Material. These are different major versions with breaking changes (Signals API maturity, control flow syntax, etc.). Both units live in the same Angular app (Foundation DF-12: single Angular app with lazy-loaded modules), so they MUST use the same Angular version.
**Impact**: Build failure — cannot have two Angular versions in a single app. If warehouse targets Angular 19 features (new template syntax, signal-based forms), transactions code targeting Angular 17 patterns may not compile or behave correctly.
**Recommendation**: Align on a single Angular version. Since warehouse explicitly chose Angular Material (which follows Angular's release cycle), align both units to the same version. Update transactions design to match. Recommend Angular 19+ as the target since it's the newer specification.
**Alternatives**: Pin to Angular 17 and update warehouse design to remove Angular 19-specific features.
**Effort**: trivial (design doc update only — no code impact if both use Signals which work in both versions)

---

### 🟡 Major Issues

#### MJ-1: Inconsistent Pagination Response Format
**Affected Units**: transactions, warehouse
**Category**: Architectural
**Description**: Transactions unit uses `meta` key for pagination metadata: `{ data: [...], meta: { page, limit, total, totalPages } }`. Warehouse unit uses `pagination` key: `{ data: [...], pagination: { page, limit, total, totalPages } }`. The internal fields are identical but the wrapper key differs.
**Impact**: Frontend code must handle two different response shapes. Shared pagination components/utilities cannot be reused across units without adapters. Inconsistent developer experience.
**Recommendation**: Standardize on one key name across all units. Recommend `meta` (shorter, common convention in NestJS ecosystem). Update warehouse API spec to use `meta` instead of `pagination`.
**Alternatives**: Use `pagination` everywhere (more explicit). Or create a shared response interceptor that normalizes the format.
**Effort**: small

---

#### MJ-2: Inconsistent Mock Service Interface Names and DI Token Strategy
**Affected Units**: transactions, warehouse
**Category**: Integration
**Description**: 
- Transactions uses string-based DI tokens: `@Inject('ITxLogService')`, `@Inject('IMaCalculationService')`, etc.
- Warehouse uses class-based mock services: `MockTxLogService implements ITxLogService` but the DI registration pattern is not explicitly documented (no `MasterDataMockModule` equivalent shown).
- Interface names differ slightly: Transactions uses `IMaCalculationService`, Warehouse uses `IMockMaService` / `MockMaService`.
- Both units mock the same Master Data services but with potentially different interface contracts.
**Impact**: When linking to real Master Data module, both units must use the same interface. If interface names or method signatures differ, the swap will require refactoring in one or both units. Shared interface contract in `libs/shared-types/` may not match both mock implementations.
**Recommendation**: 
1. Standardize interface names in `libs/shared-types/`: `ITxLogService`, `IMaCalculationService`, `IStockValidationService`, `IPeriodService`
2. Both units should use the same DI token pattern (string-based tokens as transactions does, since it's more explicit for cross-module injection)
3. Document the canonical interface in shared-types with exact method signatures
**Alternatives**: Use abstract classes instead of interfaces for DI tokens (avoids string tokens entirely).
**Effort**: medium

---

#### MJ-3: Frontend State Management Inconsistency — No UI Library Decision for Transactions
**Affected Units**: transactions, warehouse
**Category**: Architectural
**Description**: Warehouse explicitly chose Angular Material (D3-7) as its UI component library. Transactions unit has no UI library decision — it only specifies "Template-driven forms" and "Signals" but doesn't mention which component library to use for buttons, tables, dialogs, etc. Both units are lazy-loaded modules in the same Angular app.
**Impact**: If transactions uses a different UI library (or no library), the app will have inconsistent look-and-feel. Multiple UI libraries increase bundle size and create visual inconsistency. Users navigating between warehouse and transactions pages will see different component styles.
**Recommendation**: Transactions should explicitly adopt Angular Material to match warehouse. Add this as a design decision. Foundation should document Angular Material as the standard UI library for all units.
**Alternatives**: Choose a different shared library for both, or use no library with shared custom components.
**Effort**: small (design doc update + ensure transactions UI uses Material components)

---

#### MJ-4: Warehouse Controllers Use Absolute Paths Conflicting with Global Prefix
**Affected Units**: warehouse
**Category**: Integration
**Description**: Warehouse controllers hardcoded full paths in `@Controller()` decorators (e.g., `'api/v1/warehouse/count-sessions'`), but `main.ts` also applies `app.setGlobalPrefix('api/v1')`. This doubled the prefix, making actual routes `/api/v1/api/v1/warehouse/...`. Requests to the documented path `/api/v1/warehouse/count-sessions` returned 404. The transactions unit correctly uses relative paths (e.g., `'transactions/job-orders'`).
**Impact**: All warehouse API endpoints were unreachable at their documented URLs. Frontend requests to `/api/v1/warehouse/*` returned 404.
**Recommendation**: ✅ FIXED — Changed warehouse controller decorators to relative paths (`'warehouse/count-sessions'`, `'warehouse/transfers'`, `'warehouse/write-offs'`). Added `app.setGlobalPrefix('api/v1')` to test setups. Fixed pre-existing supertest import issue.
**Alternatives**: Could alternatively remove the global prefix and have all controllers use full paths, but that's inconsistent with transactions unit.
**Effort**: trivial (already resolved)

---

### 🟢 Minor Issues

#### MN-1: Inconsistent Test Directory Structure
**Affected Units**: transactions, warehouse
**Category**: Architectural
**Description**: Transactions places tests in a separate `tests/` directory at the lib root with subdirectories (unit/, integration/, properties/, e2e/). Warehouse places tests co-located with source files (`*.spec.ts` next to source). Both approaches are valid but inconsistent across the monorepo.
**Impact**: Developers switching between units must learn different test organization patterns. CI configuration may need different test path patterns per unit.
**Recommendation**: Standardize on one approach. Foundation convention says "co-located `*.spec.ts` files" — warehouse follows this. Transactions should move to co-located tests for unit tests, keeping integration/PBT in a dedicated `__tests__/` folder within the feature lib.
**Alternatives**: Keep both patterns (low impact, just confusing).
**Effort**: small

---

#### MN-2: Inconsistent Error Response Format — `code` Field
**Affected Units**: transactions, warehouse
**Category**: Architectural
**Description**: Transactions API spec defines an extended error format with `code` and `details` fields: `{ statusCode, message, error, code: "DOMAIN_ERROR_CODE", details: {...} }`. Warehouse uses standard NestJS HttpException format: `{ statusCode, message, error }` without domain-specific error codes. Foundation decision DF-4 chose "NestJS default HttpException format" but also mentions "DomainException extending HttpException with domain-specific error codes".
**Impact**: Frontend error handling must check for `code` field presence inconsistently. Shared error handling utilities cannot rely on a consistent shape.
**Recommendation**: Both units should use DomainException with error codes for domain-specific errors (as defined in SharedErrors component). Warehouse should add domain error codes (STOCK_FROZEN, INSUFFICIENT_STOCK, SESSION_WRONG_STATUS, etc.) to its error responses.
**Alternatives**: Remove `code` from transactions and use only HTTP status codes + message (simpler but less informative).
**Effort**: small

---

#### MN-3: Warehouse Design Missing Detailed Sub-Documents
**Affected Units**: warehouse
**Category**: Duplication / Completeness
**Description**: Transactions has a full modular design with separate files (components.md, data-model.md, api-spec.md, integration.md, implementation.md, correctness.md). Warehouse has a single compact design.md containing everything. While both are valid formats, the warehouse design lacks some details that transactions has: explicit Prisma schema definitions, detailed DTO class definitions, and explicit module registration code.
**Impact**: Low — the compact format is sufficient for warehouse's smaller scope (4 stories vs 16). However, implementation may require more interpretation.
**Recommendation**: Acceptable as-is given warehouse's smaller scope. If implementation reveals ambiguity, consider splitting into sub-documents.
**Alternatives**: Split warehouse design into modular format to match transactions.
**Effort**: medium (if done, but not recommended)

---

#### MN-4: Inconsistent Nx Library Structure Naming
**Affected Units**: transactions, warehouse
**Category**: Foundation Compliance
**Description**: Transactions uses `libs/transactions/data-access/`, `libs/transactions/feature/`, `libs/transactions/ui/` (3 sub-libraries). Warehouse uses `libs/warehouse/data-access/`, `libs/warehouse/feature/`, `libs/warehouse/ui/` (same pattern). This is consistent. However, warehouse also references `libs/warehouse/feature/src/mocks/` for mock services, while transactions uses `libs/transactions/feature/src/mocks/`. Both are consistent but neither extracts mocks into a separate testable library.
**Impact**: Minimal — both follow the same pattern. When linking to real Master Data, mock code will need to be removed or moved to test utilities.
**Recommendation**: Consider extracting mock services into `libs/shared-mocks/` or `libs/testing-utils/` since both units mock the same Master Data interfaces. This avoids duplication and ensures mock behavior is consistent.
**Alternatives**: Keep mocks in each unit (simpler, more isolated during development).
**Effort**: small

---

#### MN-5: Form Handling Strategy Divergence
**Affected Units**: transactions, warehouse
**Category**: Architectural
**Description**: Transactions chose Template-driven forms (D3-8) with custom validator directives. Warehouse doesn't explicitly state its form handling approach but uses Angular Material form components. Angular Material works with both Reactive and Template-driven forms, but its documentation and examples favor Reactive Forms.
**Impact**: Minor inconsistency in form patterns. Developers may find it confusing that one unit uses ngModel while another uses FormControl.
**Recommendation**: Document warehouse's form approach explicitly. If using Angular Material, Reactive Forms is the more natural fit. Accept the divergence since both work, but document the choice.
**Alternatives**: Standardize on Reactive Forms for both (would require transactions design change).
**Effort**: trivial (documentation only)

---

## Recommendations

### Immediate Actions (Before Implementation)
1. **Resolve CR-1**: Align Angular version — update transactions design to match warehouse (Angular 19+), or vice versa. Single decision for the monorepo.

### Design Refinements (Should Do)
1. **Resolve MJ-1**: Standardize pagination response key (`meta` vs `pagination`) — pick one, update the other unit's API spec.
2. **Resolve MJ-2**: Align mock service interface names and DI token patterns in `libs/shared-types/`. Document canonical interfaces.
3. **Resolve MJ-3**: Add Angular Material as the UI library for transactions unit.
4. **Resolve MJ-4**: Document proxy configuration in foundation and unit dev setup sections.

### Consolidation Opportunities (Nice to Have)
1. **MN-1**: Standardize test directory structure (co-located preferred per foundation convention).
2. **MN-2**: Add domain error codes to warehouse error responses.
3. **MN-4**: Consider shared mock library for Master Data interfaces.

---

## Conclusion

**Go/No-Go**: Conditional Go — resolve CR-1 (Angular version alignment) before implementation begins. Major issues (MJ-1 through MJ-4) should be resolved before implementation to avoid rework, but are not hard blockers.

The two units are well-aligned on core architecture (Modular Monolith, NestJS modules, Prisma, REST API, PBT with fast-check, mock-based isolation). The conflicts are primarily in documentation gaps and minor inconsistencies that are easy to resolve. The proxy configuration is correctly implemented in code — the user's concern about port 4200 vs 3000 is a documentation/understanding issue, not a code bug.
