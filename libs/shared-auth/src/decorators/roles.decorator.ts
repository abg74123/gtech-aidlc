import { SetMetadata } from '@nestjs/common';
import { Role } from '@autoflow/shared-types';

/** Metadata key used by RolesGuard to read required roles. */
export const ROLES_KEY = 'roles';

/**
 * Decorator that sets the required roles for a route handler or controller.
 * Used in conjunction with RolesGuard to enforce RBAC.
 *
 * @example
 * ```ts
 * @Roles(Role.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Post('register')
 * register(@Body() dto: RegisterDto) { ... }
 * ```
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
