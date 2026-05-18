import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

/**
 * Base class for all domain-specific exceptions in the Autoflow system.
 * Extends NestJS HttpException to integrate with the framework's error handling.
 *
 * Provides a structured error response with:
 * - HTTP status code
 * - Domain-specific error code (e.g., STOCK_NEGATIVE)
 * - Human-readable message
 * - Optional metadata for additional context
 */
export class DomainException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    errorCode: ErrorCode,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    metadata?: Record<string, unknown>,
  ) {
    const response = {
      statusCode,
      errorCode,
      message,
      ...(metadata && { metadata }),
    };
    super(response, statusCode);
    this.errorCode = errorCode;
    this.metadata = metadata;
  }
}
