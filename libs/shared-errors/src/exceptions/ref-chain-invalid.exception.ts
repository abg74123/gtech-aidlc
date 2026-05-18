import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';
import { DomainException } from './domain-exception';

/**
 * Thrown when a reference chain between transactions is invalid or broken.
 * For example, a Credit Note referencing a non-existent Invoice.
 */
export class RefChainInvalidException extends DomainException {
  constructor(sourceTxId: string, targetTxId: string, reason?: string) {
    const message = reason
      ? `Invalid reference chain from ${sourceTxId} to ${targetTxId}: ${reason}`
      : `Invalid reference chain from ${sourceTxId} to ${targetTxId}`;
    super(
      message,
      ErrorCodes.REF_CHAIN_INVALID,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { sourceTxId, targetTxId, ...(reason && { reason }) },
    );
  }
}
