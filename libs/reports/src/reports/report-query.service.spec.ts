import { ReportQueryService } from './report-query.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import {
  MOCK_OPEN_AP_ITEMS,
  MOCK_OPEN_AR_ITEMS,
  MOCK_VENDORS,
  MOCK_CUSTOMERS,
  MOCK_STOCK_BALANCES,
} from '../mocks/mock-data';

/**
 * Unit tests for ReportQueryService.
 * Tests stock balance, AP aging, and AR aging report queries.
 *
 * PrismaService is mocked since it's only used by getDashboard().
 * The getStockReport, getAPAging, and getARAging methods use mock data directly.
 */
describe('ReportQueryService', () => {
  let service: ReportQueryService;

  // Mock PrismaService — only needed for getDashboard
  const mockPrisma = {
    alertLog: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(() => {
    service = new ReportQueryService(mockPrisma as any);
  });

  // ── Stock Balance Tests ──────────────────────────────────────────

  describe('getStockReport', () => {
    it('should return all stock balances with correct structure', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await service.getStockReport(filter);

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.data.length).toBe(MOCK_STOCK_BALANCES.length);
    });

    it('should compute totalValue as qty * MA', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await service.getStockReport(filter);

      const firstItem = result.data[0];
      expect(firstItem.totalValue).toBe(firstItem.currentQty * firstItem.currentMA);
    });

    it('should compute summary totalItems as unique item count', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await service.getStockReport(filter);

      const uniqueItems = new Set(MOCK_STOCK_BALANCES.map((sb) => sb.itemId));
      expect(result.summary.totalItems).toBe(uniqueItems.size);
    });

    it('should compute summary totalValue correctly', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await service.getStockReport(filter);

      const expectedTotalValue = MOCK_STOCK_BALANCES.reduce(
        (sum, sb) => sum + sb.currentQty * sb.currentMA,
        0,
      );
      expect(result.summary.totalValue).toBe(expectedTotalValue);
    });

    it('should filter by itemId', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20, itemId: 'item-001' };
      const result = await service.getStockReport(filter);

      expect(result.data.length).toBe(2); // item-001 in wh-001 and wh-002
      result.data.forEach((view) => {
        expect(view.itemId).toBe('item-001');
      });
    });

    it('should filter by warehouseId', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20, warehouseId: 'wh-001' };
      const result = await service.getStockReport(filter);

      const expectedCount = MOCK_STOCK_BALANCES.filter(
        (sb) => sb.warehouseId === 'wh-001',
      ).length;
      expect(result.data.length).toBe(expectedCount);
      result.data.forEach((view) => {
        expect(view.warehouseId).toBe('wh-001');
      });
    });

    it('should filter by search keyword (item name)', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20, search: 'น้ำมัน' };
      const result = await service.getStockReport(filter);

      result.data.forEach((view) => {
        expect(
          view.itemName.toLowerCase().includes('น้ำมัน') ||
            view.warehouseName.toLowerCase().includes('น้ำมัน'),
        ).toBe(true);
      });
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should apply pagination correctly', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 3 };
      const result = await service.getStockReport(filter);

      expect(result.data.length).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.total).toBe(MOCK_STOCK_BALANCES.length);
      expect(result.pagination.totalPages).toBe(
        Math.ceil(MOCK_STOCK_BALANCES.length / 3),
      );
    });

    it('should return second page correctly', async () => {
      const filter: ReportFilterDto = { page: 2, limit: 3 };
      const result = await service.getStockReport(filter);

      expect(result.data.length).toBe(3);
      expect(result.pagination.page).toBe(2);
    });

    it('should return last page with remaining items', async () => {
      const filter: ReportFilterDto = { page: 3, limit: 3 };
      const result = await service.getStockReport(filter);

      const expectedRemaining = MOCK_STOCK_BALANCES.length - 6; // 9 - 6 = 3
      expect(result.data.length).toBe(expectedRemaining);
    });

    it('should return empty data for non-existent itemId', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20, itemId: 'item-999' };
      const result = await service.getStockReport(filter);

      expect(result.data.length).toBe(0);
      expect(result.summary.totalItems).toBe(0);
      expect(result.summary.totalValue).toBe(0);
    });
  });

  describe('getStockDetail', () => {
    it('should return stock detail for item across all warehouses', async () => {
      const result = await service.getStockDetail('item-001');

      expect(result.item.id).toBe('item-001');
      expect(result.item.name).toBe('น้ำมันเครื่อง 5W-30');
      expect(result.warehouses.length).toBe(2); // wh-001 and wh-002
      const warehouseIds = result.warehouses.map((w) => w.warehouseId);
      expect(warehouseIds).toContain('wh-001');
      expect(warehouseIds).toContain('wh-002');

      result.warehouses.forEach((w) => {
        expect(w.totalValue).toBe(w.currentQty * w.currentMA);
      });
    });

    it('should throw NotFoundException for non-existent item', async () => {
      await expect(service.getStockDetail('item-999')).rejects.toThrow(
        'Item not found',
      );
    });

    it('should return single warehouse for item in one location', async () => {
      const result = await service.getStockDetail('item-004');

      expect(result.item.id).toBe('item-004');
      expect(result.item.name).toBe('หัวเทียน NGK');
      expect(result.warehouses.length).toBe(1);
      expect(result.warehouses[0].warehouseId).toBe('wh-001');
    });

    it('should compute totalValue correctly for each warehouse', async () => {
      const result = await service.getStockDetail('item-005');

      result.warehouses.forEach((w) => {
        expect(w.totalValue).toBe(w.currentQty * w.currentMA);
      });
    });
  });

  // ── AP Aging Tests ───────────────────────────────────────────────

  describe('getAPAging', () => {
    it('should return all vendors grouped with aging buckets using mock data', async () => {
      const filter: ReportFilterDto = {
        asOfDate: '2025-01-20T00:00:00Z',
      };

      const result = await service.getAPAging(filter);

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.summary).toBeDefined();
      // Mock data has 3 vendors
      expect(result.summary.totalVendors).toBe(3);
    });

    it('should compute correct aging buckets for known mock data', async () => {
      // asOfDate = 2025-01-20T00:00:00Z
      // ap-001: vendor-001, 15000, created 2025-01-05T08:00:00Z → 14 days (floor) → current
      // ap-002: vendor-001, 8500, created 2024-12-10T10:00:00Z → 40 days (floor) → days31_60
      // ap-003: vendor-002, 22000, created 2024-11-20T09:00:00Z → 60 days (floor) → days31_60
      // ap-004: vendor-002, 5000, created 2024-10-01T11:00:00Z → 110 days (floor) → over90
      // ap-005: vendor-003, 12000, created 2025-01-10T14:00:00Z → 9 days (floor) → current
      const filter: ReportFilterDto = {
        asOfDate: '2025-01-20T00:00:00Z',
      };

      const result = await service.getAPAging(filter);

      const vendor001 = result.data.find((v) => v.vendorId === 'vendor-001');
      expect(vendor001).toBeDefined();
      expect(vendor001!.current).toBe(15000);
      expect(vendor001!.days31_60).toBe(8500);
      expect(vendor001!.days61_90).toBe(0);
      expect(vendor001!.over90).toBe(0);
      expect(vendor001!.totalOpen).toBe(23500);

      const vendor002 = result.data.find((v) => v.vendorId === 'vendor-002');
      expect(vendor002).toBeDefined();
      expect(vendor002!.current).toBe(0);
      // ap-003: 60 days (floor due to time offset) → days31_60 (31-60 range)
      expect(vendor002!.days31_60).toBe(22000);
      expect(vendor002!.days61_90).toBe(0);
      expect(vendor002!.over90).toBe(5000);
      expect(vendor002!.totalOpen).toBe(27000);

      const vendor003 = result.data.find((v) => v.vendorId === 'vendor-003');
      expect(vendor003).toBeDefined();
      expect(vendor003!.current).toBe(12000);
      expect(vendor003!.days31_60).toBe(0);
      expect(vendor003!.days61_90).toBe(0);
      expect(vendor003!.over90).toBe(0);
      expect(vendor003!.totalOpen).toBe(12000);
    });

    it('should filter by vendorId when provided', async () => {
      const filter: ReportFilterDto = {
        vendorId: 'vendor-001',
        asOfDate: '2025-01-20T00:00:00Z',
      };

      const result = await service.getAPAging(filter);

      expect(result.data.length).toBe(1);
      expect(result.data[0].vendorId).toBe('vendor-001');
      expect(result.summary.totalVendors).toBe(1);
      expect(result.summary.totalOpen).toBe(23500);
    });

    it('should use current date when asOfDate is not provided', async () => {
      const filter: ReportFilterDto = {};

      const result = await service.getAPAging(filter);

      // Should still return data without error
      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalVendors).toBe(3);
    });

    it('should return correct pagination metadata', async () => {
      const filter: ReportFilterDto = {
        page: 1,
        limit: 2,
        asOfDate: '2025-01-20T00:00:00Z',
      };

      const result = await service.getAPAging(filter);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.data.length).toBe(2);
    });

    it('should return second page correctly', async () => {
      const filter: ReportFilterDto = {
        page: 2,
        limit: 2,
        asOfDate: '2025-01-20T00:00:00Z',
      };

      const result = await service.getAPAging(filter);

      expect(result.pagination.page).toBe(2);
      expect(result.data.length).toBe(1);
    });

    it('should return empty data for non-existent vendorId', async () => {
      const filter: ReportFilterDto = {
        vendorId: 'vendor-999',
        asOfDate: '2025-01-20T00:00:00Z',
      };

      const result = await service.getAPAging(filter);

      expect(result.data.length).toBe(0);
      expect(result.summary.totalVendors).toBe(0);
      expect(result.summary.totalOpen).toBe(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should include summary with totalOpen and totalVendors', async () => {
      const filter: ReportFilterDto = {
        asOfDate: '2025-01-20T00:00:00Z',
      };

      const result = await service.getAPAging(filter);

      // Total open = 15000 + 8500 + 22000 + 5000 + 12000 = 62500
      expect(result.summary.totalOpen).toBe(62500);
      expect(result.summary.totalVendors).toBe(3);
    });

    it('should include vendor name from mock vendors', async () => {
      const filter: ReportFilterDto = {
        asOfDate: '2025-01-20T00:00:00Z',
      };

      const result = await service.getAPAging(filter);

      const vendor001 = result.data.find((v) => v.vendorId === 'vendor-001');
      expect(vendor001!.vendorName).toBe('บริษัท ออโต้พาร์ท จำกัด');
    });

    it('should ensure each row totalOpen equals sum of all buckets', async () => {
      const filter: ReportFilterDto = {
        page: 1,
        limit: 20,
        asOfDate: '2025-01-20T00:00:00Z',
      };

      const result = await service.getAPAging(filter);

      for (const row of result.data) {
        const bucketSum = row.current + row.days31_60 + row.days61_90 + row.over90;
        expect(row.totalOpen).toBe(bucketSum);
      }
    });

    it('should classify items correctly at bucket boundaries', async () => {
      // ap-005 created 2025-01-10T14:00:00Z
      // asOfDate 2025-02-09T14:00:00Z → exactly 30 days → current
      const filter30: ReportFilterDto = {
        vendorId: 'vendor-003',
        asOfDate: '2025-02-09T14:00:00Z',
      };
      const result30 = await service.getAPAging(filter30);
      expect(result30.data[0].current).toBe(12000); // 30 days → current
      expect(result30.data[0].days31_60).toBe(0);

      // ap-005 created 2025-01-10T14:00:00Z
      // asOfDate 2025-02-10T14:00:00Z → exactly 31 days → days31_60
      const filter31: ReportFilterDto = {
        vendorId: 'vendor-003',
        asOfDate: '2025-02-10T14:00:00Z',
      };
      const result31 = await service.getAPAging(filter31);
      expect(result31.data[0].current).toBe(0);
      expect(result31.data[0].days31_60).toBe(12000); // 31 days → days31_60
    });
  });

  // ── AR Aging Tests ───────────────────────────────────────────────

  describe('getARAging', () => {
    it('should return AR aging data grouped by customer', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await service.getARAging(filter);

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.summary).toBeDefined();
      // We have 3 customers in mock data
      expect(result.summary.totalCustomers).toBe(3);
    });

    it('should compute correct total open amount', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await service.getARAging(filter);

      // Total from mock: 18000 + 7500 + 35000 + 9800 + 4200 = 74500
      const expectedTotal = MOCK_OPEN_AR_ITEMS.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      expect(result.summary.totalOpen).toBe(expectedTotal);
    });

    it('should filter by customerId when provided', async () => {
      const filter: ReportFilterDto = {
        page: 1,
        limit: 20,
        customerId: 'cust-001',
      };
      const result = await service.getARAging(filter);

      expect(result.data.length).toBe(1);
      expect(result.data[0].customerId).toBe('cust-001');
      // cust-001 has ar-001 (18000) + ar-002 (7500) = 25500
      expect(result.data[0].totalOpen).toBe(25500);
      expect(result.summary.totalCustomers).toBe(1);
      expect(result.summary.totalOpen).toBe(25500);
    });

    it('should return empty data when customerId has no open AR', async () => {
      const filter: ReportFilterDto = {
        page: 1,
        limit: 20,
        customerId: 'cust-999',
      };
      const result = await service.getARAging(filter);

      expect(result.data.length).toBe(0);
      expect(result.summary.totalCustomers).toBe(0);
      expect(result.summary.totalOpen).toBe(0);
    });

    it('should compute aging buckets correctly based on asOfDate', async () => {
      // Use a fixed asOfDate: 2025-01-20
      // ar-001: createdAt 2025-01-08 → 12 days → current (0-30)
      // ar-002: createdAt 2024-12-15 → 36 days → days31_60
      // ar-003: createdAt 2024-11-05 → 76 days → days61_90
      // ar-004: createdAt 2024-10-15 → 97 days → over90
      // ar-005: createdAt 2025-01-12 → 8 days → current (0-30)
      const filter: ReportFilterDto = {
        page: 1,
        limit: 20,
        asOfDate: '2025-01-20',
      };
      const result = await service.getARAging(filter);

      // cust-001: ar-001 (18000 current) + ar-002 (7500 days31_60)
      const cust001 = result.data.find((d) => d.customerId === 'cust-001');
      expect(cust001).toBeDefined();
      expect(cust001!.current).toBe(18000);
      expect(cust001!.days31_60).toBe(7500);
      expect(cust001!.days61_90).toBe(0);
      expect(cust001!.over90).toBe(0);
      expect(cust001!.totalOpen).toBe(25500);

      // cust-002: ar-003 (35000 days61_90)
      const cust002 = result.data.find((d) => d.customerId === 'cust-002');
      expect(cust002).toBeDefined();
      expect(cust002!.current).toBe(0);
      expect(cust002!.days31_60).toBe(0);
      expect(cust002!.days61_90).toBe(35000);
      expect(cust002!.over90).toBe(0);

      // cust-003: ar-004 (9800 over90) + ar-005 (4200 current)
      const cust003 = result.data.find((d) => d.customerId === 'cust-003');
      expect(cust003).toBeDefined();
      expect(cust003!.current).toBe(4200);
      expect(cust003!.days31_60).toBe(0);
      expect(cust003!.days61_90).toBe(0);
      expect(cust003!.over90).toBe(9800);
      expect(cust003!.totalOpen).toBe(14000);
    });

    it('should return correct pagination metadata', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 2 };
      const result = await service.getARAging(filter);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3); // 3 customers
      expect(result.pagination.totalPages).toBe(2); // ceil(3/2)
      expect(result.data.length).toBe(2);
    });

    it('should ensure each row totalOpen equals sum of all buckets', async () => {
      const filter: ReportFilterDto = {
        page: 1,
        limit: 20,
        asOfDate: '2025-01-20',
      };
      const result = await service.getARAging(filter);

      for (const row of result.data) {
        const bucketSum =
          row.current + row.days31_60 + row.days61_90 + row.over90;
        expect(row.totalOpen).toBe(bucketSum);
      }
    });

    it('should include customer name from mock data', async () => {
      const filter: ReportFilterDto = { page: 1, limit: 20 };
      const result = await service.getARAging(filter);

      for (const row of result.data) {
        const customer = MOCK_CUSTOMERS.find((c) => c.id === row.customerId);
        expect(customer).toBeDefined();
        expect(row.customerName).toBe(customer!.name);
      }
    });
  });

  // ── Aging Bucket Boundary Tests ──────────────────────────────────

  describe('aging bucket boundaries (computeDaysDiff + assignAgingBucket)', () => {
    it('should place 0-day-old items in current bucket', async () => {
      // Use asOfDate same as creation date of ap-005 (2025-01-10)
      const filter: ReportFilterDto = {
        vendorId: 'vendor-003',
        asOfDate: '2025-01-10T14:00:00Z',
      };
      const result = await service.getAPAging(filter);

      expect(result.data[0].current).toBe(12000);
      expect(result.data[0].days31_60).toBe(0);
      expect(result.data[0].days61_90).toBe(0);
      expect(result.data[0].over90).toBe(0);
    });

    it('should place exactly 30-day-old items in current bucket', async () => {
      // ap-005 created 2025-01-10, asOfDate = 2025-02-09 → 30 days
      const filter: ReportFilterDto = {
        vendorId: 'vendor-003',
        asOfDate: '2025-02-09T14:00:00Z',
      };
      const result = await service.getAPAging(filter);

      expect(result.data[0].current).toBe(12000);
      expect(result.data[0].days31_60).toBe(0);
    });

    it('should place 31-day-old items in days31_60 bucket', async () => {
      // ap-005 created 2025-01-10, asOfDate = 2025-02-10 → 31 days
      const filter: ReportFilterDto = {
        vendorId: 'vendor-003',
        asOfDate: '2025-02-10T14:00:00Z',
      };
      const result = await service.getAPAging(filter);

      expect(result.data[0].current).toBe(0);
      expect(result.data[0].days31_60).toBe(12000);
    });

    it('should place exactly 60-day-old items in days31_60 bucket', async () => {
      // ap-005 created 2025-01-10, asOfDate = 2025-03-11 → 60 days
      const filter: ReportFilterDto = {
        vendorId: 'vendor-003',
        asOfDate: '2025-03-11T14:00:00Z',
      };
      const result = await service.getAPAging(filter);

      expect(result.data[0].days31_60).toBe(12000);
      expect(result.data[0].days61_90).toBe(0);
    });

    it('should place 61-day-old items in days61_90 bucket', async () => {
      // ap-005 created 2025-01-10, asOfDate = 2025-03-12 → 61 days
      const filter: ReportFilterDto = {
        vendorId: 'vendor-003',
        asOfDate: '2025-03-12T14:00:00Z',
      };
      const result = await service.getAPAging(filter);

      expect(result.data[0].days31_60).toBe(0);
      expect(result.data[0].days61_90).toBe(12000);
    });

    it('should place exactly 90-day-old items in days61_90 bucket', async () => {
      // ap-005 created 2025-01-10, asOfDate = 2025-04-10 → 90 days
      const filter: ReportFilterDto = {
        vendorId: 'vendor-003',
        asOfDate: '2025-04-10T14:00:00Z',
      };
      const result = await service.getAPAging(filter);

      expect(result.data[0].days61_90).toBe(12000);
      expect(result.data[0].over90).toBe(0);
    });

    it('should place 91-day-old items in over90 bucket', async () => {
      // ap-005 created 2025-01-10, asOfDate = 2025-04-11 → 91 days
      const filter: ReportFilterDto = {
        vendorId: 'vendor-003',
        asOfDate: '2025-04-11T14:00:00Z',
      };
      const result = await service.getAPAging(filter);

      expect(result.data[0].days61_90).toBe(0);
      expect(result.data[0].over90).toBe(12000);
    });
  });
});
