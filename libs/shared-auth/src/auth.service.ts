import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@autoflow/shared-prisma';
import { Role } from '@autoflow/shared-types';
import { randomUUID } from 'crypto';

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  displayName: string;
  roles: Role[];
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    roles: Role[];
  };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  displayName: string;
  roles: Role[];
  isActive: boolean;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate user with username and password.
   * Returns access token, refresh token, and user info.
   */
  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles as Role[],
      isActive: user.isActive,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles as Role[],
      },
    };
  }

  /**
   * Register a new user account.
   * Password is hashed with bcrypt before storage.
   */
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.username === dto.username
          ? 'Username already exists'
          : 'Email already exists',
      );
    }

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        username: dto.username,
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        roles: dto.roles,
      },
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles as Role[],
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   * Implements token rotation — old token is revoked, new one issued.
   */
  async refresh(refreshToken: string): Promise<RefreshResult> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord || tokenRecord.revokedAt !== null) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke the old refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Get user for new access token
    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles as Role[],
      isActive: user.isActive,
    };

    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Validate JWT payload and return user context.
   * Used by JwtStrategy to attach user to request.
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles as Role[],
      isActive: user.isActive,
    };
  }

  /**
   * Hash a password using bcrypt with configured salt rounds.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Create a new refresh token and store it in the database.
   */
  private async createRefreshToken(userId: string): Promise<string> {
    const token = randomUUID();
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Parse duration string (e.g., '7d', '15m', '1h') to a Date.
   */
  private calculateExpiry(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 7 days if format is invalid
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
