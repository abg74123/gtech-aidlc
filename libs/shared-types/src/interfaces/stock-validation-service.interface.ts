/**
 * Stock validation result.
 */
export interface StockValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Current available stock quantity */
  availableQty: number;
  /** Requested quantity */
  requestedQty: number;
  /** Error message if validation failed */
  errorMessage?: string;
}

/**
 * Service interface for stock validation.
 * Ensures stock never goes negative — system throws error before POST.
 */
export interface IStockValidationService {
  /**
   * Validate that sufficient stock exists for a stock-out operation.
   * Must be called before POST for any TX that reduces stock.
   *
   * @throws StockNegativeException if stock would go negative
   */
  validateStockAvailability(
    itemId: string,
    warehouseId: string,
    requiredQty: number,
  ): Promise<StockValidationResult>;

  /**
   * Get current stock balance for an item in a warehouse.
   */
  getStockBalance(itemId: string, warehouseId: string): Promise<number>;

  /**
   * Check if stock is frozen (during stock count).
   * Frozen stock cannot be issued or received.
   */
  isStockFrozen(warehouseId: string): Promise<boolean>;
}
