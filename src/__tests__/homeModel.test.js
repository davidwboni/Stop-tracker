import { describe, it, expect } from 'vitest';
import { grossForEntry, summarizeDay, weekFor } from '../features/home/homeModel';
const config = { model: 'flat_stops', ratePerStop: 2.08, excessParcelRate: .05, contractorFeePercent: 6 };
describe('Home financial model', () => {
  it('calculates the approved example and subtracts each dated cost once', () => {
    const total = grossForEntry(config, { quantity: 120, totalParcels: 158, extra: 30 });
    expect(total).toBe(281.5);
    const summary = summarizeDay({ date: '2026-09-26', total, stops: 120, totalParcels: 158, payStructureSnapshot: config }, [
      { date: '2026-09-26', amount: 45.2, source: 'my_expense' },
      { date: '2026-09-25', amount: 10, source: 'my_expense' },
      { date: '2026-09-26', amount: 487.77, source: 'contractor_charge', periodOnly: true },
    ]);
    expect(summary).toMatchObject({ gross: 281.5, fee: 16.89, afterFee: 264.61, expenses: 45.2, takeHome: 219.41, excess: 38 });
  });
  it('does not invent historical contractor rates or reprice stored earnings', () => {
    expect(summarizeDay({ total: 271.5, stops: 120 })).toMatchObject({ gross: 271.5, feeRate: null, takeHome: null, excess: null });
  });
  it('supports explicitly configured zero contractor fees and negative take-home', () => {
    expect(summarizeDay({ date: '2026-09-26', total: 10, payStructureSnapshot: { ...config, contractorFeePercent: 0 } }, [{ date: '2026-09-26', amount: 20 }]).takeHome).toBe(-10);
  });
  it('does not substitute zero for a missing or invalid total', () => {
    expect(summarizeDay({ total: null }).unavailable).toBe(true);
    expect(summarizeDay({ total: 'invalid' }).unavailable).toBe(true);
  });
  it('handles day rates without invented stop counts', () => {
    expect(grossForEntry({ model: 'per_day', ratePerDay: 150 }, { quantity: 1, extra: 20 })).toBe(170);
  });
  it('keeps a Sunday in the preceding Monday-based week', () => {
    expect(weekFor(new Date('2026-09-27T00:14:00'))).toEqual({ start: '2026-09-21', end: '2026-09-27' });
  });
});
