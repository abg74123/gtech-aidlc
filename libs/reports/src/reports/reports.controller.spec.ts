import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportQueryService } from './report-query.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { StockBalanceResponse } from './dto/stock-balance.dto';
import { APAgingResponse } from './dto/ap-aging.dto';
import { ARAgingResponse } from './dto/ar-aging.dto';
import { DashboardResponse } from './dto/dashboard.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportQueryService: jest.Mocked<
    Pick<ReportQueryService, 'getStockReport' | 'getStockDetail' | 'getAPAging' | 'getARAging' | 'getDashboard'>
  >;

  beforeEach(async () => {
    reportQueryService = {
      getStockReport: jest.fn(),
      getStockDetail: jest.fn(),
      getAPAging: jest.fn(),
      getARAging: jest.fn(),
      getDashboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportQueryService, useValue: reportQueryService },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  describe('GET /stock-balance', () => {
    it('should return paginated stock balance data with summary', async () => {
      const mockResponse: StockBalanceResponse = {
        data: [
          {
            itemId: 'item-001',
            itemName: 'Widget A',
            warehouseId: 'wh-001',
            warehouseName: 'Main Warehouse',
            currentQty: 100,
            currentMA: 50.0,
            totalValue: 5000.0,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        summary: { totalItems: 1, totalValue: 5000.0 },
      };
      reportQueryService.getStockReport.mockResolvedValue(mockResponse);

      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await controller.getStockBalance(filter);

      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.summary.totalValue).toBe(5000.0);
      expect(reportQueryService.getStockReport).toHaveBeenCalledWith(filter);
    });

    it('should pass filter parameters to service', async () => {
      const mockResponse: StockBalanceResponse = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        summary: { totalItems: 0, totalValue: 0 },
      };
      reportQueryService.getStockReport.mockResolvedValue(mockResponse);

      const filter: ReportFilterDto = {
        page: 2,
        limit: 10,
        itemId: '550e8400-e29b-41d4-a716-446655440001',
        warehouseId: '550e8400-e29b-41d4-a716-446655440002',
        search: 'widget',
      };

      await controller.getStockBalance(filter);

      expect(reportQueryService.getStockReport).toHaveBeenCalledWith(filter);
    });
  });

  describe('GET /stock-balance/:itemId', () => {
    it('should return stock detail for a specific item', async () => {
      const mockDetail = {
        item: { id: 'item-001', name: 'Widget A' },
        warehouses: [
          {
            itemId: 'item-001',
            itemName: 'Widget A',
            warehouseId: 'wh-001',
            warehouseName: 'Main Warehouse',
            currentQty: 100,
            currentMA: 50.0,
            totalValue: 5000.0,
          },
        ],
      };
      reportQueryService.getStockDetail.mockResolvedValue(mockDetail);

      const result = await controller.getStockDetail('item-001');

      expect(result).toEqual(mockDetail);
      expect(result.item.id).toBe('item-001');
      expect(result.warehouses).toHaveLength(1);
      expect(reportQueryService.getStockDetail).toHaveBeenCalledWith('item-001');
    });

    it('should propagate NotFoundException for non-existent item', async () => {
      reportQueryService.getStockDetail.mockRejectedValue(
        new NotFoundException('Item not found'),
      );

      await expect(controller.getStockDetail('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('GET /ap-aging', () => {
    it('should return paginated AP aging data with summary', async () => {
      const mockResponse: APAgingResponse = {
        data: [
          {
            vendorId: 'vendor-001',
            vendorName: 'Supplier A',
            totalOpen: 15000.0,
            current: 5000.0,
            days31_60: 4000.0,
            days61_90: 3000.0,
            over90: 3000.0,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        summary: { totalOpen: 15000.0, totalVendors: 1 },
      };
      reportQueryService.getAPAging.mockResolvedValue(mockResponse);

      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await controller.getAPAging(filter);

      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(1);
      expect(result.summary.totalOpen).toBe(15000.0);
      expect(reportQueryService.getAPAging).toHaveBeenCalledWith(filter);
    });

    it('should pass vendorId and asOfDate filters to service', async () => {
      const mockResponse: APAgingResponse = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        summary: { totalOpen: 0, totalVendors: 0 },
      };
      reportQueryService.getAPAging.mockResolvedValue(mockResponse);

      const filter: ReportFilterDto = {
        page: 1,
        limit: 20,
        vendorId: '550e8400-e29b-41d4-a716-446655440003',
        asOfDate: '2025-01-31',
      };

      await controller.getAPAging(filter);

      expect(reportQueryService.getAPAging).toHaveBeenCalledWith(filter);
    });
  });

  describe('GET /ar-aging', () => {
    it('should return paginated AR aging data with summary', async () => {
      const mockResponse: ARAgingResponse = {
        data: [
          {
            customerId: 'cust-001',
            customerName: 'Customer A',
            totalOpen: 20000.0,
            current: 8000.0,
            days31_60: 5000.0,
            days61_90: 4000.0,
            over90: 3000.0,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        summary: { totalOpen: 20000.0, totalCustomers: 1 },
      };
      reportQueryService.getARAging.mockResolvedValue(mockResponse);

      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await controller.getARAging(filter);

      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(1);
      expect(result.summary.totalOpen).toBe(20000.0);
      expect(reportQueryService.getARAging).toHaveBeenCalledWith(filter);
    });

    it('should pass customerId and asOfDate filters to service', async () => {
      const mockResponse: ARAgingResponse = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        summary: { totalOpen: 0, totalCustomers: 0 },
      };
      reportQueryService.getARAging.mockResolvedValue(mockResponse);

      const filter: ReportFilterDto = {
        page: 1,
        limit: 20,
        customerId: '550e8400-e29b-41d4-a716-446655440004',
        asOfDate: '2025-01-31',
      };

      await controller.getARAging(filter);

      expect(reportQueryService.getARAging).toHaveBeenCalledWith(filter);
    });
  });

  describe('GET /dashboard', () => {
    it('should return dashboard summary metrics', async () => {
      const mockResponse: DashboardResponse = {
        totalAlerts: 10,
        alertsByCode: {
          STOCK_NEGATIVE: 5,
          PERIOD_LOCKED: 3,
          DUPLICATE_INVOICE: 2,
        },
        stockValue: 150000.0,
        totalAP: 50000.0,
        totalAR: 75000.0,
        recentAlerts: [
          {
            id: 'alert-001',
            alertCode: 'STOCK_NEGATIVE',
            alertMessage: 'สต็อกไม่เพียงพอ',
            txType: 'SALE_INVOICE',
            userId: 'user-001',
            createdAt: '2025-01-15T10:00:00.000Z',
          },
        ],
      };
      reportQueryService.getDashboard.mockResolvedValue(mockResponse);

      const result = await controller.getDashboard();

      expect(result).toEqual(mockResponse);
      expect(result.totalAlerts).toBe(10);
      expect(result.alertsByCode).toHaveProperty('STOCK_NEGATIVE', 5);
      expect(result.stockValue).toBe(150000.0);
      expect(result.totalAP).toBe(50000.0);
      expect(result.totalAR).toBe(75000.0);
      expect(result.recentAlerts).toHaveLength(1);
      expect(reportQueryService.getDashboard).toHaveBeenCalled();
    });
  });
});
