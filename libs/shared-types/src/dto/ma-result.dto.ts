/**
 * Result DTO for Moving Average calculation.
 * Returned after any TX that affects stock/MA.
 */
export interface MaResult {
  /** Item ID (UUID v4) */
  itemId: string;
  /** Warehouse ID (UUID v4) */
  warehouseId: string;
  /** MA before the transaction — Decimal(10,2) */
  maBefore: number;
  /** MA after the transaction — Decimal(10,2) */
  maAfter: number;
  /** Stock quantity before */
  stockBefore: number;
  /** Stock quantity after */
  stockAfter: number;
  /** Total inventory value after — Decimal(10,2) */
  totalValueAfter: number;
  /** Whether MA was recalculated (true for stock-in, false for stock-out) */
  maRecalculated: boolean;
}
