/**
 * Minimal AlertLog representation for dashboard recent alerts.
 */
export interface RecentAlert {
  /** Alert log identifier (UUID v4) */
  id: string;
  /** Error code (e.g., STOCK_NEGATIVE) */
  alertCode: string;
  /** Human-readable error message (Thai) */
  alertMessage: string;
  /** TX type that triggered the alert */
  txType: string;
  /** User who triggered the alert (UUID v4) */
  userId: string;
  /** When the alert was triggered (ISO 8601) */
  createdAt: string;
}

/**
 * Response for GET /api/v1/reports/dashboard.
 * Provides key operational metrics for the dashboard view.
 */
export interface DashboardResponse {
  /** Total number of alerts in the system */
  totalAlerts: number;
  /** Breakdown of alerts by code (e.g., { STOCK_NEGATIVE: 5, PERIOD_LOCKED: 2 }) */
  alertsByCode: Record<string, number>;
  /** Total inventory value across all items (THB) */
  stockValue: number;
  /** Total open AP amount (THB) */
  totalAP: number;
  /** Total open AR amount (THB) */
  totalAR: number;
  /** Latest 5 alert log entries */
  recentAlerts: RecentAlert[];
}
