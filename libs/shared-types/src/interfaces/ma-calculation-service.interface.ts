/**
 * Result of a Moving Average calculation.
 */
export interface MaCalculationResult {
  /** MA before this transaction */
  maBefore: number;
  /** MA after this transaction */
  maAfter: number;
  /** Stock quantity before */
  stockBefore: number;
  /** Stock quantity after */
  stockAfter: number;
  /** Total inventory value after */
  totalValueAfter: number;
}

/**
 * Input parameters for MA calculation.
 */
export interface MaCalculationInput {
  /** Current stock quantity */
  currentQty: number;
  /** Current MA (cost per unit) */
  currentMa: number;
  /** Quantity change (positive = in, negative = out) */
  qtyChange: number;
  /** Unit cost of the incoming goods (only relevant for stock-in) */
  unitCost: number;
}

/**
 * Service interface for Moving Average cost calculations.
 * MA = Total inventory value / Total quantity
 *
 * Rules:
 * - MA recalculates only on stock-in (GR_RECEIVE, GR_REPLACEMENT, CN_SALES_RETURN, ADJ_COUNT_UP, etc.)
 * - Stock-out uses current MA (no recalculation)
 * - MA must never be recalculated retroactively
 */
export interface IMaCalculationService {
  /**
   * Calculate new MA for a stock-in transaction.
   * Formula: newMA = (currentQty * currentMA + incomingQty * incomingCost) / (currentQty + incomingQty)
   */
  calculateMa(input: MaCalculationInput): MaCalculationResult;

  /**
   * Calculate stock-out impact (uses current MA, no recalculation).
   */
  calculateStockOut(currentQty: number, currentMa: number, outQty: number): MaCalculationResult;

  /**
   * Get current MA for an item in a warehouse.
   */
  getCurrentMa(itemId: string, warehouseId: string): Promise<number>;
}
