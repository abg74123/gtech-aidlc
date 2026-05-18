import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';
import { DomainException } from './domain-exception';

/**
 * Thrown when a user does not have the required role for an operation.
 * Different from ApprovalRequired — this is a hard access denial.
 */
export class InsufficientRoleException extends DomainException {
  constructor(requiredRole: string, currentRole?: string) {
    const message = currentRole
      ? `Insufficient role: requires ${requiredRole}, current is ${currentRole}`
      : `Insufficient role: requires ${requiredRole}`;
    super(
      message,
      ErrorCodes.INSUFFICIENT_ROLE,
      HttpStatus.FORBIDDEN,
      { requiredRole, ...(currentRole && { currentRole }) },
    );
  }
}
