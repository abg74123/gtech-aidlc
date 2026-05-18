import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';
import { DomainException } from './domain-exception';

/**
 * Thrown when an operation would cause stock quantity to go negative.
 * This is a blocking error — the transaction must not be posted.
 */
export class StockNegativeException extends DomainException {
  constructor(
    productId: string,
    currentQty: number,
    requestedQty: number,
  ) {
    super(
      `Stock for product ${productId} would go negative: current=${currentQty}, requested=${requestedQty}`,
      ErrorCodes.STOCK_NEGATIVE,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { productId, currentQty, requestedQty },
    );
  }
}
