import { Test, TestingModule } from '@nestjs/testing';
import { AlertLogService } from './alert-log.service';
import { PrismaService } from '@autoflow/shared-prisma';
import { CreateAlertLogDto } from './dto/create-alert-log.dto';
import { AlertQueryFilterDto } from './dto/alert-query-filter.dto';

describe('AlertLogService', () => {
  let service: AlertLogService;
  let prisma: jest.Mocked<any>;

  const mockAlertLog = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    alertCode: 'STOCK_NEGATIVE',
    alertMessage: 'สต็อกไม่เพียงพอ',
    txType: 'SALE_INVOICE',
    txData: { itemId: 'item-1', qty: 10 },
    itemId: 'item-1',
    warehouseId: 'wh-1',
    period: '2025-01',
    userId: 'user-1',
    createdAt: new Date('2025-01-15T10:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      alertLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertLogService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AlertLogService>(AlertLogService);
  });

  describe('logAlert', () => {
    const createDto: CreateAlertLogDto = {
      alertCode: 'STOCK_NEGATIVE',
      alertMessage: 'สต็อกไม่เพียงพอ',
      txType: 'SALE_INVOICE',
      txData: { itemId: 'item-1', qty: 10 },
      itemId: 'item-1',
      warehouseId: 'wh-1',
      period: '2025-01',
      userId: 'user-1',
    };

    it('should persist an alert log entry and return it', async () => {
      prisma.alertLog.create.mockResolvedValue(mockAlertLog);

      const result = await service.logAlert(createDto);

      expect(result).toEqual(mockAlertLog);
      expect(prisma.alertLog.create).toHaveBeenCalledWith({
        data: {
          alertCode: 'STOCK_NEGATIVE',
          alertMessage: 'สต็อกไม่เพียงพอ',
          txType: 'SALE_INVOICE',
          txData: { itemId: 'item-1', qty: 10 },
          itemId: 'item-1',
          warehouseId: 'wh-1',
          period: '2025-01',
          userId: 'user-1',
        },
      });
    });

    it('should handle optional fields as null when not provided', async () => {
      const minimalDto: CreateAlertLogDto = {
        alertCode: 'PERIOD_LOCKED',
        alertMessage: 'งวดบัญชีถูกปิดแล้ว',
        txType: 'GR_RECEIVE',
        txData: { period: '2025-01' },
        userId: 'user-2',
      };

      prisma.alertLog.create.mockResolvedValue({
        ...mockAlertLog,
        ...minimalDto,
        itemId: null,
        warehouseId: null,
        period: null,
      });

      await service.logAlert(minimalDto);

      expect(prisma.alertLog.create).toHaveBeenCalledWith({
        data: {
          alertCode: 'PERIOD_LOCKED',
          alertMessage: 'งวดบัญชีถูกปิดแล้ว',
          txType: 'GR_RECEIVE',
          txData: { period: '2025-01' },
          itemId: null,
          warehouseId: null,
          period: null,
          userId: 'user-2',
        },
      });
    });

    it('should throw error when database write fails', async () => {
      const dbError = new Error('Database connection failed');
      prisma.alertLog.create.mockRejectedValue(dbError);

      await expect(service.logAlert(createDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('findAlerts', () => {
    const mockAlertLogs = [
      { ...mockAlertLog, id: 'id-1', createdAt: new Date('2025-01-15T12:00:00Z') },
      { ...mockAlertLog, id: 'id-2', createdAt: new Date('2025-01-15T10:00:00Z') },
    ];

    it('should return paginated results with default pagination', async () => {
      prisma.alertLog.findMany.mockResolvedValue(mockAlertLogs);
      prisma.alertLog.count.mockResolvedValue(2);

      const filter = new AlertQueryFilterDto();
      const result = await service.findAlerts(filter);

      expect(result.data).toEqual(mockAlertLogs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      expect(prisma.alertLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should apply alertCode filter', async () => {
      prisma.alertLog.findMany.mockResolvedValue(mockAlertLogs);
      prisma.alertLog.count.mockResolvedValue(2);

      const filter: AlertQueryFilterDto = { alertCode: 'STOCK_NEGATIVE', page: 1, limit: 20 };
      await service.findAlerts(filter);

      expect(prisma.alertLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { alertCode: 'STOCK_NEGATIVE' },
        }),
      );
    });

    it('should apply txType filter', async () => {
      prisma.alertLog.findMany.mockResolvedValue([]);
      prisma.alertLog.count.mockResolvedValue(0);

      const filter: AlertQueryFilterDto = { txType: 'SALE_INVOICE', page: 1, limit: 20 };
      await service.findAlerts(filter);

      expect(prisma.alertLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { txType: 'SALE_INVOICE' },
        }),
      );
    });

    it('should apply userId filter', async () => {
      prisma.alertLog.findMany.mockResolvedValue([]);
      prisma.alertLog.count.mockResolvedValue(0);

      const filter: AlertQueryFilterDto = {
        userId: 'user-1',
        page: 1,
        limit: 20,
      };
      await service.findAlerts(filter);

      expect(prisma.alertLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should apply date range filter', async () => {
      prisma.alertLog.findMany.mockResolvedValue([]);
      prisma.alertLog.count.mockResolvedValue(0);

      const filter: AlertQueryFilterDto = {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
        page: 1,
        limit: 20,
      };
      await service.findAlerts(filter);

      const expectedWhere = prisma.alertLog.findMany.mock.calls[0][0].where;
      expect(expectedWhere.createdAt.gte).toEqual(new Date('2025-01-01'));
      expect(expectedWhere.createdAt.lte.getFullYear()).toBe(2025);
      expect(expectedWhere.createdAt.lte.getMonth()).toBe(0); // January
      expect(expectedWhere.createdAt.lte.getDate()).toBe(31);
    });

    it('should apply multiple filters simultaneously', async () => {
      prisma.alertLog.findMany.mockResolvedValue([]);
      prisma.alertLog.count.mockResolvedValue(0);

      const filter: AlertQueryFilterDto = {
        alertCode: 'STOCK_NEGATIVE',
        txType: 'SALE_INVOICE',
        userId: 'user-1',
        page: 1,
        limit: 20,
      };
      await service.findAlerts(filter);

      expect(prisma.alertLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            alertCode: 'STOCK_NEGATIVE',
            txType: 'SALE_INVOICE',
            userId: 'user-1',
          },
        }),
      );
    });

    it('should calculate correct pagination for page 2', async () => {
      prisma.alertLog.findMany.mockResolvedValue(mockAlertLogs);
      prisma.alertLog.count.mockResolvedValue(50);

      const filter: AlertQueryFilterDto = { page: 2, limit: 20 };
      const result = await service.findAlerts(filter);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
      expect(prisma.alertLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
    });

    it('should sort results by createdAt descending', async () => {
      prisma.alertLog.findMany.mockResolvedValue(mockAlertLogs);
      prisma.alertLog.count.mockResolvedValue(2);

      const filter = new AlertQueryFilterDto();
      await service.findAlerts(filter);

      expect(prisma.alertLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return totalPages as 0 when no results', async () => {
      prisma.alertLog.findMany.mockResolvedValue([]);
      prisma.alertLog.count.mockResolvedValue(0);

      const filter = new AlertQueryFilterDto();
      const result = await service.findAlerts(filter);

      expect(result.pagination.totalPages).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
