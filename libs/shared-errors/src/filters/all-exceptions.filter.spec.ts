import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { DomainException } from '../exceptions/domain-exception';
import { ErrorCodes } from '../constants/error-codes';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { url: string; method: string };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockRequest = { url: '/api/v1/test', method: 'POST' };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle DomainException with error code and metadata', () => {
    const exception = new DomainException(
      'Stock is negative',
      ErrorCodes.STOCK_NEGATIVE,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { productId: 'item-1', currentQty: 0, requestedQty: 5 },
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        errorCode: ErrorCodes.STOCK_NEGATIVE,
        message: 'Stock is negative',
        metadata: { productId: 'item-1', currentQty: 0, requestedQty: 5 },
        path: '/api/v1/test',
      }),
    );
  });

  it('should handle DomainException without metadata', () => {
    const exception = new DomainException(
      'Period locked',
      ErrorCodes.PERIOD_LOCKED,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.metadata).toBeUndefined();
    expect(body.errorCode).toBe(ErrorCodes.PERIOD_LOCKED);
  });

  it('should handle standard HttpException', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not Found',
        path: '/api/v1/test',
      }),
    );
  });

  it('should handle HttpException with object response', () => {
    const exception = new HttpException(
      { message: ['field is required'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['field is required'],
        path: '/api/v1/test',
      }),
    );
  });

  it('should handle unknown errors as 500 Internal Server Error', () => {
    const exception = new Error('Something unexpected');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        path: '/api/v1/test',
      }),
    );
  });

  it('should include timestamp in all responses', () => {
    const exception = new Error('test');

    filter.catch(exception, mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });
});
