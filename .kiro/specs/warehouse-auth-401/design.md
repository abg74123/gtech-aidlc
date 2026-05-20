# Warehouse Auth 401 Bugfix Design

## Overview

Authenticated users receive 401 Unauthorized on all guarded warehouse endpoints (`/api/v1/warehouse/count-sessions`, `/api/v1/warehouse/transfers`, `/api/v1/warehouse/write-offs`) because the `WarehouseModule` does not import `AuthModule`. Without this import, the Passport JWT strategy and guards (`JwtAuthGuard`, `RolesGuard`) are not available in the warehouse module's dependency injection scope. The fix is a single-line addition of `AuthModule` to the `WarehouseModule` imports array, matching the working pattern in `TransactionsModule`.

## Glossary

- **Bug_Condition (C)**: Any HTTP request to a warehouse controller endpoint decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` — the guard cannot resolve the JWT strategy because `AuthModule` is not imported
- **Property (P)**: When a valid JWT token is provided, the guard validates it, extracts user context, and allows the request to proceed to the controller handler
- **Preservation**: Existing behaviors that must remain unchanged — unauthenticated requests still get 401, unauthorized roles still get 403, master-data endpoints remain unguarded, and transaction endpoints continue working
- **WarehouseModule**: The NestJS module at `libs/warehouse/feature/src/lib/warehouse.module.ts` that encapsulates warehouse controllers and services
- **AuthModule**: The shared NestJS module at `libs/shared-auth/src/auth.module.ts` that exports `PassportModule`, `JwtModule`, `JwtStrategy`, and `AuthService`
- **JwtAuthGuard**: A Passport-based guard that validates JWT tokens — requires `PassportModule` and `JwtStrategy` to be available in the module scope

## Bug Details

### Bug Condition

The bug manifests when any authenticated user sends a request to a warehouse endpoint protected by `@UseGuards(JwtAuthGuard, RolesGuard)`. The `JwtAuthGuard` attempts to use the Passport JWT strategy, but since `AuthModule` is not imported into `WarehouseModule`, NestJS cannot resolve the strategy provider, causing all requests to fail with 401 regardless of token validity.

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request of type HttpRequest
  OUTPUT: boolean
  
  RETURN request.targetModule == "WarehouseModule"
         AND request.targetController IN [CountSessionController, TransferController, WriteOffController]
         AND request.hasValidJwtToken == true
         AND controllerUsesGuard(request.targetController, JwtAuthGuard)
END FUNCTION
```

### Examples

- **Example 1**: User with valid JWT sends `GET /api/v1/warehouse/count-sessions` → receives 401 (expected: 200 with paginated data)
- **Example 2**: User with valid JWT and SUPERVISOR role sends `POST /api/v1/warehouse/transfers` → receives 401 (expected: 201 with transfer created)
- **Example 3**: User with valid JWT and CFO role sends `POST /api/v1/warehouse/write-offs/:id/approve` → receives 401 (expected: 200 with approval result)
- **Edge case**: User sends `GET /api/v1/warehouse/master-data/items` → receives 200 (correct — this controller has no guards, so it is unaffected by the bug)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Unauthenticated requests (no token or invalid/expired token) to guarded warehouse endpoints must continue to return 401 Unauthorized
- Authenticated users without the required role must continue to receive 403 Forbidden from `RolesGuard`
- Master-data endpoints (`/api/v1/warehouse/master-data/*`) must continue to be accessible without authentication
- Transaction endpoints (`/api/v1/transactions/*`) must continue to authenticate and authorize correctly
- The `AuthModule` export contract (exporting `AuthService`, `JwtModule`, `PassportModule`) must not be modified

**Scope:**
All inputs that do NOT involve authenticated requests to guarded warehouse controllers should be completely unaffected by this fix. This includes:
- Requests to master-data endpoints (no guards applied)
- Requests to transaction endpoints (already have `AuthModule` imported)
- Requests with invalid/missing tokens (should still fail with 401)
- Requests with valid tokens but insufficient roles (should still fail with 403)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is confirmed:

1. **Missing `AuthModule` import in `WarehouseModule`**: The `WarehouseModule` imports only `WarehouseDataAccessModule`. It does not import `AuthModule`, which exports `PassportModule` (with the `jwt` default strategy) and `JwtStrategy` provider. Without these, NestJS's DI container cannot resolve the Passport strategy when `JwtAuthGuard` calls `passport.authenticate('jwt')`.

2. **Why `TransactionsModule` works**: The `TransactionsModule` correctly imports `AuthModule` in its imports array (line: `AuthModule,`), making the JWT strategy available to all transaction controllers that use `@UseGuards(JwtAuthGuard, RolesGuard)`.

3. **NestJS module scoping**: In NestJS, providers are scoped to their module. A guard that depends on a strategy provider can only resolve it if the module providing that strategy is imported into the same module (or a parent module that re-exports it). Since `WarehouseModule` is a standalone feature module, it must explicitly import `AuthModule`.

## Correctness Properties

