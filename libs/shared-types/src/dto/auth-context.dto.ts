import { Role } from '../enums/role.enum';

/**
 * Authentication context — extracted from JWT token.
 * Available in every authenticated request via @CurrentUser() decorator.
 */
export interface AuthContext {
  /** User ID (UUID v4) */
  userId: string;
  /** Username */
  username: string;
  /** Display name */
  displayName: string;
  /** Assigned roles for RBAC */
  roles: Role[];
  /** Whether the account is active */
  isActive: boolean;
}
