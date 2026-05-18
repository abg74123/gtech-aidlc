import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, AuthContext } from '@autoflow/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that enforces role-based access control (RBAC).
 * Reads the @Roles() metadata from the handler or class and checks
 * whether the authenticated user has at least one of the required roles.
 *
 * If no @Roles() decorator is present, access is granted (authentication-only).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles specified — allow access (only JWT auth required)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthContext = request.user;

    if (!user || !user.roles) {
      return false;
    }

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
