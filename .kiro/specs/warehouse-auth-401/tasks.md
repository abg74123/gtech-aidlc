# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Authenticated Users Get 401 on Guarded Warehouse Endpoints
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists (JWT strategy not resolvable in WarehouseModule scope)
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — authenticated requests with valid JWT to guarded warehouse controllers (CountSessionController, TransferController, WriteOffController)
  - Create test file: `libs/warehouse/feature/src/__tests__/warehouse-auth-bug-condition.spec.ts`
  - Use `@nestjs/testing` Test.createTestingModule with the real `WarehouseModule` and `AuthModule` NOT imported (unfixed state)
  - Use Supertest to send requests with a valid JWT token to:
    - `GET /api/v1/warehouse/count-sessions` (expects 401 on unfixed code)
    - `GET /api/v1/warehouse/transfers` (expects 401 on unfixed code)
    - `GET /api/v1/warehouse/write-offs` (expects 401 on unfixed code)
  - Property: For all requests where `isBugCondition(request)` holds (valid JWT + guarded warehouse endpoint), the response status should NOT be 401 and user context should be extracted
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists: NestJS cannot resolve `jwt` Passport strategy in WarehouseModule scope)
  - Document counterexamples found (e.g., "GET /api/v1/warehouse/count-sessions with valid JWT returns 401 instead of 200")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unauthenticated, Unauthorized, and Unguarded Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file: `libs/warehouse/feature/src/__tests__/warehouse-auth-preservation.spec.ts`
  - Observe behavior on UNFIXED code for non-buggy inputs (cases where `isBugCondition` returns false):
    - Observe: `GET /api/v1/warehouse/count-sessions` with NO token → returns 401 on unfixed code
    - Observe: `GET /api/v1/warehouse/count-sessions` with INVALID/expired token → returns 401 on unfixed code
    - Observe: `GET /api/v1/warehouse/master-data/items` with NO token → returns 200 on unfixed code (unguarded)
    - Observe: `GET /api/v1/warehouse/master-data/warehouses` with NO token → returns 200 on unfixed code (unguarded)
  - Write property-based tests capturing observed behavior patterns:
    - Property: For all requests with missing/invalid tokens to guarded endpoints, response is 401
    - Property: For all requests to master-data endpoints (unguarded), response is 200 regardless of auth state
    - Property: Transaction endpoints (`/api/v1/transactions/*`) continue to authenticate correctly (independent of warehouse fix)
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for missing AuthModule import in WarehouseModule

  - [x] 3.1 Implement the fix
    - Add import statement: `import { AuthModule } from '@autoflow/shared-auth';` to `libs/warehouse/feature/src/lib/warehouse.module.ts`
    - Add `AuthModule` to the `@Module({ imports: [...] })` array: `imports: [WarehouseDataAccessModule, AuthModule]`
    - Pattern reference: matches existing working pattern in `TransactionsModule` which already imports `AuthModule`
    - No other changes required — controllers already correctly use `JwtAuthGuard`, `RolesGuard`, `Roles`, and `CurrentUser` from `@autoflow/shared-auth`
    - _Bug_Condition: isBugCondition(request) where request.targetModule == "WarehouseModule" AND request.hasValidJwtToken == true AND controllerUsesGuard(request.targetController, JwtAuthGuard)_
    - _Expected_Behavior: For all requests satisfying bug condition, response.status != 401 AND response.userContext is extracted from JWT_
    - _Preservation: Unauthenticated requests still get 401, invalid tokens still get 401, insufficient roles still get 403, master-data remains unguarded, transaction endpoints unaffected_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Authenticated Users Access Guarded Warehouse Endpoints
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (valid JWT → successful auth, not 401)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1: `npx jest libs/warehouse/feature/src/__tests__/warehouse-auth-bug-condition.spec.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — JWT strategy now resolvable in WarehouseModule scope)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Unauthenticated, Unauthorized, and Unguarded Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2: `npx jest libs/warehouse/feature/src/__tests__/warehouse-auth-preservation.spec.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — unauthenticated still 401, master-data still open, transactions unaffected)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full warehouse test suite: `npx nx test warehouse-feature`
  - Run shared-auth tests to confirm no side effects: `npx nx test shared-auth`
  - Ensure all tests pass, ask the user if questions arise.
