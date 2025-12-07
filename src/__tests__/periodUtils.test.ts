import { describe, it, expect } from 'vitest';
import { getPeriodFromDate, getPeriods, isDateInPeriod, getSuggestedAnchorDate } from '../features/payperiod/periodUtils';

describe('Pay Period Utils', () => {
  describe('getPeriodFromDate', () => {
    it('should calculate correct period for a date', () => {
      const anchor = '2024-01-01';
      const testDate = new Date('2024-01-15');

      const period = getPeriodFromDate(anchor, testDate);

      expect(period.index).toBe(0);
      expect(period.start.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(period.end.toISOString().split('T')[0]).toBe('2024-01-29');
    });

    it('should handle dates in future periods', () => {
      const anchor = '2024-01-01';
      const testDate = new Date('2024-02-15');

      const period = getPeriodFromDate(anchor, testDate);

      expect(period.index).toBe(1);
      expect(period.start.toISOString().split('T')[0]).toBe('2024-01-29');
    });

    it('should handle dates in past periods', () => {
      const anchor = '2024-01-01';
      const testDate = new Date('2023-12-15');

      const period = getPeriodFromDate(anchor, testDate);

      expect(period.index).toBe(-1);
    });
  });

  describe('getPeriods', () => {
    it('should return correct number of periods', () => {
      const anchor = '2024-01-01';
      const periods = getPeriods(anchor, 3);

      expect(periods.length).toBe(4); // Current + 3 back = 4 total
    });

    it('should return periods in descending order', () => {
      const anchor = '2024-01-01';
      const periods = getPeriods(anchor, 2);

      expect(periods[0].index).toBeGreaterThan(periods[1].index);
      expect(periods[1].index).toBeGreaterThan(periods[2].index);
    });
  });

  describe('isDateInPeriod', () => {
    it('should return true for date within period', () => {
      const anchor = '2024-01-01';
      const testDate = new Date('2024-01-15');
      const period = getPeriodFromDate(anchor, testDate);

      expect(isDateInPeriod(testDate, period)).toBe(true);
    });

    it('should return false for date outside period', () => {
      const anchor = '2024-01-01';
      const testDate = new Date('2024-01-15');
      const period = getPeriodFromDate(anchor, new Date('2024-02-15'));

      expect(isDateInPeriod(testDate, period)).toBe(false);
    });

    it('should handle period boundaries correctly', () => {
      const anchor = '2024-01-01';
      const period = getPeriodFromDate(anchor, new Date('2024-01-01'));

      // Start date should be included
      expect(isDateInPeriod(new Date('2024-01-01'), period)).toBe(true);

      // End date should be excluded (exclusive end)
      expect(isDateInPeriod(new Date('2024-01-29'), period)).toBe(false);
    });
  });

  describe('getSuggestedAnchorDate', () => {
    it('should return a date string', () => {
      const suggested = getSuggestedAnchorDate();

      expect(typeof suggested).toBe('string');
      expect(suggested).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return a date in the past', () => {
      const suggested = getSuggestedAnchorDate();
      const suggestedDate = new Date(suggested);
      const today = new Date();

      expect(suggestedDate.getTime()).toBeLessThan(today.getTime());
    });
  });
});
