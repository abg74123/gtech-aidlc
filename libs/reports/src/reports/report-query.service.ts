import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@autoflow/shared-prisma';
import { ReportFilterDto } from './dto/report-filter.dto';
import {
  StockBalanceView,
  StockBalanceResponse,
  PaginationMeta,
} from './dto/stock-balance.dto';
import { APAgingView, APAgingResponse } from './dto/ap-aging.dto';
import { ARAgingView, ARAgingResponse } from './dto/ar-aging.dto';
import { DashboardResponse, RecentAlert } from './dto/dashboard.dto';
import {
  MOCK_STOCK_BALANCES,
  MOCK_ITEMS,
  MOCK_WAREHOUSES,
  MOCK_OPEN_AP_ITEMS,
  MOCK_OPEN_AR_ITEMS,
  MOCK_VENDORS,
  MOCK_CUSTOMERS,
} from '../mocks/mock-data';

/**
 * Service responsible for generating stock balance, AP/AR aging reports,
 * and dashboard summary metrics.
 *
 * Uses PrismaService for alert_log queries and mock data for stock/AP/AR
 * until cross-schema queries are implemented with real data.
 */
@Injectable()
export class ReportQueryService {
  private readonly logger = new Logger(ReportQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get stock balance report with pagination and filters.
   * Currently uses mock data — will be replaced with cross-schema queries.
   */
  async getStockReport(filter: ReportFilterDto): Promise<StockBalanceResponse> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    let balances = MOCK_STOCK_BALANCES.map((sb) => {
      const item = MOCK_ITEMS.find((i) => i.id === sb.itemId);
      const warehouse = MOCK_WAREHOUSES.find((w) => w.id === sb.warehouseId);
      return {
        itemId: sb.itemId,
        itemName: item?.name ?? 'Unknown',
        warehouseId: sb.warehouseId,
        warehouseName: warehouse?.name ?? 'Unknown',
        currentQty: sb.currentQty,
        currentMA: sb.currentMA,
        totalValue: sb.currentQty * sb.currentMA,
      } as StockBalanceView;
    });

    // Apply filters
    if (filter.itemId) {
      balances = balances.filter((b) => b.itemId === filter.itemId);
    }
    if (filter.warehouseId) {
      balances = balances.filter((b) => b.warehouseId === filter.warehouseId);
    }
    if (filter.search) {
      const keyword = filter.search.toLowerCase();
      balances = balances.filter(
        (b) =>
          b.itemName.toLowerCase().includes(keyword) ||
          b.warehouseName.toLowerCase().includes(keyword),
      );
    }

    const total = balances.length;
    const totalValue = balances.reduce((sum, b) => sum + b.totalValue, 0);
    const totalItems = new Set(balances.map((b) => b.itemId)).size;

    // Apply pagination
    const skip = (page - 1) * limit;
    const data = balances.slice(skip, skip + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: { totalItems, totalValue },
    };
  }

  /**
   * Get stock detail for a specific item across all warehouses.
   */
  async getStockDetail(
    itemId: string,
  ): Promise<{ item: { id: string; name: string }; warehouses: StockBalanceView[] }> {
    const item = MOCK_ITEMS.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const warehouses = MOCK_STOCK_BALANCES.filter(
      (sb) => sb.itemId === itemId,
    ).map((sb) => {
      const warehouse = MOCK_WAREHOUSES.find((w) => w.id === sb.warehouseId);
      return {
        itemId: sb.itemId,
        itemName: item.name,
        warehouseId: sb.warehouseId,
        warehouseName: warehouse?.name ?? 'Unknown',
        currentQty: sb.currentQty,
        currentMA: sb.currentMA,
        totalValue: sb.currentQty * sb.currentMA,
      } as StockBalanceView;
    });

    return {
      item: { id: item.id, name: item.name },
      warehouses,
    };
  }

  /**
   * Get AP aging report with pagination and filters.
   * Computes aging buckets based on asOfDate vs creation date.
   */
  async getAPAging(filter: ReportFilterDto): Promise<APAgingResponse> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const asOfDate = filter.asOfDate ? new Date(filter.asOfDate) : new Date();

    let items = MOCK_OPEN_AP_ITEMS;
    if (filter.vendorId) {
      items = items.filter((i) => i.vendorId === filter.vendorId);
    }

    // Group by vendor and compute aging buckets
    const vendorMap = new Map<string, APAgingView>();
    for (const item of items) {
      const daysDiff = this.computeDaysDiff(new Date(item.createdAt), asOfDate);
      const vendor = MOCK_VENDORS.find((v) => v.id === item.vendorId);

      if (!vendorMap.has(item.vendorId)) {
        vendorMap.set(item.vendorId, {
          vendorId: item.vendorId,
          vendorName: vendor?.name ?? 'Unknown',
          totalOpen: 0,
          current: 0,
          days31_60: 0,
          days61_90: 0,
          over90: 0,
        });
      }

      const entry = vendorMap.get(item.vendorId)!;
      entry.totalOpen += item.amount;
      this.assignAgingBucket(entry, item.amount, daysDiff);
    }

