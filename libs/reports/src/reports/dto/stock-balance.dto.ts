/**
 * Stock balance view for a single item in a specific warehouse.
 * Represents a row in the stock balance report.
 */
export interface StockBalanceView {
  /** Item identifier (UUID v4) */
  itemId: string;
  /** Item display name */
  itemName: string;
  /** Warehouse identifier (UUID v4) */
  warehouseId: string;
  /** Warehouse display name */
  warehouseName: string;
  /** Current stock quantity */
  currentQty: number;
  /** Current Moving Average cost (THB, Decimal 10,2) */
  currentMA: number;
  /** Total inventory value = currentQty × currentMA (THB, Decimal 10,2) */
  totalValue: number;
}

/**
 * Pagination metadata for paginated responses.
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Stock balance report summary.
 */
export interface StockBalanceSummary {
  /** Total number of distinct items */
  totalItems: number;
  /** Total inventory value across all items (THB) */
  totalValue: number;
}

/**
 * Response for GET /api/v1/reports/stock-balance.
 */
export interface StockBalanceResponse {
  /** Paginated stock balance data */
  data: StockBalanceView[];
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Summary metrics */
  summary: StockBalanceSummary;
}
