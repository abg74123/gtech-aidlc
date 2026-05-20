import { applyDecorators, UseGuards } from '@nestjs/common';
import { AlertValidationGuard } from './alert-validation.guard';

/**
 * Custom decorator that applies the AlertValidationGuard to decorated endpoints.
 * Use this on TX POST endpoints to automatically validate against all 5 ERROR rules:
 *
 * - STOCK_NEGATIVE
 * - CN_RETURN_INVENTORY
 * - DUPLICATE_INVOICE
 * - INVOICE_FROM_DO_STOCK
 * - PERIOD_LOCKED
 *
 * @example
 * ```typescript
 * @Post()
 * @ValidateAlerts()
 * async createTransaction(@Body() dto: CreateTxDto) {
 *   // Only reached if all alert rules pass
 * }
 * ```
 */
export function ValidateAlerts() {
  return applyDecorators(UseGuards(AlertValidationGuard));
}