    const allData = Array.from(vendorMap.values());
    const total = allData.length;
    const totalOpen = allData.reduce((sum, v) => sum + v.totalOpen, 0);

    const skip = (page - 1) * limit;
    const data = allData.slice(skip, skip + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: { totalOpen, totalVendors: total },
    };
  }

  /**
   * Get AR aging report with pagination and filters.
   * Computes aging buckets based on asOfDate vs creation date.
   */
  async getARAging(filter: ReportFilterDto): Promise<ARAgingResponse> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const asOfDate = filter.asOfDate ? new Date(filter.asOfDate) : new Date();

    let items = MOCK_OPEN_AR_ITEMS;
    if (filter.customerId) {
      items = items.filter((i) => i.customerId === filter.customerId);
    }

    // Group by customer and compute aging buckets
    const customerMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        totalOpen: number;
        current: number;
        days31_60: number;
        days61_90: number;
        over90: number;
      }
    >();

    for (const item of items) {
      const daysDiff = this.computeDaysDiff(new Date(item.createdAt), asOfDate);
      const customer = MOCK_CUSTOMERS.find((c) => c.id === item.customerId);

      if (!customerMap.has(item.customerId)) {
        customerMap.set(item.customerId, {
          customerId: item.customerId,
          customerName: customer?.name ?? 'Unknown',
          totalOpen: 0,
          current: 0,
          days31_60: 0,
          days61_90: 0,
          over90: 0,
        });
      }

      const entry = customerMap.get(item.customerId)!;
      entry.totalOpen += item.amount;
      this.assignAgingBucket(entry, item.amount, daysDiff);
    }

    const allData = Array.from(customerMap.values());
    const total = allData.length;
    const totalOpen = allData.reduce((sum, c) => sum + c.totalOpen, 0);

    const skip = (page - 1) * limit;
    const data = allData.slice(skip, skip + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: { totalOpen, totalCustomers: total },
    };
  }

  /**
   * Get dashboard summary metrics.
   * Computes all metrics fresh from current data (no caching).
   *
   * - totalAlerts: count of all alert_log entries
   * - alertsByCode: groupBy alertCode with count
   * - stockValue: sum of all MOCK_STOCK_BALANCES (qty * MA)
   * - totalAP: sum of all MOCK_OPEN_AP_ITEMS amounts
   * - totalAR: sum of all MOCK_OPEN_AR_ITEMS amounts
   * - recentAlerts: latest 5 alert_log entries
   */
  async getDashboard(): Promise<DashboardResponse> {
    // Query alert metrics from database
    const [totalAlerts, alertsByCodeRaw, recentAlertsRaw] = await Promise.all([
      this.prisma.alertLog.count(),
      this.prisma.alertLog.groupBy({
        by: ['alertCode'],
        _count: { alertCode: true },
      }),
      this.prisma.alertLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Transform groupBy result to Record<string, number>
    const alertsByCode: Record<string, number> = {};
    for (const group of alertsByCodeRaw) {
      alertsByCode[group.alertCode] = group._count.alertCode;
    }

    // Compute stock value from mock data (sum of qty * MA)
    const stockValue = MOCK_STOCK_BALANCES.reduce(
      (sum, sb) => sum + sb.currentQty * sb.currentMA,
      0,
    );

    // Compute total AP from mock data
    const totalAP = MOCK_OPEN_AP_ITEMS.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    // Compute total AR from mock data
    const totalAR = MOCK_OPEN_AR_ITEMS.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    // Map recent alerts to RecentAlert interface
    const recentAlerts: RecentAlert[] = recentAlertsRaw.map((alert) => ({
      id: alert.id,
      alertCode: alert.alertCode,
      alertMessage: alert.alertMessage,
      txType: alert.txType,
      userId: alert.userId,
      createdAt: alert.createdAt.toISOString(),
    }));

    return {
      totalAlerts,
      alertsByCode,
      stockValue,
      totalAP,
      totalAR,
      recentAlerts,
    };
  }

  /**
   * Compute the number of days between two dates.
   */
  private computeDaysDiff(from: Date, to: Date): number {
    const diffMs = to.getTime() - from.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Assign an amount to the correct aging bucket based on days difference.
   */
  private assignAgingBucket(
    entry: { current: number; days31_60: number; days61_90: number; over90: number },
    amount: number,
    daysDiff: number,
  ): void {
    if (daysDiff <= 30) {
      entry.current += amount;
    } else if (daysDiff <= 60) {
      entry.days31_60 += amount;
    } else if (daysDiff <= 90) {
      entry.days61_90 += amount;
    } else {
      entry.over90 += amount;
    }
  }
}
