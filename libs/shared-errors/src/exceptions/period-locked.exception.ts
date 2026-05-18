import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';
import { DomainException } from './domain-exception';

/**
 * Thrown when attempting to post a transaction to a locked accounting period.
 * Period lock prevents any new postings to maintain financial integrity.
 */
export class PeriodLockedException extends DomainException {
  constructor(period: string) {
    super(
      `Period ${period} is locked and cannot accept new postings`,
      ErrorCodes.PERIOD_LOCKED,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { period },
    );
  }
}
