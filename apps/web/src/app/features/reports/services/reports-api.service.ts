import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ─── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Stock Balance ─────────────────────────────────────────────────────────────

export interface StockBalanceView {
  itemId: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  currentQty: number;
  currentMA: number;
  totalValue: number;
}

export interface StockBalanceSummary {
  totalItems: number;
  totalValue: number;
}

export interface StockBalanceResponse {
  data: StockBalanceView[];
  pagination: PaginationMeta;
  summary: StockBalanceSummary;
}

export interface StockBalanceFilter {
  page?: number;
  limit?: number;
  itemId?: string;
  warehouseId?: string;
  search?: string;
}

export interface StockDetailResponse {
  item: { id: string; name: string };
  warehouses: StockBalanceView[];
}

// ─── AP Aging ──────────────────────────────────────────────────────────────────

export interface APAgingView {
  vendorId: string;
  vendorName: string;
  totalOpen: number;
  current: number;
  days31_60: number;
  days61_90: number;
  over90: number;
}

export interface APAgingSummary {
  totalOpen: number;
  totalVendors: number;
}

export interface APAgingResponse {
  data: APAgingView[];
  pagination: PaginationMeta;
  summary: APAgingSummary;
}

export interface APAgingFilter {
  page?: number;
  limit?: number;
  vendorId?: string;
  asOfDate?: string;
}

// ─── AR Aging ──────────────────────────────────────────────────────────────────

export interface ARAgingView {
  customerId: string;
  customerName: string;
  totalOpen: number;
  current: number;
  days31_60: number;
  days61_90: number;
  over90: number;
}

export interface ARAgingSummary {
  totalOpen: number;
  totalCustomers: number;
}

export interface ARAgingResponse {
  data: ARAgingView[];
  pagination: PaginationMeta;
  summary: ARAgingSummary;
}

export interface ARAgingFilter {
  page?: number;
  limit?: number;
  customerId?: string;
  asOfDate?: string;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface RecentAlert {
  id: string;
  alertCode: string;
  alertMessage: string;
  txType: string;
  userId: string;
  createdAt: string;
}

export interface DashboardResponse {
  totalAlerts: number;
  alertsByCode: Record<string, number>;
  stockValue: number;
  totalAP: number;
  totalAR: number;
  recentAlerts: RecentAlert[];
}

// ─── Alert History ─────────────────────────────────────────────────────────────

export interface AlertLog {
  id: string;
  alertCode: string;
  alertMessage: string;
  txType: string;
  txData: Record<string, unknown>;
  itemId: string | null;
  warehouseId: string | null;
  period: string | null;
  userId: string;
  createdAt: string;
}

export interface AlertHistoryResponse {
  data: AlertLog[];
  pagination: PaginationMeta;
}

export interface AlertHistoryFilter {
  page?: number;
  limit?: number;
  alertCode?: string;
  txType?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /**
   * GET /api/v1/reports/stock-balance
   * Returns paginated stock balance with optional filters.
   */
  getStockBalance(filter: StockBalanceFilter = {}): Observable<StockBalanceResponse> {
    const params = this.buildParams(filter);
    return this.http.get<StockBalanceResponse>(
      `${this.baseUrl}/reports/stock-balance`,
      { params }
    );
  }

  /**
   * GET /api/v1/reports/stock-balance/:itemId
   * Returns stock detail for a specific item across all warehouses.
   */
  getStockDetail(itemId: string): Observable<StockDetailResponse> {
    return this.http.get<StockDetailResponse>(
      `${this.baseUrl}/reports/stock-balance/${itemId}`
    );
  }

  /**
   * GET /api/v1/reports/ap-aging
   * Returns paginated AP aging report with optional filters.
   */
  getAPAging(filter: APAgingFilter = {}): Observable<APAgingResponse> {
    const params = this.buildParams(filter);
    return this.http.get<APAgingResponse>(
      `${this.baseUrl}/reports/ap-aging`,
      { params }
    );
  }

  /**
   * GET /api/v1/reports/ar-aging
   * Returns paginated AR aging report with optional filters.
   */
  getARAging(filter: ARAgingFilter = {}): Observable<ARAgingResponse> {
    const params = this.buildParams(filter);
    return this.http.get<ARAgingResponse>(
      `${this.baseUrl}/reports/ar-aging`,
      { params }
    );
  }

  /**
   * GET /api/v1/reports/dashboard
   * Returns dashboard summary metrics.
   */
  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(
      `${this.baseUrl}/reports/dashboard`
    );
  }

  /**
   * GET /api/v1/alerts/history
   * Returns paginated alert history with optional filters.
   */
  getAlertHistory(filter: AlertHistoryFilter = {}): Observable<AlertHistoryResponse> {
    const params = this.buildParams(filter);
    return this.http.get<AlertHistoryResponse>(
      `${this.baseUrl}/alerts/history`,
      { params }
    );
  }

  /**
   * Builds HttpParams from a filter object, omitting undefined/null values.
   */
  private buildParams(filter: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
