import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertRuleService } from './alert-rule.service';
import { AlertLogService, PaginatedAlertLogs } from './alert-log.service';
import { CreateTxDto, TxType } from '@autoflow/shared-types';
import { AlertValidationResult } from './dto/alert-validation-result.dto';
import { AlertQueryFilterDto } from './dto/alert-query-filter.dto';

describe('AlertsController', () => {
  let controller: AlertsController;
  let alertRuleService: jest.Mocked<Pick<AlertRuleService, 'validatePrePost'>>;
  let alertLogService: jest.Mocked<Pick<AlertLogService, 'findAlerts'>>;

  beforeEach(async () => {
    alertRuleService = {
      validatePrePost: jest.fn(),
    };

    alertLogService = {
      findAlerts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        { provide: AlertRuleService, useValue: alertRuleService },
        { provide: AlertLogService, useValue: alertLogService },
      ],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
  });

  const createBaseDto = (overrides: Partial<CreateTxDto> = {}): CreateTxDto => ({
    txType: TxType.GR_RECEIVE,
    txDate: '2025-01-15T10:00:00Z',
    period: '2025-01',
    qty: 0,
    unitCost: 0,
    totalCost: 0,
    createdBy: 'user-001',
    ...overrides,
  });

  describe('POST /validate', () => {
    it('should return 200 with valid=true when all rules pass', async () => {
      const validResult: AlertValidationResult = { valid: true, errors: [] };
      alertRuleService.validatePrePost.mockResolvedValue(validResult);

      const dto = createBaseDto();
      const result = await controller.validate(dto);

      expect(result).toEqual({ valid: true, errors: [] });
      expect(alertRuleService.validatePrePost).toHaveBeenCalledWith(dto);
    });

    it('should throw HttpException with 422 when any rule fails', async () => {
      const invalidResult: AlertValidationResult = {
        valid: false,
        errors: [
          {
            code: 'STOCK_NEGATIVE',
            message: 'สต็อกไม่เพียงพอ',
            details: { itemId: 'item-001', warehouseId: 'wh-001', available: 5, requested: 10 },
          },
        ],
      };
      alertRuleService.validatePrePost.mockResolvedValue(invalidResult);

      const dto = createBaseDto({
        txType: TxType.SALE_INVOICE,
        itemId: 'item-001',
        warehouseId: 'wh-001',
        qty: 10,
      });

      try {
        await controller.validate(dto);
        fail('Expected exception to be thrown');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        const response = error.getResponse();
        expect(response.valid).toBe(false);
        expect(response.errors).toHaveLength(1);
        expect(response.errors[0].code).toBe('STOCK_NEGATIVE');
      }
    });

    it('should return all violated rules in errors array', async () => {
      const invalidResult: AlertValidationResult = {
        valid: false,
        errors: [
          {
            code: 'CN_RETURN_INVENTORY',
            message: 'CN_RETURN ห้ามมีรายการสต็อก',
            details: { qty: 5, totalCost: 1000 },
          },
          {
            code: 'PERIOD_LOCKED',
            message: 'งวดบัญชีถูกปิดแล้ว',
            details: { period: '2024-12', status: 'CLOSED' },
          },
        ],
      };
      alertRuleService.validatePrePost.mockResolvedValue(invalidResult);

      const dto = createBaseDto({
        txType: TxType.CN_RETURN,
        period: '2024-12',
        qty: 5,
        totalCost: 1000,
      });

      try {
        await controller.validate(dto);
        fail('Expected exception to be thrown');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        const response = error.getResponse();
        expect(response.valid).toBe(false);
        expect(response.errors).toHaveLength(2);
        expect(response.errors.map((e: any) => e.code)).toEqual([
          'CN_RETURN_INVENTORY',
          'PERIOD_LOCKED',
        ]);
      }
    });
  });

  describe('GET /history', () => {
    it('should return paginated alert history', async () => {
      const mockResult: PaginatedAlertLogs = {
        data: [
          {
            id: 'alert-001',
            alertCode: 'STOCK_NEGATIVE',
            alertMessage: 'สต็อกไม่เพียงพอ',
            txType: 'SALE_INVOICE',
            txData: { txType: 'SALE_INVOICE', qty: 10 },
            itemId: 'item-001',
            warehouseId: 'wh-001',
            period: '2025-01',
            userId: 'user-001',
            createdAt: new Date('2025-01-15T10:00:00Z'),
          } as any,
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };
      alertLogService.findAlerts.mockResolvedValue(mockResult);

      const filter: AlertQueryFilterDto = { page: 1, limit: 20 };
      const result = await controller.getHistory(filter);

      expect(result).toEqual(mockResult);
      expect(alertLogService.findAlerts).toHaveBeenCalledWith(filter);
    });

    it('should pass filter parameters to service', async () => {
      const mockResult: PaginatedAlertLogs = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      alertLogService.findAlerts.mockResolvedValue(mockResult);

      const filter: AlertQueryFilterDto = {
        alertCode: 'STOCK_NEGATIVE',
        txType: 'SALE_INVOICE',
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        page: 2,
        limit: 10,
      };

      await controller.getHistory(filter);

      expect(alertLogService.findAlerts).toHaveBeenCalledWith(filter);
    });

    it('should return empty data with correct pagination when no alerts match', async () => {
      const mockResult: PaginatedAlertLogs = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      alertLogService.findAlerts.mockResolvedValue(mockResult);

      const filter: AlertQueryFilterDto = { alertCode: 'NONEXISTENT', page: 1, limit: 20 };
      const result = await controller.getHistory(filter);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });
});
