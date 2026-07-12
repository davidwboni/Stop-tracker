import { describe, it, expect } from 'vitest';
import {
  calculateDayEarnings,
  lookupRate,
  normalizePayStructure,
  PAY_MODELS,
} from '../features/payperiod/payStructure';

describe('calculateDayEarnings', () => {
  it('tiered_stops matches the existing DPD calc (176 stops)', () => {
    const cfg = {
      model: 'tiered_stops' as const,
      thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
      excessParcelRate: 0.05,
    };
    expect(calculateDayEarnings(cfg, { quantity: 176 })).toBeCloseTo(315.48, 2);
  });

  it('flat_stops multiplies stops by the flat rate', () => {
    const cfg = { model: 'flat_stops' as const, ratePerStop: 1.75 };
    expect(calculateDayEarnings(cfg, { quantity: 90 })).toBeCloseTo(157.5, 2);
  });

  it('per_mile adds base fee to miles times rate', () => {
    const cfg = { model: 'per_mile' as const, ratePerMile: 0.45, baseFee: 30 };
    expect(calculateDayEarnings(cfg, { quantity: 84 })).toBeCloseTo(67.8, 2);
  });

  it('per_mile treats a missing base fee as zero', () => {
    const cfg = { model: 'per_mile' as const, ratePerMile: 0.5 };
    expect(calculateDayEarnings(cfg, { quantity: 100 })).toBeCloseTo(50, 2);
  });

  it('hourly multiplies hours by the hourly rate', () => {
    const cfg = { model: 'hourly' as const, ratePerHour: 14.5 };
    expect(calculateDayEarnings(cfg, { quantity: 9 })).toBeCloseTo(130.5, 2);
  });

  it('per_day returns the fixed day rate regardless of quantity', () => {
    const cfg = { model: 'per_day' as const, ratePerDay: 145 };
    expect(calculateDayEarnings(cfg, { quantity: 1 })).toBeCloseTo(145, 2);
  });

  it('sliding_scale multiplies stops by the looked-up rate (100 stops @ 100mi = £219)', () => {
    const cfg = {
      model: 'sliding_scale' as const,
      stopBands: [80, 100, 120],
      mileBands: [50, 100, 150],
      rateMatrix: [
        [2.19, 2.39, 2.76],
        [2.03, 2.19, 2.51],
        [1.93, 2.06, 2.31],
      ],
    };
    expect(calculateDayEarnings(cfg, { quantity: 100, miles: 100 })).toBeCloseTo(219, 2);
  });

  it('returns 0 for a non-positive primary quantity', () => {
    const cfg = { model: 'flat_stops' as const, ratePerStop: 1.75 };
    expect(calculateDayEarnings(cfg, { quantity: 0 })).toBe(0);
  });
});

describe('lookupRate', () => {
  const cfg = {
    model: 'sliding_scale' as const,
    stopBands: [80, 100, 120],
    mileBands: [50, 100, 150],
    rateMatrix: [
      [2.19, 2.39, 2.76],
      [2.03, 2.19, 2.51],
      [1.93, 2.06, 2.31],
    ],
  };

  it('snaps to the nearest stop and mile band', () => {
    expect(lookupRate(cfg, 105, 90)).toBeCloseTo(2.19, 2);
    expect(lookupRate(cfg, 118, 140)).toBeCloseTo(2.31, 2);
  });
});

describe('PAY_MODELS', () => {
  it('lists all six models with a primary field each', () => {
    expect(PAY_MODELS).toHaveLength(6);
    for (const m of PAY_MODELS) {
      expect(typeof m.label).toBe('string');
      expect(m.primary.field).toBeTruthy();
    }
  });

  it('marks sliding_scale as needing a secondary miles input', () => {
    const s = PAY_MODELS.find((m) => m.id === 'sliding_scale');
    expect(s?.secondary?.field).toBe('miles');
  });
});

describe('normalizePayStructure', () => {
  it('defaults a null config to the DPD tiered structure', () => {
    const c = normalizePayStructure(null);
    expect(c.model).toBe('tiered_stops');
    expect(c.thresholds?.[0]).toEqual({ stopCount: 110, rate: 1.98 });
    expect(c.excessParcelRate).toBe(0.05);
  });

  it('tags a modern thresholds config (no model key) as tiered_stops', () => {
    const c = normalizePayStructure({
      thresholds: [{ stopCount: 150, rate: 1.7 }, { rate: 0.9 }],
      excessParcelRate: 0.05,
    });
    expect(c.model).toBe('tiered_stops');
    expect(c.thresholds?.[0].stopCount).toBe(150);
  });

  it('upgrades the legacy flat shape to tiered_stops', () => {
    const c = normalizePayStructure({ cutoffPoint: 120, rateBeforeCutoff: 2, rateAfterCutoff: 1.5 });
    expect(c.model).toBe('tiered_stops');
    expect(c.thresholds).toEqual([{ stopCount: 120, rate: 2 }, { rate: 1.5 }]);
  });

  it('passes a config that already has a model through unchanged', () => {
    const input = { model: 'per_mile' as const, ratePerMile: 0.45, baseFee: 30 };
    expect(normalizePayStructure(input)).toEqual(input);
  });
});
