/**
 * Period status — determines whether transactions can be posted.
 */
export enum PeriodStatus {
  /** Open — transactions can be posted */
  OPEN = 'OPEN',
  /** Closed — no new transactions allowed */
  CLOSED = 'CLOSED',
}

/**
 * Period information.
 */
export interface PeriodInfo {
  /** Period identifier in YYYY-MM format */
  period: string;
  /** Current status of the period */
  status: PeriodStatus;
  /** When the period was closed (null if still open) */
  closedAt: string | null;
  /** Who closed the period (null if still open) */
  closedBy: string | null;
}

/**
 * Service interface for accounting period management.
 * Period Lock must be checked before every POST operation — no exceptions.
 */
export interface IPeriodService {
  /**
   * Check if a period is open for posting.
   * Must be called before POST for every TX.
   *
   * @throws PeriodLockedException if period is closed
   */
  validatePeriodOpen(period: string): Promise<boolean>;

  /**
   * Get current active period (YYYY-MM format).
   */
  getCurrentPeriod(): string;

  /**
   * Close a period — prevents any future postings.
   * Requires CFO role.
   */
  closePeriod(period: string, closedBy: string): Promise<PeriodInfo>;

  /**
   * Get period information.
   */
  getPeriodInfo(period: string): Promise<PeriodInfo | null>;
}
