/**
 * Period utility functions for Autoflow.
 * Period format: YYYY-MM (e.g., "2025-01")
 */

export interface ParsedPeriod {
  year: number;
  month: number;
}

/**
 * Gets the current accounting period in YYYY-MM format (UTC).
 * @returns Current period string (e.g., "2025-07")
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parses a period string (YYYY-MM) into year and month components.
 * @param period - Period string in YYYY-MM format.
 * @returns Parsed period object with year and month.
 * @throws Error if the period format is invalid.
 */
export function parsePeriod(period: string): ParsedPeriod {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid period format: "${period}". Expected YYYY-MM.`);
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in period: "${period}". Month must be 01-12.`);
  }

  return { year, month };
}

/**
 * Compares two periods chronologically.
 * @param periodA - First period in YYYY-MM format.
 * @param periodB - Second period in YYYY-MM format.
 * @returns Negative if A < B, 0 if equal, positive if A > B.
 */
export function comparePeriods(periodA: string, periodB: string): number {
  const a = parsePeriod(periodA);
  const b = parsePeriod(periodB);

  if (a.year !== b.year) {
    return a.year - b.year;
  }
  return a.month - b.month;
}
