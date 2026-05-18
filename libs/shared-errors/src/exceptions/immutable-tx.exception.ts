import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';
import { DomainException } from './domain-exception';

/**
 * Thrown when attempting to modify an immutable transaction.
 * Once a transaction is posted, it cannot be updated or deleted — only voided.
 */
export class ImmutableTxException extends DomainException {
  constructor(txId: string) {
    super(
      `Transaction ${txId} is immutable and cannot be modified after POST`,
      ErrorCodes.TX_IMMUTABLE,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { txId },
    );
  }
}
