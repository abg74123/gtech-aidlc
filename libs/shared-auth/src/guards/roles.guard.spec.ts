import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '@autoflow/shared-types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('when no roles are required', () => {
    it('should allow access when @Roles() is not set (returns undefined)', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ roles: [Role.CASHIER] });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when @Roles() is set with empty array', () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({ roles: [Role.CASHIER] });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('when roles are required', () => {
    it('should allow access when user has the required role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockExecutionContext({
        userId: 'user-1',
        username: 'admin',
        roles: [Role.ADMIN],
        isActive: true,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.MANAGER]);
      const context = createMockExecutionContext({
        userId: 'user-1',
        username: 'manager',
        roles: [Role.MANAGER],
        isActive: true,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has multiple roles including a required one', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.SUPERVISOR]);
      const context = createMockExecutionContext({
        userId: 'user-1',
        username: 'multi',
        roles: [Role.CASHIER, Role.SUPERVISOR],
        isActive: true,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user does not have the required role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockExecutionContext({
        userId: 'user-1',
        username: 'cashier',
        roles: [Role.CASHIER],
        isActive: true,
      });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access when user has no roles', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockExecutionContext({
        userId: 'user-1',
        username: 'noroles',
        roles: [],
        isActive: true,
      });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access when user object is null', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockExecutionContext(null);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access when user.roles is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockExecutionContext({
        userId: 'user-1',
        username: 'broken',
      });

      expect(guard.canActivate(context)).toBe(false);
    });
  });

  describe('role combinations', () => {
    it('should deny CASHIER access to ADMIN-only routes', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockExecutionContext({
        roles: [Role.CASHIER],
      });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow ADMIN access to ADMIN-only routes', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockExecutionContext({
        roles: [Role.ADMIN],
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow CFO access to CFO or ADMIN routes', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.CFO, Role.ADMIN]);
      const context = createMockExecutionContext({
        roles: [Role.CFO],
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny STORE access to MANAGER-only routes', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.MANAGER]);
      const context = createMockExecutionContext({
        roles: [Role.STORE],
      });

      expect(guard.canActivate(context)).toBe(false);
    });
  });
});
