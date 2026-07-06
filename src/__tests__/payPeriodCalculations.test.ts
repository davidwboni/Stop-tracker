import { describe, it, expect } from 'vitest';
import { calculateStopFee } from '../features/payperiod/payPeriodCalculations';

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
