/**
 * Preservation Property Test — Warehouse Auth 401
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * Property 2: Preservation — Unauthenticated, Unauthorized, and Unguarded Behavior Unchanged
 *
 * This test captures the BASELINE behavior on UNFIXED code for non-buggy inputs
 * (cases where isBugCondition returns false). These behaviors must remain unchanged
 * after the fix is applied.
 *
 * Observation-first methodology:
 * 1. Observe actual behavior on unfixed code
 * 2. Write tests capturing that behavior
 * 3. Verify tests PASS on unfixed code
 * 4. After fix, re-run to confirm no regressions
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { CountSessionController } from '../lib/controllers/count-session.controller';
import { TransferController } from '../lib/controllers/transfer.controller';
import { WriteOffController } from '../lib/controllers/write-off.controller';
import { MasterDataController } from '../lib/controllers/master-data.controller';
import { StockCountService } from '../lib/services/stock-count.service';
import { StockTransferService } from '../lib/services/stock-transfer.service';
import { WriteOffService } from '../lib/services/write-off.service';
import {
  CountSessionRepository,
  TransferOrderRepository,
  WriteOffRepository,
} from '@autoflow/warehouse-data-access';
import { WAREHOUSE_DI_TOKENS } from '../lib/mocks/di-tokens';
import { AuthModule, JwtAuthGuard, RolesGuard, Roles } from '@autoflow/shared-auth';
import { PrismaService } from '@autoflow/shared-prisma';
import { Role } from '@autoflow/shared-types';

// JWT secret used for signing test tokens — matches the default in AuthModule config
const TEST_JWT_SECRET = 'default-secret-change-me';

/**
 * isBugCondition: Returns true when the request targets a guarded warehouse endpoint
 * with a valid JWT token. These are the conditions under which the bug manifests.
 * Preservation tests cover cases where this returns FALSE.
 */
function isBugCondition(endpoint: string, hasValidJwt: boolean): boolean {
  const guardedPaths = [
    '/api/v1/warehouse/count-sessions',
    '/api/v1/warehouse/transfers',
    '/api/v1/warehouse/write-offs',
  ];
  return hasValidJwt && guardedPaths.some((path) => endpoint.startsWith(path));
}

// Guarded warehouse endpoints
const GUARDED_ENDPOINTS = [
  '/api/v1/warehouse/count-sessions',
  '/api/v1/warehouse/transfers',
  '/api/v1/warehouse/write-offs',
];

// Unguarded master-data endpoints
const MASTER_DATA_ENDPOINTS = [
  '/api/v1/warehouse/master-data/items',
  '/api/v1/warehouse/master-data/warehouses',
];

