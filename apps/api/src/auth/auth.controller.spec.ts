import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService, JwtStrategy, RolesGuard } from '@autoflow/shared-auth';
import { PrismaService } from '@autoflow/shared-prisma';
import { Role } from '@autoflow/shared-types';

const TEST_JWT_SECRET = 'test-secret-key-for-integration-tests';

/**
 * API Integration Tests for Auth Controller
 * Tests all 4 auth endpoints with Supertest against a real NestJS app instance.
 * PrismaService is mocked to avoid needing a real database.
 */
describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: '', // Will be set in beforeAll
    displayName: 'Admin User',
    roles: [Role.ADMIN],
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockCashierUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    username: 'cashier',
    email: 'cashier@example.com',
    passwordHash: '',
    displayName: 'Cashier User',
    roles: [Role.CASHIER],
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockRefreshToken = {
    id: '660e8400-e29b-41d4-a716-446655440000',
    userId: mockUser.id,
    token: 'valid-refresh-token-uuid',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    revokedAt: null,
  };

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
  };

  beforeAll(async () => {
    // Pre-hash password for mock user
    const hash = await bcrypt.hash('password123', 10);
    mockUser.passwordHash = hash;
    mockCashierUser.passwordHash = hash;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        RolesGuard,
        Reflector,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: TEST_JWT_SECRET,
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key] ?? defaultValue;
            },
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to generate a valid JWT for testing protected endpoints
  function generateToken(user: typeof mockUser): string {
    return jwtService.sign({
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
      isActive: user.isActive,
    });
  }

  // ─── POST /auth/login ─────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('should return 200 with tokens for valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin', password: 'password123' })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin');
      expect(response.body.user.displayName).toBe('Admin User');
      expect(response.body.user.roles).toEqual([Role.ADMIN]);
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'nonexistent', password: 'password123' })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for missing fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'admin' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  // ─── POST /auth/register ──────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('should return 201 when admin creates a user', async () => {
      // Mock the JWT validation (user lookup for JwtStrategy)
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      // Mock no existing user with same username/email
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      // Mock user creation
      const newUser = {
        id: '770e8400-e29b-41d4-a716-446655440000',
        username: 'newuser',
        email: 'newuser@example.com',
        passwordHash: 'hashed',
        displayName: 'New User',
        roles: [Role.CASHIER],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(newUser);

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'securePass123',
          displayName: 'New User',
          roles: [Role.CASHIER],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe('newuser');
      expect(response.body.email).toBe('newuser@example.com');
      expect(response.body.displayName).toBe('New User');
      expect(response.body.roles).toEqual([Role.CASHIER]);
    });

    it('should return 403 when non-admin tries to register a user', async () => {
      // Mock the JWT validation — cashier user
      mockPrismaService.user.findUnique.mockResolvedValue(mockCashierUser);

      const token = generateToken(mockCashierUser);

      await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'securePass123',
          displayName: 'New User',
          roles: [Role.CASHIER],
        })
        .expect(403);
    });

    it('should return 409 when username already exists', async () => {
      // Mock the JWT validation (admin user)
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      // Mock existing user found
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        username: 'existinguser',
      });

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'existinguser',
          email: 'new@example.com',
          password: 'securePass123',
          displayName: 'Existing User',
          roles: [Role.CASHIER],
        })
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'securePass123',
          displayName: 'New User',
          roles: [Role.CASHIER],
        })
        .expect(401);
    });
  });

  // ─── POST /auth/refresh ───────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('should return 200 with new tokens for valid refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({
        ...mockRefreshToken,
        revokedAt: new Date(),
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        ...mockRefreshToken,
        token: 'new-refresh-token-uuid',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token-uuid' })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
    });

    it('should return 401 for expired refresh token', async () => {
      const expiredToken = {
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      };
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(expiredToken);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token-uuid' })
        .expect(401);

      expect(response.body.message).toBe('Refresh token expired');
    });

    it('should return 401 for invalid (non-existent) refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 401 for revoked refresh token', async () => {
      const revokedToken = {
        ...mockRefreshToken,
        revokedAt: new Date(), // already revoked
      };
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(revokedToken);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token-uuid' })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });
  });

  // ─── GET /auth/me ─────────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('should return 200 with user profile when authenticated', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId', mockUser.id);
      expect(response.body).toHaveProperty('username', 'admin');
      expect(response.body).toHaveProperty('displayName', 'Admin User');
      expect(response.body).toHaveProperty('roles');
      expect(response.body.roles).toEqual([Role.ADMIN]);
      expect(response.body).toHaveProperty('isActive', true);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should return 401 for invalid/malformed token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token-string')
        .expect(401);
    });

    it('should return 401 for expired token', async () => {
      // Create a token that's already expired
      const expiredToken = jwtService.sign(
        {
          sub: mockUser.id,
          username: mockUser.username,
          displayName: mockUser.displayName,
          roles: mockUser.roles,
          isActive: mockUser.isActive,
        },
        { expiresIn: '0s' },
      );

      // Small delay to ensure token is expired
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });
});
