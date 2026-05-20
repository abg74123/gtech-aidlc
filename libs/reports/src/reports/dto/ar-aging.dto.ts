import { PaginationMeta } from './stock-balance.dto';

/**
 * AR aging view for a single customer.
 * Represents a row in the AR aging report with aging buckets.
 */
export interface ARAgingView {
  /** Customer identifier (UUID v4) */
  customerId: string;
  /** Customer display name */
  customerName: string;
  /** Total open AR amount (THB, Decimal 10,2) */
  totalOpen: number;
  /** Current bucket: 0-30 days (THB, Decimal 10,2) */
  current: number;
  /** 31-60 days bucket (THB, Decimal 10,2) */
  days31_60: number;
  /** 61-90 days bucket (THB, Decimal 10,2) */
  days61_90: number;
  /** Over 90 days bucket (THB, Decimal 10,2) */
  over90: number;
}

/**
 * AR aging report summary.
 */
export interface ARAgingSummary {
  /** Total open AR amount across all customers (THB) */
  totalOpen: number;
  /** Total number of customers with open AR */
  totalCustomers: number;
}

/**
 * Response for GET /api/v1/reports/ar-aging.
 */
export interface ARAgingResponse {
  /** Paginated AR aging data */
  data: ARAgingView[];
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Summary metrics */
  summary: ARAgingSummary;
}
