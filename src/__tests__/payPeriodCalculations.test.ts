import { describe, it, expect } from 'vitest';
import { calculateStopFee, calculateExcessParcelFee, calculateDayTotal } from '../features/payperiod/payPeriodCalculations';

describe('calculateStopFee', () => {
  const thresholds = [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }];

  it('charges the base rate only when under the cutoff', () => {
    expect(calculateStopFee(97, thresholds)).toBeCloseTo(192.06, 2);
  });

  it('charges base + overflow rate when over the cutoff (real DPD data, 20th June)', () => {
    expect(calculateStopFee(112, thresholds)).toBeCloseTo(220.76, 2);
  });

  it('matches real DPD data for 19th June (176 stops)', () => {
    expect(calculateStopFee(176, thresholds)).toBeCloseTo(315.48, 2);
  });

  it('matches real DPD data for 18th June (147 stops)', () => {
    expect(calculateStopFee(147, thresholds)).toBeCloseTo(272.56, 2);
  });

  it('matches real DPD data for 17th June (157 stops)', () => {
    expect(calculateStopFee(157, thresholds)).toBeCloseTo(287.36, 2);
  });

  it('supports more than two tiers', () => {
    const threeTiers = [
      { stopCount: 110, rate: 1.98 },
      { stopCount: 150, rate: 1.70 },
      { rate: 1.48 },
    ];
    // 110*1.98 + 40*1.70 + 26*1.48 = 217.8 + 68 + 38.48 = 324.28
    expect(calculateStopFee(176, threeTiers)).toBeCloseTo(324.28, 2);
  });
});

describe('calculateExcessParcelFee', () => {
  it('matches real DPD data for 20th June (112 stops, 132 parcels)', () => {
    expect(calculateExcessParcelFee(112, 132, 0.05)).toBeCloseTo(1.00, 2);
  });

  it('matches real DPD data for 19th June (176 stops, 214 parcels)', () => {
    expect(calculateExcessParcelFee(176, 214, 0.05)).toBeCloseTo(1.90, 2);
  });

  it('matches real DPD data for 18th June (147 stops, 196 parcels)', () => {
    expect(calculateExcessParcelFee(147, 196, 0.05)).toBeCloseTo(2.45, 2);
  });

  it('matches real DPD data for 17th June (157 stops, 260 parcels)', () => {
    expect(calculateExcessParcelFee(157, 260, 0.05)).toBeCloseTo(5.15, 2);
  });

  it('never goes negative when total parcels is somehow less than stops', () => {
    expect(calculateExcessParcelFee(100, 90, 0.05)).toBe(0);
  });
});

describe('calculateDayTotal', () => {
  const config = {
    thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
    excessParcelRate: 0.05,
  };

  it('matches the real DPD "Total" column for 19th June exactly', () => {
    const day = calculateDayTotal({ date: '2026-06-19', stops: 176, totalParcels: 214 }, config);
    expect(day.stopFee).toBeCloseTo(315.48, 2);
    expect(day.parcelFee).toBeCloseTo(1.90, 2);
    expect(day.dayTotal).toBeCloseTo(317.38, 2);
    expect(day.excessParcels).toBe(38);
  });

  it('matches the real DPD "Total" column for 20th June exactly', () => {
    const day = calculateDayTotal({ date: '2026-06-20', stops: 112, totalParcels: 132 }, config);
    expect(day.dayTotal).toBeCloseTo(221.76, 2);
  });
});

import { calculatePeriodTotals } from '../features/payperiod/payPeriodCalculations';

describe('calculatePeriodTotals', () => {
  const config = {
    thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
    excessParcelRate: 0.05,
  };

  it('sums daily totals into gross payment, then applies charge/fee/VAT', () => {
    const dailyEntries = [
      { date: '2026-06-19', stops: 176, totalParcels: 214 }, // dayTotal 317.38
      { date: '2026-06-20', stops: 112, totalParcels: 132 }, // dayTotal 221.76
    ];
    // grossPayment = 317.38 + 221.76 = 539.14
    // total = 539.14 - 39.14 (dpdCharge) - 0 (adminFee) = 500.00
    // vat = 500.00 * 0.20 = 100.00
    // totalWithVat = 600.00
    const result = calculatePeriodTotals(dailyEntries, 39.14, 0, 0.20, config);

    expect(result.grossPayment).toBeCloseTo(539.14, 2);
    expect(result.total).toBeCloseTo(500.00, 2);
    expect(result.vat).toBeCloseTo(100.00, 2);
    expect(result.totalWithVat).toBeCloseTo(600.00, 2);
    expect(result.days).toHaveLength(2);
  });

  it('subtracts admin fee as well as DPD charge', () => {
    const dailyEntries = [{ date: '2026-06-19', stops: 176, totalParcels: 214 }];
    // grossPayment = 317.38; total = 317.38 - 10 - 7.38 = 300.00; vat = 60.00; totalWithVat = 360.00
    const result = calculatePeriodTotals(dailyEntries, 10, 7.38, 0.20, config);

    expect(result.total).toBeCloseTo(300.00, 2);
    expect(result.totalWithVat).toBeCloseTo(360.00, 2);
  });
});

import { comparePeriodToLogs } from '../features/payperiod/payPeriodCalculations';

describe('comparePeriodToLogs', () => {
  const dailyEntries = [
    { date: '2026-06-19', stops: 176, totalParcels: 214 },
    { date: '2026-06-20', stops: 112, totalParcels: 132 },
  ];

  it('flags a match when logged stops equal statement stops', () => {
    const logs = [{ date: '2026-06-19', stops: 176 }];
    const result = comparePeriodToLogs(dailyEntries, logs);
    const day19 = result.find((d) => d.date === '2026-06-19');
    expect(day19?.status).toBe('match');
    expect(day19?.difference).toBe(0);
  });

  it('flags a mismatch and computes the difference', () => {
    const logs = [
      { date: '2026-06-19', stops: 176 },
      { date: '2026-06-20', stops: 100 },
    ];
    const result = comparePeriodToLogs(dailyEntries, logs);
    const day20 = result.find((d) => d.date === '2026-06-20');
    expect(day20?.status).toBe('mismatch');
    expect(day20?.difference).toBe(-12); // logged 100, statement says 112
  });

  it('flags a date missing from the log', () => {
    const logs = [{ date: '2026-06-19', stops: 176 }];
    const result = comparePeriodToLogs(dailyEntries, logs);
    const day20 = result.find((d) => d.date === '2026-06-20');
    expect(day20?.status).toBe('missing-from-log');
    expect(day20?.loggedStops).toBeNull();
  });

  it('flags a date missing from the statement', () => {
    const logs = [
      { date: '2026-06-19', stops: 176 },
      { date: '2026-06-20', stops: 112 },
      { date: '2026-06-21', stops: 50 },
    ];
    const result = comparePeriodToLogs(dailyEntries, logs);
    const day21 = result.find((d) => d.date === '2026-06-21');
    expect(day21?.status).toBe('missing-from-statement');
    expect(day21?.statementStops).toBeNull();
  });

  it('returns results sorted by date', () => {
    const logs = [{ date: '2026-06-19', stops: 176 }];
    const result = comparePeriodToLogs(dailyEntries, logs);
    expect(result.map((d) => d.date)).toEqual(['2026-06-19', '2026-06-20']);
  });
});
