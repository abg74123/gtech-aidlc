/**
 * DTO for creating a new alert log entry.
 * Used by AlertLogService.logAlert() to persist blocked ERROR events.
 */
export interface CreateAlertLogDto {
  /** Error code identifying the violated rule */
  alertCode: string;
  /** Human-readable error message (Thai) */
  alertMessage: string;
  /** TX type that triggered the alert */
  txType: string;
  /** Full snapshot of the CreateTxDto that was blocked */
  txData: Record<string, unknown>;
  /** Item involved (if applicable) */
  itemId?: string;
  /** Warehouse involved (if applicable) */
  warehouseId?: string;
  /** Period involved (if applicable) */
  period?: string;
  /** User who attempted the operation */
  userId: string;
}