Property 1: Bug Condition - Authenticated Users Access Guarded Warehouse Endpoints

_For any_ HTTP request where the user provides a valid JWT token and targets a warehouse controller decorated with `@UseGuards(JwtAuthGuard, RolesGuard)`, the fixed `WarehouseModule` SHALL successfully validate the token, extract the user context (`AuthContext`), and allow the request to proceed to the controller handler (returning the appropriate success response based on role authorization).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Unauthenticated and Unauthorized Behavior Unchanged

_For any_ request where the bug condition does NOT hold (invalid/missing token, or request targets unguarded endpoints, or request targets other modules), the fixed code SHALL produce exactly the same behavior as the original code — unauthenticated requests still receive 401, role-insufficient requests still receive 403, master-data remains open, and transaction auth continues working.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct (confirmed by comparing with `TransactionsModule`):

**File**: `libs/warehouse/feature/src/lib/warehouse.module.ts`

**Module**: `WarehouseModule`

**Specific Changes**:
1. **Add import statement**: Add `import { AuthModule } from '@autoflow/shared-auth';` to the file's import declarations

2. **Add to module imports array**: Add `AuthModule` to the `@Module({ imports: [...] })` array alongside `WarehouseDataAccessModule`

**Resulting imports array:**
```typescript
imports: [WarehouseDataAccessModule, AuthModule],
```

**Pattern reference** (from `TransactionsModule`):
```typescript
imports: [
  MasterDataMockModule,
  AuthModule,    // ← this is what WarehouseModule is missing
  PrismaModule,
],
```

3. **No other changes required**: The controllers already correctly import and use `JwtAuthGuard`, `RolesGuard`, `Roles`, and `CurrentUser` from `@autoflow/shared-auth`. The guards and decorators are properly applied. Only the module-level DI wiring is missing.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the root cause is the missing `AuthModule` import.

**Test Plan**: Write integration tests using Supertest that send authenticated requests (with valid JWT) to guarded warehouse endpoints. Run these tests on the UNFIXED code to observe 401 failures.

**Test Cases**:
1. **Count Sessions GET**: Send `GET /api/v1/warehouse/count-sessions` with valid JWT → expect 401 on unfixed code (will fail)
2. **Transfers GET**: Send `GET /api/v1/warehouse/transfers` with valid JWT → expect 401 on unfixed code (will fail)
3. **Write-Offs GET**: Send `GET /api/v1/warehouse/write-offs` with valid JWT → expect 401 on unfixed code (will fail)
4. **Count Session POST**: Send `POST /api/v1/warehouse/count-sessions` with valid JWT and SUPERVISOR role → expect 401 on unfixed code (will fail)

**Expected Counterexamples**:
- All guarded warehouse endpoints return 401 even with a valid JWT token
- Root cause confirmed: NestJS cannot resolve `jwt` Passport strategy in `WarehouseModule` scope

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed module correctly authenticates requests.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := sendRequest(request, fixedWarehouseModule)
  ASSERT result.status != 401
  ASSERT result.userContext.userId == request.token.sub
  ASSERT result.userContext.roles == request.token.roles
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed module produces the same result as the original.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT sendRequest(request, originalModule).status == sendRequest(request, fixedModule).status
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of token states (missing, expired, malformed) and endpoint targets
- It catches edge cases in guard resolution that manual tests might miss
- It provides strong guarantees that non-buggy paths are unchanged

**Test Plan**: Observe behavior on UNFIXED code first for unauthenticated requests and master-data access, then write tests capturing that behavior continues after the fix.

**Test Cases**:
1. **Unauthenticated Preservation**: Verify requests without tokens still return 401 on guarded endpoints after fix
2. **Invalid Token Preservation**: Verify requests with expired/malformed tokens still return 401 after fix
3. **Role Guard Preservation**: Verify authenticated users without required roles still receive 403 after fix
4. **Master-Data Open Access**: Verify `/api/v1/warehouse/master-data/*` endpoints remain accessible without auth after fix
5. **Transaction Module Independence**: Verify transaction endpoints continue working independently of the warehouse fix

### Unit Tests

- Test that `WarehouseModule` compiles and resolves all providers when `AuthModule` is imported
- Test that `JwtAuthGuard` can resolve the JWT strategy within the warehouse module context
- Test that `RolesGuard` correctly reads roles from the validated token

### Property-Based Tests

- Generate random valid JWT payloads (varying userId, roles, expiry) and verify all guarded warehouse endpoints accept them
- Generate random invalid tokens (expired, wrong secret, malformed) and verify all guarded endpoints reject them with 401
- Generate random role combinations and verify `RolesGuard` correctly allows/denies based on endpoint requirements

### Integration Tests

- Test full request flow: login → get token → access warehouse endpoint → verify response
- Test that adding `AuthModule` to `WarehouseModule` does not affect `TransactionsModule` behavior
- Test master-data endpoints remain unguarded after the fix
- Test role-based access control works correctly for each warehouse controller (SUPERVISOR, MANAGER, CFO, STORE)
