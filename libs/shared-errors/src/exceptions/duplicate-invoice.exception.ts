import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';
import { DomainException } from './domain-exception';

/**
 * Thrown when attempting to create an invoice with a number that already exists.
 * Invoice numbers must be unique within the system.
 */
export class DuplicateInvoiceException extends DomainException {
  constructor(invoiceNumber: string) {
    super(
      `Invoice number ${invoiceNumber} already exists`,
      ErrorCodes.DUPLICATE_INVOICE,
      HttpStatus.CONFLICT,
      { invoiceNumber },
    );
  }
}
