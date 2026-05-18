import { getCurrentPeriod, parsePeriod, comparePeriods } from './period.utils';

describe('period.utils', () => {
  describe('getCurrentPeriod', () => {
    it('should return current period in YYYY-MM format', () => {
      const result = getCurrentPeriod();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should match the current UTC year and month', () => {
      const now = new Date();
      const expectedYear = now.getUTCFullYear();
      const expectedMonth = String(now.getUTCMonth() + 1).padStart(2, '0');
      expect(getCurrentPeriod()).toBe(`${expectedYear}-${expectedMonth}`);
    });
  });

  describe('parsePeriod', () => {
    it('should parse a valid period string', () => {
      const result = parsePeriod('2025-01');
      expect(result).toEqual({ year: 2025, month: 1 });
    });

    it('should parse December correctly', () => {
      const result = parsePeriod('2025-12');
      expect(result).toEqual({ year: 2025, month: 12 });
    });

    it('should throw on invalid format (no dash)', () => {
      expect(() => parsePeriod('202501')).toThrow('Invalid period format');
    });

    it('should throw on invalid format (extra characters)', () => {
      expect(() => parsePeriod('2025-01-15')).toThrow('Invalid period format');
    });

    it('should throw on invalid month (00)', () => {
      expect(() => parsePeriod('2025-00')).toThrow('Invalid month');
    });

    it('should throw on invalid month (13)', () => {
      expect(() => parsePeriod('2025-13')).toThrow('Invalid month');
    });

    it('should throw on empty string', () => {
      expect(() => parsePeriod('')).toThrow('Invalid period format');
    });
  });

  describe('comparePeriods', () => {
    it('should return 0 for equal periods', () => {
      expect(comparePeriods('2025-01', '2025-01')).toBe(0);
    });

    it('should return negative when first period is earlier (same year)', () => {
      expect(comparePeriods('2025-01', '2025-06')).toBeLessThan(0);
    });

    it('should return positive when first period is later (same year)', () => {
      expect(comparePeriods('2025-06', '2025-01')).toBeGreaterThan(0);
    });

    it('should return negative when first period is in earlier year', () => {
      expect(comparePeriods('2024-12', '2025-01')).toBeLessThan(0);
    });

    it('should return positive when first period is in later year', () => {
      expect(comparePeriods('2026-01', '2025-12')).toBeGreaterThan(0);
    });

    it('should handle year boundary correctly', () => {
      expect(comparePeriods('2024-12', '2025-01')).toBeLessThan(0);
      expect(comparePeriods('2025-01', '2024-12')).toBeGreaterThan(0);
    });
  });
});
