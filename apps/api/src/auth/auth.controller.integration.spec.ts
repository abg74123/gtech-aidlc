import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '@autoflow/shared-auth';
import { PrismaService } from '@autoflow/shared-prisma';
import { AllExceptionsFilter } from '@autoflow/shared-errors';
import { Role } from '@autoflow/shared-types';
import { JwtStrategy } from '@autoflow/shared-auth';
import { AuthController } from './auth.controller';

const JWT_SECRET = 'test-secret';

// --- Test data ---
const mockAdminUser = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'admin',
  email: 'admin@example.com',
  passwordHash: '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12', // placeholder
  displayName: 'Admin User',
  roles: [Role.ADMIN],
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockCashierUser = {
  id: '22222222-2222-2222-2222-222222222222',
  username: 'cashier',
  email: 'cashier@example.com',
  passwordHash: '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12',
  displayName: 'Cashier User',
  roles: [Role.CASHIER],
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRefreshTokenRecord = {
  id: '33333333-3333-3333-3333-333333333333',
  userId: mockAdminUser.id,
  token: 'valid-refresh-token-uuid',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  createdAt: new Date(),
  revokedAt: null,
};

const mockExpiredRefreshToken = {
  id: '44444444-4444-4444-4444-444444444444',
  userId: mockAdminUser.id,
  token: 'expired-refresh-token-uuid',
  expiresAt: new Date(Date.now() - 1000), // expired
  createdAt: new Date(),
  revokedAt: null,
};

// --- Mock PrismaService ---
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET,
              JWT_EXPIRES_IN: '15m',
              JWT_REFRESH_EXPIRES_IN: '7d',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same global config as main.ts
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to generate a valid JWT for a user
  function generateToken(user: typeof mockAdminUser): string {
    return jwtService.sign({
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
      isActive: user.isActive,
    });
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with tokens for valid credentials', async () => {
      // bcrypt.compare will be called with the password and hash
      // We need to set up a real bcrypt hash for 'password123'
      const bcrypt = await import('bcrypt');
      const realHash = await bcrypt.hash('password123', 10);
      const userWithRealHash = { ...mockAdminUser, passwordHash: realHash };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithRealHash);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'new-token-id',
        token: 'new-refresh-token',
        userId: mockAdminUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: null,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'password123' })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        id: mockAdminUser.id,
        username: 'admin',
        displayName: 'Admin User',
        roles: [Role.ADMIN],
      });
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      const bcrypt = await import('bcrypt');
      const realHash = await bcrypt.hash('correctPassword', 10);
      const userWithRealHash = { ...mockAdminUser, passwordHash: realHash };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithRealHash);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'wrongPassword' })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBeDefined();
    });

    it('should return 401 for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'nonexistent', password: 'password123' })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should return 400 for missing username', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  // ─── REGISTER ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    const registerPayload = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'securePass123',
      displayName: 'New User',
      roles: [Role.CASHIER],
    };

    it('should return 201 when admin creates a user', async () => {
      const adminToken = generateToken(mockAdminUser);

      // validateUser called by JwtStrategy
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      // register: check for existing user
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      // register: create user
      mockPrismaService.user.create.mockResolvedValue({
        id: '55555555-5555-5555-5555-555555555555',
        username: registerPayload.username,
        email: registerPayload.email,
        passwordHash: 'hashed',
        displayName: registerPayload.displayName,
        roles: registerPayload.roles,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(registerPayload)
        .expect(201);

      expect(response.body).toMatchObject({
        id: '55555555-5555-5555-5555-555555555555',
        username: 'newuser',
        email: 'newuser@example.com',
        displayName: 'New User',
        roles: [Role.CASHIER],
      });
    });

    it('should return 403 when non-admin tries to register a user', async () => {
      const cashierToken = generateToken(mockCashierUser);

      // validateUser called by JwtStrategy
      mockPrismaService.user.findUnique.mockResolvedValue(mockCashierUser);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send(registerPayload)
        .expect(403);

      expect(response.body.statusCode).toBe(403);
    });

    it('should return 409 when username already exists', async () => {
      const adminToken = generateToken(mockAdminUser);

      // validateUser called by JwtStrategy
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      // register: check for existing user — found duplicate
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockCashierUser,
        username: registerPayload.username,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(registerPayload)
        .expect(409);

      expect(response.body.statusCode).toBe(409);
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerPayload)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  // ─── REFRESH ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 200 with new tokens for valid refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        mockRefreshTokenRecord,
      );
      mockPrismaService.refreshToken.update.mockResolvedValue({
        ...mockRefreshTokenRecord,
        revokedAt: new Date(),
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'new-token-id',
        token: 'new-refresh-token',
        userId: mockAdminUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: null,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token-uuid' })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for expired refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(
        mockExpiredRefreshToken,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'expired-refresh-token-uuid' })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should return 401 for invalid (non-existent) refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'non-existent-token' })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should return 400 for missing refreshToken field', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  // ─── ME ───────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('should return 200 with user profile when authenticated', async () => {
      const adminToken = generateToken(mockAdminUser);

      // validateUser called by JwtStrategy
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: mockAdminUser.id,
        username: 'admin',
        displayName: 'Admin User',
        roles: [Role.ADMIN],
        isActive: true,
      });
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should return 401 for invalid/malformed token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-string')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });
});
