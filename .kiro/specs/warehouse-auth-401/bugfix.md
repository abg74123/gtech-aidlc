# Bugfix Requirements Document

## Introduction

Authenticated users receive 401 Unauthorized errors when accessing any warehouse API endpoint (`/api/v1/warehouse/count-sessions`, `/api/v1/warehouse/transfers`, `/api/v1/warehouse/write-offs`), despite being logged in and able to access other pages (e.g., transactions). The root cause is that the `WarehouseModule` does not import `AuthModule`, so the Passport JWT strategy is not available to the `JwtAuthGuard` applied on warehouse controllers.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an authenticated user requests GET `/api/v1/warehouse/count-sessions` THEN the system returns 401 Unauthorized instead of the expected data

1.2 WHEN an authenticated user requests GET `/api/v1/warehouse/transfers` THEN the system returns 401 Unauthorized instead of the expected data

1.3 WHEN an authenticated user requests GET `/api/v1/warehouse/write-offs` THEN the system returns 401 Unauthorized instead of the expected data

1.4 WHEN an authenticated user requests any POST/PATCH endpoint on warehouse controllers protected by `@UseGuards(JwtAuthGuard, RolesGuard)` THEN the system returns 401 Unauthorized regardless of the user's valid JWT token

### Expected Behavior (Correct)

2.1 WHEN an authenticated user with a valid JWT token requests GET `/api/v1/warehouse/count-sessions` THEN the system SHALL validate the token, extract the user context, and return the count sessions data (or apply role-based filtering as configured)

2.2 WHEN an authenticated user with a valid JWT token requests GET `/api/v1/warehouse/transfers` THEN the system SHALL validate the token, extract the user context, and return the transfers data

2.3 WHEN an authenticated user with a valid JWT token requests GET `/api/v1/warehouse/write-offs` THEN the system SHALL validate the token, extract the user context, and return the write-offs data

2.4 WHEN an authenticated user with a valid JWT token and the required role requests any guarded warehouse endpoint THEN the system SHALL grant access and process the request normally

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an authenticated user accesses transaction endpoints (`/api/v1/transactions/*`) THEN the system SHALL CONTINUE TO authenticate and authorize requests correctly

3.2 WHEN an unauthenticated user (no token or invalid token) accesses warehouse endpoints THEN the system SHALL CONTINUE TO return 401 Unauthorized

3.3 WHEN an authenticated user without the required role accesses a role-restricted warehouse endpoint THEN the system SHALL CONTINUE TO return 403 Forbidden

3.4 WHEN any user accesses the unguarded warehouse master-data endpoints (`/api/v1/warehouse/master-data/*`) THEN the system SHALL CONTINUE TO return data without requiring authentication
