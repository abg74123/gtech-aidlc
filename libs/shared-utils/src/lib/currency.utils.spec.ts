import { roundToDecimal, formatTHB } from './currency.utils';

describe('currency.utils', () => {
  describe('roundToDecimal', () => {
    it('should round to 2 decimal places by default', () => {
      expect(roundToDecimal(1.005)).toBe(1.01);
      expect(roundToDecimal(1.004)).toBe(1.0);
      expect(roundToDecimal(1.555)).toBe(1.56);
    });

    it('should handle whole numbers', () => {
      expect(roundToDecimal(100)).toBe(100);
      expect(roundToDecimal(0)).toBe(0);
    });

    it('should round to specified decimal places', () => {
      expect(roundToDecimal(1.23456, 3)).toBe(1.235);
      expect(roundToDecimal(1.23456, 4)).toBe(1.2346);
      expect(roundToDecimal(1.23456, 0)).toBe(1);
    });

    it('should handle negative numbers', () => {
      expect(roundToDecimal(-1.555)).toBe(-1.55);
      expect(roundToDecimal(-0.001)).toBe(0);
    });

    it('should handle very small numbers', () => {
      expect(roundToDecimal(0.001)).toBe(0);
      expect(roundToDecimal(0.009)).toBe(0.01);
    });
  });

  describe('formatTHB', () => {
    it('should format with THB symbol and 2 decimal places', () => {
      expect(formatTHB(1234.56)).toBe('฿1,234.56');
    });

    it('should format zero', () => {
      expect(formatTHB(0)).toBe('฿0.00');
    });

    it('should format whole numbers with .00', () => {
      expect(formatTHB(1000)).toBe('฿1,000.00');
    });

    it('should round to 2 decimal places before formatting', () => {
      expect(formatTHB(99.999)).toBe('฿100.00');
    });

    it('should handle large numbers with thousand separators', () => {
      expect(formatTHB(1234567.89)).toBe('฿1,234,567.89');
    });

    it('should handle negative values', () => {
      expect(formatTHB(-500.5)).toBe('฿-500.50');
    });
  });
});
