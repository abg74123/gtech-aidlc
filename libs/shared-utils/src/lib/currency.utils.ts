/**
 * Currency utility functions for Autoflow.
 * Currency: THB, Decimal(10,2)
 */

/**
 * Rounds a number to the specified number of decimal places.
 * Uses banker's rounding (round half to even) for financial accuracy.
 * @param value - The number to round.
 * @param decimals - Number of decimal places. Defaults to 2.
 * @returns The rounded number.
 */
export function roundToDecimal(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  const result = Math.round((value + Number.EPSILON) * factor) / factor;
  // Normalize -0 to 0 for consistent financial display
  return result === 0 ? 0 : result;
}

/**
 * Formats a number as Thai Baht currency string.
 * @param value - The numeric value to format.
 * @returns Formatted string with THB symbol and 2 decimal places (e.g., "฿1,234.56")
 */
export function formatTHB(value: number): string {
  const rounded = roundToDecimal(value, 2);
  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `฿${formatted}`;
}
