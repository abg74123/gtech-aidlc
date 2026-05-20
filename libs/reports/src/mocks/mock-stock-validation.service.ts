import { Injectable } from '@nestjs/common';
import { IStockValidationService, StockValidationResult } from '@autoflow/shared-types';
import { MOCK_STOCK_BALANCES } from './mock-data';

/**
 * Mock implementation of IStockValidationService for the Reports module.
 * Validates stock availability using mock stock balance data.
 * Will be replaced with real service when Warehouse unit is integrated.
 */
@Injectable()
export class MockStockValidationService implements IStockValidationService {
  async validateStockAvailability(
    itemId: string,
    warehouseId: string,
    requiredQty: number,
  ): Promise<StockValidationResult> {
    const balance = MOCK_STOCK_BALANCES.find(
      (b) => b.itemId === itemId && b.warehouseId === warehouseId,
    );

    const availableQty = balance?.currentQty ?? 0;
    const valid = availableQty >= requiredQty;

    return {
      valid,
      availableQty,
      requestedQty: requiredQty,
      errorMessage: valid
        ? undefined
        : `สต็อกไม่เพียงพอ: มี ${availableQty} ต้องการ ${requiredQty}`,
    };
  }

  async getStockBalance(itemId: string, warehouseId: string): Promise<number> {
    const balance = MOCK_STOCK_BALANCES.find(
      (b) => b.itemId === itemId && b.warehouseId === warehouseId,
    );
    return balance?.currentQty ?? 0;
  }

  async isStockFrozen(_warehouseId: string): Promise<boolean> {
    // Mock: stock is never frozen
    return false;
  }
}
