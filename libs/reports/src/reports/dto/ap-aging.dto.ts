import { PaginationMeta } from './stock-balance.dto';

/**
 * AP aging view for a single vendor.
 * Represents a row in the AP aging report with aging buckets.
 */
export interface APAgingView {
  /** Vendor identifier (UUID v4) */
  vendorId: string;
  /** Vendor display name */
  vendorName: string;
  /** Total open AP amount (THB, Decimal 10,2) */
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
 * AP aging report summary.
 */
export interface APAgingSummary {
  /** Total open AP amount across all vendors (THB) */
  totalOpen: number;
  /** Total number of vendors with open AP */
  totalVendors: number;
}

/**
 * Response for GET /api/v1/reports/ap-aging.
 */
export interface APAgingResponse {
  /** Paginated AP aging data */
  data: APAgingView[];
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Summary metrics */
  summary: APAgingSummary;
}
