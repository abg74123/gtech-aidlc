import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { AlertValidationGuard } from './alert-validation.guard';
import { AlertRuleService } from './alert-rule.service';
import { AlertLogService } from './alert-log.service';
import { DomainException, ErrorCodes } from '@autoflow/shared-errors';
import { CreateTxDto, TxType } from '@autoflow/shared-types';
import { AlertValidationResult } from './dto/alert-validation-result.dto';

describe('AlertValidationGuard', () => {
  let guard: AlertValidationGuard;
  let alertRuleService: jest.Mocked<AlertRuleService>;
  let alertLogService: jest.Mocked<AlertLogService>;

  const mockDto: CreateTxDto = {
    txType: TxType.SALE_INVOICE,
    txDate: '2025-01-15T00:00:00Z',
    period: '2025-01',
    qty: 5,
    unitCost: 100,
    totalCost: 500,
    itemId: 'item-001',
    warehouseId: 'wh-001',
    createdBy: 'user-001',
  };

  const mockUserId = 'user-001';

  function createMockExecutionContext(
    body: CreateTxDto,
    user?: { userId: string },
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          body,
          user: user ?? { userId: mockUserId },
        }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
      getType: () => 'http' as any,
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    alertRuleService = {
      validatePrePost: jest.fn(),
    } as unknown as jest.Mocked<AlertRuleService>;

    alertLogService = {
      logAlert: jest.fn(),
    } as unknown as jest.Mocked<AlertLogService>;

    guard = new AlertValidationGuard(alertRuleService, alertLogService);
  });

  describe('canActivate', () => {
    it('should return true when all validation rules pass', async () => {
      const validResult: AlertValidationResult = { valid: true, errors: [] };
      alertRuleService.validatePrePost.mockResolvedValue(validResult);

      const context = createMockExecutionContext(mockDto);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(alertRuleService.validatePrePost).toHaveBeenCalledWith(mockDto);
      expect(alertLogService.logAlert).not.toHaveBeenCalled();
    });

    it('should throw DomainException with HTTP 422 when rules fail', async () => {
      const failedResult: AlertValidationResult = {
        valid: false,
        errors: [
          {
            code: 'STOCK_NEGATIVE',
            message: 'สต็อกไม่เพียงพอ',
            details: { itemId: 'item-001', available: 3, requested: 5 },
          },
        ],
      };
      alertRuleService.validatePrePost.mockResolvedValue(failedResult);
      alertLogService.logAlert.mockResolvedValue({} as any);

      const context = createMockExecutionContext(mockDto);

      await expect(guard.canActivate(context)).rejects.toThrow(
        DomainException,
      );

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        const domainError = error as DomainException;
        expect(domainError.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(domainError.errorCode).toBe(
          ErrorCodes.ALERT_VALIDATION_FAILED,
        );
        expect(domainError.metadata).toEqual({
          valid: false,
          errors: failedResult.errors,
        });
      }
    });

    it('should log each error via AlertLogService when rules fail', async () => {
      const failedResult: AlertValidationResult = {
        valid: false,
        errors: [
          {
            code: 'STOCK_NEGATIVE',
            message: 'สต็อกไม่เพียงพอ',
            details: { itemId: 'item-001', available: 3, requested: 5 },
          },
          {
            code: 'PERIOD_LOCKED',
            message: 'งวดบัญชีถูกปิดแล้ว',
            details: { period: '2025-01', status: 'CLOSED' },
          },
        ],
      };
      alertRuleService.validatePrePost.mockResolvedValue(failedResult);
      alertLogService.logAlert.mockResolvedValue({} as any);

      const context = createMockExecutionContext(mockDto);

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(alertLogService.logAlert).toHaveBeenCalledTimes(2);
      expect(alertLogService.logAlert).toHaveBeenCalledWith({
        alertCode: 'STOCK_NEGATIVE',
        alertMessage: 'สต็อกไม่เพียงพอ',
        txType: TxType.SALE_INVOICE,
        txData: mockDto,
        itemId: 'item-001',
        warehouseId: 'wh-001',
        period: '2025-01',
        userId: mockUserId,
      });
      expect(alertLogService.logAlert).toHaveBeenCalledWith({
        alertCode: 'PERIOD_LOCKED',
        alertMessage: 'งวดบัญชีถูกปิดแล้ว',
        txType: TxType.SALE_INVOICE,
        txData: mockDto,
        itemId: 'item-001',
        warehouseId: 'wh-001',
        period: '2025-01',
        userId: mockUserId,
      });
    });

    it('should extract userId from request.user.userId', async () => {
      const failedResult: AlertValidationResult = {
        valid: false,
        errors: [
          {
            code: 'PERIOD_LOCKED',
            message: 'งวดบัญชีถูกปิดแล้ว',
            details: { period: '2025-01' },
          },
        ],
      };
      alertRuleService.validatePrePost.mockResolvedValue(failedResult);
      alertLogService.logAlert.mockResolvedValue({} as any);

      const customUserId = 'custom-user-123';
      const context = createMockExecutionContext(mockDto, {
        userId: customUserId,
      });

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(alertLogService.logAlert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: customUserId }),
      );
    });

    it('should use "unknown" as userId when request.user is not present', async () => {
      const failedResult: AlertValidationResult = {
        valid: false,
        errors: [
          {
            code: 'PERIOD_LOCKED',
            message: 'งวดบัญชีถูกปิดแล้ว',
            details: { period: '2025-01' },
          },
        ],
      };
      alertRuleService.validatePrePost.mockResolvedValue(failedResult);
      alertLogService.logAlert.mockResolvedValue({} as any);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            body: mockDto,
            user: undefined,
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
        getArgs: () => [],
        getArgByIndex: () => ({}),
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
        getType: () => 'http' as any,
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(alertLogService.logAlert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'unknown' }),
      );
    });

    it('should still throw DomainException even if logAlert fails', async () => {
      const failedResult: AlertValidationResult = {
        valid: false,
        errors: [
          {
            code: 'STOCK_NEGATIVE',
            message: 'สต็อกไม่เพียงพอ',
            details: { itemId: 'item-001' },
          },
        ],
      };
      alertRuleService.validatePrePost.mockResolvedValue(failedResult);
      alertLogService.logAlert.mockRejectedValue(
        new Error('DB connection failed'),
      );

      const context = createMockExecutionContext(mockDto);

      await expect(guard.canActivate(context)).rejects.toThrow(
        DomainException,
      );
    });

    it('should include all errors in the DomainException metadata', async () => {
      const errors = [
        {
          code: 'STOCK_NEGATIVE',
          message: 'สต็อกไม่เพียงพอ',
          details: { itemId: 'item-001' },
        },
        {
          code: 'CN_RETURN_INVENTORY',
          message: 'CN_RETURN ห้ามมีรายการสต็อก',
          details: { qty: 5 },
        },
        {
          code: 'PERIOD_LOCKED',
          message: 'งวดบัญชีถูกปิดแล้ว',
          details: { period: '2025-01' },
        },
      ];
      const failedResult: AlertValidationResult = {
        valid: false,
        errors,
      };
      alertRuleService.validatePrePost.mockResolvedValue(failedResult);
      alertLogService.logAlert.mockResolvedValue({} as any);

      const context = createMockExecutionContext(mockDto);

      try {
        await guard.canActivate(context);
        fail('Expected DomainException to be thrown');
      } catch (error) {
        const domainError = error as DomainException;
        expect(domainError.metadata?.['errors']).toEqual(errors);
        expect((domainError.metadata?.['errors'] as any[]).length).toBe(3);
      }
    });
  });
});