describe('Preservation Property — Warehouse Auth 401', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    /**
     * Create the test module simulating the WarehouseModule's UNFIXED state:
     * - AuthModule is NOT imported → same as production unfixed state
     * - MasterDataController IS included (unguarded endpoints)
     * - Guards run as real guards (not overridden)
     */
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: TEST_JWT_SECRET,
              JWT_EXPIRES_IN: '15m',
            }),
          ],
        }),
        // NOTE: AuthModule is intentionally NOT imported here.
        // This reproduces the unfixed WarehouseModule state.
      ],
      controllers: [
        CountSessionController,
        TransferController,
        WriteOffController,
        MasterDataController,
      ],
      providers: [
        StockCountService,
        StockTransferService,
        WriteOffService,
        // Mock repositories — we only care about the auth/routing layer
        {
          provide: CountSessionRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            findByWarehouseAndStatus: jest.fn(),
            updateStatus: jest.fn(),
            createLine: jest.fn(),
            createLines: jest.fn(),
            findLineById: jest.fn(),
            updateLine: jest.fn(),
            findFrozenLinesByItem: jest.fn(),
            findLinesBySessionId: jest.fn(),
          },
        },
        {
          provide: TransferOrderRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findBySourceOrDestWarehouse: jest.fn(),
            updateStatus: jest.fn(),
            createLine: jest.fn(),
            createLines: jest.fn(),
            updateLinesTxId: jest.fn(),
            findLinesByTransferId: jest.fn(),
          },
        },
        {
          provide: WriteOffRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByWarehouseAndStatus: jest.fn(),
            updateStatus: jest.fn(),
            createEvidence: jest.fn(),
            findEvidenceByWriteOffId: jest.fn(),
            countEvidenceByWriteOffId: jest.fn(),
          },
        },
        // Mock DI token services
        {
          provide: WAREHOUSE_DI_TOKENS.TX_LOG_SERVICE,
          useValue: { createTx: jest.fn(), postTx: jest.fn() },
        },
        {
          provide: WAREHOUSE_DI_TOKENS.MA_SERVICE,
          useValue: { getCurrentMa: jest.fn(), calculateMa: jest.fn() },
        },
        {
          provide: WAREHOUSE_DI_TOKENS.STOCK_VALIDATION_SERVICE,
          useValue: { validateStockAvailability: jest.fn(), getStockBalance: jest.fn() },
        },
        {
          provide: WAREHOUSE_DI_TOKENS.PERIOD_SERVICE,
          useValue: { validatePeriodOpen: jest.fn(), getCurrentPeriod: jest.fn() },
        },
        {
          provide: WAREHOUSE_DI_TOKENS.MASTER_DATA_QUERY_SERVICE,
          useValue: {
            getItem: jest.fn(),
            getWarehouse: jest.fn(),
            listItems: jest.fn().mockResolvedValue([
              { id: 'item-001', name: 'Widget A', sku: 'WGT-001', unit: 'PCS' },
            ]),
            listWarehouses: jest.fn().mockResolvedValue([
              { id: 'wh-001', name: 'Main Warehouse', code: 'WH-MAIN' },
            ]),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    // Create a JwtService to sign tokens for testing
    jwtService = new JwtService({
      secret: TEST_JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  /**
   * Helper: Generate a valid JWT token.
   */
  function generateValidToken(roles: string[] = ['SUPERVISOR']): string {
    return jwtService.sign({
      sub: '11111111-1111-4111-a111-111111111111',
      username: 'test-supervisor',
      displayName: 'Test Supervisor',
      roles,
      isActive: true,
    });
  }

  /**
   * Helper: Generate an expired JWT token.
   */
  function generateExpiredToken(): string {
    return jwtService.sign(
      {
        sub: '22222222-2222-4222-a222-222222222222',
        username: 'expired-user',
        displayName: 'Expired User',
        roles: ['SUPERVISOR'],
        isActive: true,
      },
      { expiresIn: '-1s' },
    );
  }

  /**
   * Helper: Generate a token signed with wrong secret (invalid).
   */
  function generateInvalidToken(): string {
    const wrongSecretService = new JwtService({
      secret: 'wrong-secret-not-matching',
      signOptions: { expiresIn: '15m' },
    });
    return wrongSecretService.sign({
      sub: '33333333-3333-4333-a333-333333333333',
      username: 'invalid-user',
      displayName: 'Invalid User',
      roles: ['SUPERVISOR'],
      isActive: true,
    });
  }

  describe('Property: Guarded endpoints with missing/invalid tokens return error (not 2xx)', () => {
    /**
     * **Validates: Requirements 3.2**
     *
     * On UNFIXED code: Without AuthModule, the JwtAuthGuard cannot resolve the
     * 'jwt' Passport strategy. This causes an internal error (500) for ALL requests
     * to guarded endpoints — regardless of token presence.
     *
     * The preservation property is: requests without valid tokens to guarded endpoints
     * should NEVER return a success response (2xx). The exact error code (401 vs 500)
     * may change after the fix (500 → 401), but the key invariant is: no unauthorized
     * access is granted.
     *
     * After the fix: These should return 401 (proper auth rejection).
     * The preservation guarantee: unauthenticated requests are NEVER granted access.
     */
    describe('No token provided', () => {
      it.each(GUARDED_ENDPOINTS)(
        'should NOT return 2xx for %s with no token',
        async (endpoint) => {
          // Verify this is NOT a bug condition (no valid JWT)
          expect(isBugCondition(endpoint, false)).toBe(false);

          const response = await request(app.getHttpServer())
            .get(endpoint)
            .send();

          // Preservation: unauthenticated requests must never succeed
          expect(response.status).toBeGreaterThanOrEqual(400);
        },
      );
    });

    describe('Invalid/expired token provided', () => {
      it.each(GUARDED_ENDPOINTS)(
        'should NOT return 2xx for %s with expired token',
        async (endpoint) => {
          const expiredToken = generateExpiredToken();

          // Verify this is NOT a bug condition (token is expired = not valid)
          expect(isBugCondition(endpoint, false)).toBe(false);

          const response = await request(app.getHttpServer())
            .get(endpoint)
            .set('Authorization', `Bearer ${expiredToken}`)
            .send();

          // Preservation: expired tokens must never grant access
          expect(response.status).toBeGreaterThanOrEqual(400);
        },
      );

      it.each(GUARDED_ENDPOINTS)(
        'should NOT return 2xx for %s with wrong-secret token',
        async (endpoint) => {
          const invalidToken = generateInvalidToken();

          // Verify this is NOT a bug condition (token signed with wrong secret = not valid)
          expect(isBugCondition(endpoint, false)).toBe(false);

          const response = await request(app.getHttpServer())
            .get(endpoint)
            .set('Authorization', `Bearer ${invalidToken}`)
            .send();

          // Preservation: invalid tokens must never grant access
          expect(response.status).toBeGreaterThanOrEqual(400);
        },
      );

      it.each(GUARDED_ENDPOINTS)(
        'should NOT return 2xx for %s with malformed token',
        async (endpoint) => {
          const response = await request(app.getHttpServer())
            .get(endpoint)
            .set('Authorization', 'Bearer not-a-real-jwt-token')
            .send();

          // Preservation: malformed tokens must never grant access
          expect(response.status).toBeGreaterThanOrEqual(400);
        },
      );
    });
  });

  describe('Property: Master-data endpoints return 200 regardless of auth state', () => {
    /**
     * **Validates: Requirements 3.4**
     *
     * Master-data endpoints have NO guards applied. They should always return 200
     * regardless of whether a token is provided, valid, invalid, or missing.
     * This behavior is independent of the AuthModule import.
     */
    it.each(MASTER_DATA_ENDPOINTS)(
      'should return 200 for %s with no token',
      async (endpoint) => {
        const response = await request(app.getHttpServer())
          .get(endpoint)
          .send();

        expect(response.status).toBe(200);
      },
    );

    it.each(MASTER_DATA_ENDPOINTS)(
      'should return 200 for %s with valid token',
      async (endpoint) => {
        const token = generateValidToken();

        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${token}`)
          .send();

        expect(response.status).toBe(200);
      },
    );

    it.each(MASTER_DATA_ENDPOINTS)(
      'should return 200 for %s with expired token',
      async (endpoint) => {
        const expiredToken = generateExpiredToken();

        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${expiredToken}`)
          .send();

        expect(response.status).toBe(200);
      },
    );

    it.each(MASTER_DATA_ENDPOINTS)(
      'should return 200 for %s with invalid token',
      async (endpoint) => {
        const invalidToken = generateInvalidToken();

        const response = await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${invalidToken}`)
          .send();

        expect(response.status).toBe(200);
      },
    );
  });
});

/**
 * Transaction Endpoint Preservation Tests
 *
 * **Validates: Requirements 3.1**
 *
 * These tests verify that transaction endpoints continue to authenticate correctly,
 * independent of the warehouse fix. The TransactionsModule already imports AuthModule,
 * so its auth works. This test uses a minimal controller with AuthModule to prove
 * that modules WITH AuthModule imported authenticate correctly — and this behavior
 * is unaffected by adding AuthModule to WarehouseModule.
 */

// Minimal test controller simulating a transaction endpoint with AuthModule available
@Controller('transactions/test-endpoint')
@UseGuards(JwtAuthGuard, RolesGuard)
class TestTransactionController {
  @Get()
  @Roles(Role.CASHIER, Role.STORE, Role.SUPERVISOR, Role.MANAGER, Role.CFO, Role.ADMIN)
  getTestData() {
    return { data: 'transaction-data', authenticated: true };
  }
}

describe('Preservation Property — Transaction Endpoints Auth (Requirement 3.1)', () => {
  let txApp: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    /**
     * Create a test module that simulates the TransactionsModule pattern:
     * - AuthModule IS imported (same as TransactionsModule)
     * - A guarded controller uses JwtAuthGuard + RolesGuard
     * - This proves that modules with AuthModule continue to work correctly
     *
     * PrismaService is mocked to avoid database dependency.
     * The mock returns a valid user for the test user ID, simulating
     * the real AuthService.validateUser behavior.
     */
    const mockPrismaService = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          // Return a valid user for our test user IDs
          if (where.id === '11111111-1111-4111-a111-111111111111') {
            return Promise.resolve({
              id: '11111111-1111-4111-a111-111111111111',
              username: 'test-supervisor',
              displayName: 'Test Supervisor',
              roles: ['SUPERVISOR'],
              isActive: true,
            });
          }
          if (where.id === '44444444-4444-4444-a444-444444444444') {
            return Promise.resolve({
              id: '44444444-4444-4444-a444-444444444444',
              username: 'no-role-user',
              displayName: 'No Role User',
              roles: ['UNKNOWN_ROLE'],
              isActive: true,
            });
          }
          return Promise.resolve(null);
        }),
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: TEST_JWT_SECRET,
              JWT_EXPIRES_IN: '15m',
            }),
          ],
        }),
        AuthModule, // ← AuthModule IS imported (same as TransactionsModule)
      ],
      controllers: [TestTransactionController],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    txApp = moduleFixture.createNestApplication();
    txApp.setGlobalPrefix('api/v1');
    txApp.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await txApp.init();

    jwtService = new JwtService({
      secret: TEST_JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    });
  });

  afterAll(async () => {
    if (txApp) {
      await txApp.close();
    }
  });

  function generateValidToken(roles: string[] = ['SUPERVISOR']): string {
    return jwtService.sign({
      sub: '11111111-1111-4111-a111-111111111111',
      username: 'test-supervisor',
      displayName: 'Test Supervisor',
      roles,
      isActive: true,
    });
  }

  function generateExpiredToken(): string {
    return jwtService.sign(
      {
        sub: '22222222-2222-4222-a222-222222222222',
        username: 'expired-user',
        displayName: 'Expired User',
        roles: ['SUPERVISOR'],
        isActive: true,
      },
      { expiresIn: '-1s' },
    );
  }

  function generateInvalidToken(): string {
    const wrongSecretService = new JwtService({
      secret: 'wrong-secret-not-matching',
      signOptions: { expiresIn: '15m' },
    });
    return wrongSecretService.sign({
      sub: '33333333-3333-4333-a333-333333333333',
      username: 'invalid-user',
      displayName: 'Invalid User',
      roles: ['SUPERVISOR'],
      isActive: true,
    });
  }

  it('should return 200 for transaction endpoint with valid token (auth works)', async () => {
    const token = generateValidToken(['SUPERVISOR']);

    const response = await request(txApp.getHttpServer())
      .get('/api/v1/transactions/test-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .send();

    // Transaction endpoints with AuthModule imported authenticate correctly
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: 'transaction-data', authenticated: true });
  });

  it('should return 401 for transaction endpoint with no token', async () => {
    const response = await request(txApp.getHttpServer())
      .get('/api/v1/transactions/test-endpoint')
      .send();

    // Unauthenticated requests are properly rejected with 401
    expect(response.status).toBe(401);
  });

  it('should return 401 for transaction endpoint with expired token', async () => {
    const expiredToken = generateExpiredToken();

    const response = await request(txApp.getHttpServer())
      .get('/api/v1/transactions/test-endpoint')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send();

    // Expired tokens are properly rejected with 401
    expect(response.status).toBe(401);
  });

  it('should return 401 for transaction endpoint with invalid token', async () => {
    const invalidToken = generateInvalidToken();

    const response = await request(txApp.getHttpServer())
      .get('/api/v1/transactions/test-endpoint')
      .set('Authorization', `Bearer ${invalidToken}`)
      .send();

    // Invalid tokens are properly rejected with 401
    expect(response.status).toBe(401);
  });

  it('should return 403 for transaction endpoint with valid token but insufficient role', async () => {
    // Generate token with a role that is NOT in the allowed list for the endpoint
    // The TestTransactionController allows: CASHIER, STORE, SUPERVISOR, MANAGER, CFO, ADMIN
    // We use a non-existent role to trigger 403
    const token = jwtService.sign({
      sub: '44444444-4444-4444-a444-444444444444',
      username: 'no-role-user',
      displayName: 'No Role User',
      roles: ['UNKNOWN_ROLE'],
      isActive: true,
    });

    const response = await request(txApp.getHttpServer())
      .get('/api/v1/transactions/test-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .send();

    // Authenticated but unauthorized users get 403
    expect(response.status).toBe(403);
  });
});
