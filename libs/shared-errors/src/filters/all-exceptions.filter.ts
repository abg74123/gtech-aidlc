import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain-exception';

/**
 * Global exception filter that catches all exceptions and formats them
 * into a consistent error response structure.
 *
 * - DomainException: includes errorCode and metadata
 * - HttpException: uses NestJS default response format
 * - Unknown errors: returns 500 with generic message
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, body } = this.buildResponse(exception, request);

    this.logException(exception, statusCode, request);

    response.status(statusCode).json(body);
  }

  private buildResponse(
    exception: unknown,
    request: Request,
  ): { statusCode: number; body: Record<string, unknown> } {
    if (exception instanceof DomainException) {
      const statusCode = exception.getStatus();
      return {
        statusCode,
        body: {
          statusCode,
          errorCode: exception.errorCode,
          message: exception.message,
          ...(exception.metadata && { metadata: exception.metadata }),
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>)['message'] ??
            exception.message;

      return {
        statusCode,
        body: {
          statusCode,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      };
    }

    // Unknown error — do not leak internal details
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };
  }

  private logException(
    exception: unknown,
    statusCode: number,
    request: Request,
  ): void {
    const message = `${request.method} ${request.url} → ${statusCode}`;

    if (statusCode >= 500) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${message}: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
      );
    }
  }
}
