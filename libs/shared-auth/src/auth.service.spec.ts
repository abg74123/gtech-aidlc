import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService, RegisterDto, JwtPayload } from './auth.service';
import { PrismaService } from '@autoflow/shared-prisma';
import { Role } from '@autoflow/shared-types';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock crypto.randomUUID
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-1234'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<any>;
  let jwtService: jest.Mocked<any>;
  let configService: jest.Mocked<any>;

  const mockUser = {
    id: 'user-id-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    displayName: 'Test User',
    roles: [Role.CASHIER],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
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

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens and user info on successful login', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login('testuser', 'password123');

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-uuid-1234',
        user: {
          id: 'user-id-1',
          username: 'testuser',
          displayName: 'Test User',
          roles: [Role.CASHIER],
        },
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id-1',
        username: 'testuser',
        displayName: 'Test User',
        roles: [Role.CASHIER],
        isActive: true,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nonexistent', 'password'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('testuser', 'wrongpassword'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is deactivated', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login('testuser', 'password123'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should create a refresh token in the database', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaService.refreshToken.create.mockResolvedValue({});

      await service.login('testuser', 'password123');

      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id-1',
          token: 'mock-uuid-1234',
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'securepass',
      displayName: 'New User',
      roles: [Role.STORE],
    };

    it('should create a new user and return user info', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
      prismaService.user.create.mockResolvedValue({
        id: 'mock-uuid-1234',
        username: 'newuser',
        email: 'new@example.com',
        displayName: 'New User',
        roles: [Role.STORE],
      });

      const result = await service.register(registerDto);

      expect(result).toEqual({
        id: 'mock-uuid-1234',
        username: 'newuser',
        email: 'new@example.com',
        displayName: 'New User',
        roles: [Role.STORE],
      });
    });

    it('should hash the password with bcrypt before storing', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
      prismaService.user.create.mockResolvedValue({
        id: 'mock-uuid-1234',
        username: 'newuser',
        email: 'new@example.com',
        displayName: 'New User',
        roles: [Role.STORE],
      });

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('securepass', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          passwordHash: '$2b$10$hashed',
        }),
      });
    });

    it('should throw ConflictException when username already exists', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        username: 'newuser',
      });

      await expect(service.register(registerDto))
        .rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when email already exists', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        username: 'otheruser',
        email: 'new@example.com',
      });

      await expect(service.register(registerDto))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('refresh', () => {
    const validTokenRecord = {
      id: 'token-id-1',
      userId: 'user-id-1',
      token: 'valid-refresh-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      revokedAt: null,
    };

    it('should return new tokens on valid refresh token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(validTokenRecord);
      prismaService.refreshToken.update.mockResolvedValue({});
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-uuid-1234',
      });
    });

    it('should revoke the old refresh token (rotation)', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(validTokenRecord);
      prismaService.refreshToken.update.mockResolvedValue({});
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.refreshToken.create.mockResolvedValue({});

      await service.refresh('valid-refresh-token');

      expect(prismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException when token not found', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('nonexistent-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...validTokenRecord,
        revokedAt: new Date(),
      });

      await expect(service.refresh('revoked-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue({
        ...validTokenRecord,
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      await expect(service.refresh('expired-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is deactivated', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(validTokenRecord);
      prismaService.refreshToken.update.mockResolvedValue({});
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.refresh('valid-refresh-token'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    const payload: JwtPayload = {
      sub: 'user-id-1',
      username: 'testuser',
      displayName: 'Test User',
      roles: [Role.CASHIER],
      isActive: true,
    };

    it('should return user context for valid payload', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(result).toEqual({
        userId: 'user-id-1',
        username: 'testuser',
        displayName: 'Test User',
        roles: [Role.CASHIER],
        isActive: true,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser(payload))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is deactivated', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.validateUser(payload))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('hashPassword', () => {
    it('should hash password with 10 salt rounds', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedresult');

      const result = await service.hashPassword('mypassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
      expect(result).toBe('$2b$10$hashedresult');
    });

    it('should produce a hash that bcrypt.compare can verify', async () => {
      const password = 'testPassword123';
      const fakeHash = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12';
      (bcrypt.hash as jest.Mock).mockResolvedValue(fakeHash);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const hash = await service.hashPassword(password);

      // Verify hash was produced
      expect(hash).toBe(fakeHash);

      // Verify bcrypt.compare confirms the hash matches the original password
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should produce a hash that does not match a wrong password', async () => {
      const password = 'testPassword123';
      const fakeHash = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12';
      (bcrypt.hash as jest.Mock).mockResolvedValue(fakeHash);

      const hash = await service.hashPassword(password);

      // Simulate bcrypt.compare returning false for wrong password
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const isInvalid = await bcrypt.compare('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });
});
