/**
 * Date utility functions for Autoflow.
 * All timestamps use ISO 8601 UTC format.
 */

/**
 * Converts a Date to an ISO 8601 UTC string.
 * @param date - The date to convert. Defaults to current time.
 * @returns ISO 8601 UTC string (e.g., "2025-01-15T10:30:00.000Z")
 */
export function toISOString(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Extracts the period (YYYY-MM) from a Date.
 * @param date - The date to extract the period from. Defaults to current time.
 * @returns Period string in YYYY-MM format (e.g., "2025-01")
 */
export function toPeriod(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Checks if a date falls within a given period (YYYY-MM).
 * @param date - The date to check.
 * @param period - The period in YYYY-MM format.
 * @returns true if the date is within the specified period.
 */
export function isWithinPeriod(date: Date, period: string): boolean {
  return toPeriod(date) === period;
}
