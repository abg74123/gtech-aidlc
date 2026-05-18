import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';
import { DomainException } from './domain-exception';

/**
 * Thrown when an operation requires approval from a higher-level role.
 * The transaction remains in DRAFT status until approved.
 */
export class ApprovalRequiredException extends DomainException {
  constructor(txId: string, requiredRole: string) {
    super(
      `Transaction ${txId} requires approval from role: ${requiredRole}`,
      ErrorCodes.APPROVAL_REQUIRED,
      HttpStatus.FORBIDDEN,
      { txId, requiredRole },
    );
  }
}
