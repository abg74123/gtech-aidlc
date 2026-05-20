import { Test, TestingModule } from '@nestjs/testing';
import { TxType } from '@autoflow/shared-types';
import { AlertRuleService } from './alert-rule.service';
import {
  TX_LOG_SERVICE,
  STOCK_VALIDATION_SERVICE,
  PERIOD_SERVICE,
} from '../mocks';
import { CreateTxDto } from '@autoflow/shared-types';

describe('AlertRuleService', () => {
  let service: AlertRuleService;
  let mockTxLogService: {
    hasInvoiceForJo: jest.Mock;
    hasTempDoForJo: jest.Mock;
    getStockBalance: jest.Mock;
  };
  let mockStockValidationService: {
    validateStockAvailability: jest.Mock;
    getStockBalance: jest.Mock;
    isStockFrozen: jest.Mock;
  };
  let mockPeriodService: {
    validatePeriodOpen: jest.Mock;
    getCurrentPeriod: jest.Mock;
    closePeriod: jest.Mock;
    getPeriodInfo: jest.Mock;
  };

  beforeEach(async () => {
    mockTxLogService = {
      hasInvoiceForJo: jest.fn().mockResolvedValue(false),
      hasTempDoForJo: jest.fn().mockResolvedValue(false),
      getStockBalance: jest.fn().mockResolvedValue({ qty: 100, ma: 250 }),
    };

    mockStockValidationService = {
      validateStockAvailability: jest.fn().mockResolvedValue({
        valid: true,
        availableQty: 100,
        requestedQty: 10,
      }),
      getStockBalance: jest.fn().mockResolvedValue(100),
      isStockFrozen: jest.fn().mockResolvedValue(false),
    };

    mockPeriodService = {
      validatePeriodOpen: jest.fn().mockResolvedValue(true),
      getCurrentPeriod: jest.fn().mockReturnValue('2025-01'),
      closePeriod: jest.fn(),
      getPeriodInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleService,
        { provide: TX_LOG_SERVICE, useValue: mockTxLogService },
        { provide: STOCK_VALIDATION_SERVICE, useValue: mockStockValidationService },
        { provide: PERIOD_SERVICE, useValue: mockPeriodService },
      ],
    }).compile();

    service = module.get<AlertRuleService>(AlertRuleService);
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

  describe('validatePrePost', () => {
    it('should return valid=true when no rules are violated', async () => {
      const dto = createBaseDto();
      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return all violated rules (not just first)', async () => {
      // Setup: CN_RETURN with non-zero qty in a closed period
      mockPeriodService.validatePeriodOpen.mockResolvedValue(false);

      const dto = createBaseDto({
        txType: TxType.CN_RETURN,
        period: '2024-12',
        qty: 5,
        totalCost: 1000,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

      const codes = result.errors.map((e) => e.code);
      expect(codes).toContain('CN_RETURN_INVENTORY');
      expect(codes).toContain('PERIOD_LOCKED');
    });
  });

  describe('Rule 1: STOCK_NEGATIVE', () => {
    it('should return STOCK_NEGATIVE when stock-decreasing TX exceeds available stock', async () => {
      mockStockValidationService.validateStockAvailability.mockResolvedValue({
        valid: false,
        availableQty: 5,
        requestedQty: 10,
      });

      const dto = createBaseDto({
        txType: TxType.SALE_INVOICE,
        itemId: 'item-001',
        warehouseId: 'wh-001',
        qty: 10,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('STOCK_NEGATIVE');
      expect(result.errors[0].message).toBe('สต็อกไม่เพียงพอ');
      expect(result.errors[0].details).toEqual({
        itemId: 'item-001',
        warehouseId: 'wh-001',
        available: 5,
        requested: 10,
      });
    });

    it('should pass when stock is sufficient', async () => {
      const dto = createBaseDto({
        txType: TxType.SALE_INVOICE,
        itemId: 'item-001',
        warehouseId: 'wh-001',
        qty: 5,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not check stock for non-stock-decreasing TX types', async () => {
      const dto = createBaseDto({
        txType: TxType.GR_RECEIVE,
        itemId: 'item-001',
        warehouseId: 'wh-001',
        qty: 100,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(true);
      expect(mockStockValidationService.validateStockAvailability).not.toHaveBeenCalled();
    });

    it('should check stock for all stock-decreasing TX types', async () => {
      const stockDecreasingTypes = [
        TxType.SALE_INVOICE,
        TxType.TEMP_DO,
        TxType.GR_RETURN,
        TxType.ADJ_COUNT_DOWN,
        TxType.ADJ_TRANSFER,
        TxType.ADJ_WRITEOFF,
      ];

      for (const txType of stockDecreasingTypes) {
        mockStockValidationService.validateStockAvailability.mockClear();
        mockStockValidationService.validateStockAvailability.mockResolvedValue({
          valid: true,
          availableQty: 100,
          requestedQty: 5,
        });

        const dto = createBaseDto({
          txType,
          itemId: 'item-001',
          warehouseId: 'wh-001',
          qty: 5,
        });

        await service.validatePrePost(dto);
        expect(mockStockValidationService.validateStockAvailability).toHaveBeenCalled();
      }
    });

    it('should skip stock check when itemId or warehouseId is missing', async () => {
      const dto = createBaseDto({
        txType: TxType.SALE_INVOICE,
        qty: 10,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(true);
      expect(mockStockValidationService.validateStockAvailability).not.toHaveBeenCalled();
    });
  });

  describe('Rule 2: CN_RETURN_INVENTORY', () => {
    it('should return CN_RETURN_INVENTORY when CN_RETURN has non-zero qty', async () => {
      const dto = createBaseDto({
        txType: TxType.CN_RETURN,
        qty: 5,
        totalCost: 0,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CN_RETURN_INVENTORY');
      expect(result.errors[0].message).toBe('CN_RETURN ห้ามมีรายการสต็อก');
      expect(result.errors[0].details).toEqual({ qty: 5, totalCost: 0 });
    });

    it('should return CN_RETURN_INVENTORY when CN_RETURN has non-zero totalCost', async () => {
      const dto = createBaseDto({
        txType: TxType.CN_RETURN,
        qty: 0,
        totalCost: 1500,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('CN_RETURN_INVENTORY');
      expect(result.errors[0].details).toEqual({ qty: 0, totalCost: 1500 });
    });

    it('should pass when CN_RETURN has zero qty and totalCost', async () => {
      const dto = createBaseDto({
        txType: TxType.CN_RETURN,
        qty: 0,
        totalCost: 0,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(true);
    });

    it('should not apply to non-CN_RETURN types', async () => {
      const dto = createBaseDto({
        txType: TxType.GR_RECEIVE,
        qty: 10,
        totalCost: 5000,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(true);
    });
  });

  describe('Rule 3: DUPLICATE_INVOICE', () => {
    it('should return DUPLICATE_INVOICE when JO already has an invoice', async () => {
      mockTxLogService.hasInvoiceForJo.mockResolvedValue(true);

      const dto = createBaseDto({
        txType: TxType.SALE_INVOICE,
        refJoId: 'jo-001',
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('DUPLICATE_INVOICE');
      expect(result.errors[0].message).toBe('ใบสั่งงานนี้มีใบแจ้งหนี้แล้ว');
      expect(result.errors[0].details).toEqual({
        refJoId: 'jo-001',
        txType: TxType.SALE_INVOICE,
      });
    });

    it('should return DUPLICATE_INVOICE when SALE_INVOICE targets JO with TEMP_DO', async () => {
      mockTxLogService.hasTempDoForJo.mockResolvedValue(true);

      const dto = createBaseDto({
        txType: TxType.SALE_INVOICE,
        refJoId: 'jo-002',
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('DUPLICATE_INVOICE');
      expect(result.errors[0].message).toBe('ห้ามสร้าง SALE_INVOICE จาก JO ที่มี TEMP_DO');
      expect(result.errors[0].details).toEqual({
        refJoId: 'jo-002',
        txType: TxType.SALE_INVOICE,
        hasTempDo: true,
      });
    });

    it('should return DUPLICATE_INVOICE for INVOICE_FROM_DO with existing invoice', async () => {
      mockTxLogService.hasInvoiceForJo.mockResolvedValue(true);

      const dto = createBaseDto({
        txType: TxType.INVOICE_FROM_DO,
        refJoId: 'jo-001',
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('DUPLICATE_INVOICE');
    });

    it('should not check hasTempDo for INVOICE_FROM_DO', async () => {
      mockTxLogService.hasTempDoForJo.mockResolvedValue(true);

      const dto = createBaseDto({
        txType: TxType.INVOICE_FROM_DO,
        refJoId: 'jo-002',
      });

      const result = await service.validatePrePost(dto);

      // INVOICE_FROM_DO should not trigger DUPLICATE_INVOICE for hasTempDo
      const duplicateErrors = result.errors.filter((e) => e.code === 'DUPLICATE_INVOICE');
      expect(duplicateErrors).toHaveLength(0);
    });

    it('should pass when JO has no existing invoice', async () => {
      const dto = createBaseDto({
        txType: TxType.SALE_INVOICE,
        refJoId: 'jo-003',
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(true);
    });

    it('should skip check when refJoId is not provided', async () => {
      const dto = createBaseDto({
        txType: TxType.SALE_INVOICE,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(true);
      expect(mockTxLogService.hasInvoiceForJo).not.toHaveBeenCalled();
    });
  });

  describe('Rule 4: INVOICE_FROM_DO_STOCK', () => {
    it('should return INVOICE_FROM_DO_STOCK when qty is non-zero', async () => {
      const dto = createBaseDto({
        txType: TxType.INVOICE_FROM_DO,
        qty: 5,
        totalCost: 0,
        arAmount: 0,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      const stockError = result.errors.find((e) => e.code === 'INVOICE_FROM_DO_STOCK');
      expect(stockError).toBeDefined();
      expect(stockError!.message).toBe('INVOICE_FROM_DO ห้ามมีรายการสต็อก/AR');
      expect(stockError!.details).toEqual({ qty: 5, totalCost: 0, arAmount: 0 });
    });

    it('should return INVOICE_FROM_DO_STOCK when totalCost is non-zero', async () => {
      const dto = createBaseDto({
        txType: TxType.INVOICE_FROM_DO,
        qty: 0,
        totalCost: 1000,
        arAmount: 0,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      const stockError = result.errors.find((e) => e.code === 'INVOICE_FROM_DO_STOCK');
      expect(stockError).toBeDefined();
    });

    it('should return INVOICE_FROM_DO_STOCK when arAmount is non-zero', async () => {
      const dto = createBaseDto({
        txType: TxType.INVOICE_FROM_DO,
        qty: 0,
        totalCost: 0,
        arAmount: 5000,
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      const stockError = result.errors.find((e) => e.code === 'INVOICE_FROM_DO_STOCK');
      expect(stockError).toBeDefined();
      expect(stockError!.details).toEqual({ qty: 0, totalCost: 0, arAmount: 5000 });
    });

    it('should pass when INVOICE_FROM_DO has all zero fields', async () => {
      const dto = createBaseDto({
        txType: TxType.INVOICE_FROM_DO,
        qty: 0,
        totalCost: 0,
        arAmount: 0,
      });

      const result = await service.validatePrePost(dto);

      // Should not have INVOICE_FROM_DO_STOCK error
      const stockError = result.errors.find((e) => e.code === 'INVOICE_FROM_DO_STOCK');
      expect(stockError).toBeUndefined();
    });

    it('should not apply to non-INVOICE_FROM_DO types', async () => {
      const dto = createBaseDto({
        txType: TxType.SALE_INVOICE,
        qty: 5,
        totalCost: 1000,
        arAmount: 5000,
      });

      const result = await service.validatePrePost(dto);

      const stockError = result.errors.find((e) => e.code === 'INVOICE_FROM_DO_STOCK');
      expect(stockError).toBeUndefined();
    });
  });

  describe('Rule 5: PERIOD_LOCKED', () => {
    it('should return PERIOD_LOCKED when period is CLOSED', async () => {
      mockPeriodService.validatePeriodOpen.mockResolvedValue(false);

      const dto = createBaseDto({
        period: '2024-12',
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PERIOD_LOCKED');
      expect(result.errors[0].message).toBe('งวดบัญชีถูกปิดแล้ว');
      expect(result.errors[0].details).toEqual({
        period: '2024-12',
        status: 'CLOSED',
      });
    });

    it('should pass when period is OPEN', async () => {
      const dto = createBaseDto({
        period: '2025-01',
      });

      const result = await service.validatePrePost(dto);

      expect(result.valid).toBe(true);
    });

    it('should check period for any TX type', async () => {
      mockPeriodService.validatePeriodOpen.mockResolvedValue(false);

      const txTypes = [TxType.GR_RECEIVE, TxType.SALE_INVOICE, TxType.CN_RETURN, TxType.AP_PAYMENT];

      for (const txType of txTypes) {
        const dto = createBaseDto({ txType, period: '2024-12' });
        const result = await service.validatePrePost(dto);

        const periodError = result.errors.find((e) => e.code === 'PERIOD_LOCKED');
        expect(periodError).toBeDefined();
      }
    });
  });
});
