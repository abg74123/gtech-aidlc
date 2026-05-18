import { toISOString, toPeriod, isWithinPeriod } from './date.utils';

describe('date.utils', () => {
  describe('toISOString', () => {
    it('should convert a date to ISO 8601 UTC string', () => {
      const date = new Date('2025-01-15T10:30:00.000Z');
      expect(toISOString(date)).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should default to current time when no date provided', () => {
      const before = new Date().toISOString();
      const result = toISOString();
      const after = new Date().toISOString();
      expect(result >= before).toBe(true);
      expect(result <= after).toBe(true);
    });

    it('should always produce a Z-suffixed UTC string', () => {
      const date = new Date('2025-06-30T23:59:59.999Z');
      expect(toISOString(date)).toMatch(/Z$/);
    });
  });

  describe('toPeriod', () => {
    it('should extract YYYY-MM from a date', () => {
      const date = new Date('2025-01-15T10:30:00.000Z');
      expect(toPeriod(date)).toBe('2025-01');
    });

    it('should pad single-digit months with leading zero', () => {
      const date = new Date('2025-03-01T00:00:00.000Z');
      expect(toPeriod(date)).toBe('2025-03');
    });

    it('should handle December correctly', () => {
      const date = new Date('2025-12-31T23:59:59.999Z');
      expect(toPeriod(date)).toBe('2025-12');
    });

    it('should use UTC month (not local)', () => {
      // Jan 1 00:00 UTC — should be 2025-01 regardless of local timezone
      const date = new Date('2025-01-01T00:00:00.000Z');
      expect(toPeriod(date)).toBe('2025-01');
    });
  });

  describe('isWithinPeriod', () => {
    it('should return true when date is within the period', () => {
      const date = new Date('2025-01-15T10:30:00.000Z');
      expect(isWithinPeriod(date, '2025-01')).toBe(true);
    });

    it('should return false when date is in a different month', () => {
      const date = new Date('2025-02-01T00:00:00.000Z');
      expect(isWithinPeriod(date, '2025-01')).toBe(false);
    });

    it('should return false when date is in a different year', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(isWithinPeriod(date, '2025-01')).toBe(false);
    });

    it('should handle last moment of the month', () => {
      const date = new Date('2025-01-31T23:59:59.999Z');
      expect(isWithinPeriod(date, '2025-01')).toBe(true);
    });
  });
});
