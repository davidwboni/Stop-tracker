import { describe, it, expect } from 'vitest';
import { computeScore, recordUse, getFrequentAddresses } from '../services/addressMemory';

describe('computeScore', () => {
  it('gives full weight to an address used today', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    const entry = { useCount: 3, lastUsedAt: '2026-07-09T12:00:00.000Z' };
    expect(computeScore(entry, now)).toBeCloseTo(3, 5);
  });

  it('halves the score after exactly one half-life (30 days)', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    const entry = { useCount: 4, lastUsedAt: '2026-06-09T12:00:00.000Z' };
    expect(computeScore(entry, now)).toBeCloseTo(2, 5);
  });

  it('decays further for an address unused for a long time', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    const entry = { useCount: 10, lastUsedAt: '2026-01-09T12:00:00.000Z' };
    // 181 days (Jan 9 to Jul 9)
    expect(computeScore(entry, now)).toBeCloseTo(10 * Math.pow(0.5, 181 / 30), 5);
  });
});

describe('recordUse', () => {
  const now = new Date('2026-07-09T12:00:00.000Z');

  it('adds a new entry for a first-time address', () => {
    const result = recordUse(
      [],
      { address: '10 High St', postcode: 'BN1 1AA', latitude: 50.8, longitude: -0.1 },
      now
    );

    expect(result).toEqual([{
      address: '10 High St',
      postcode: 'BN1 1AA',
      latitude: 50.8,
      longitude: -0.1,
      useCount: 1,
      lastUsedAt: now.toISOString()
    }]);
  });

  it('increments useCount and updates lastUsedAt for a repeated address', () => {
    const existing = [{
      address: '10 High St', postcode: 'BN1 1AA', latitude: 50.8, longitude: -0.1,
      useCount: 2, lastUsedAt: '2026-06-01T00:00:00.000Z'
    }];

    const result = recordUse(
      existing,
      { address: '10 High St', postcode: 'BN1 1AA', latitude: 50.8, longitude: -0.1 },
      now
    );

    expect(result).toEqual([{
      address: '10 High St', postcode: 'BN1 1AA', latitude: 50.8, longitude: -0.1,
      useCount: 3, lastUsedAt: now.toISOString()
    }]);
  });

  it('does not mutate the original list', () => {
    const existing = [];
    recordUse(existing, { address: 'X', postcode: 'Y', latitude: 1, longitude: 2 }, now);
    expect(existing).toEqual([]);
  });

  it('evicts the lowest-scored entries when the list would exceed 100 entries', () => {
    const oldEntries = Array.from({ length: 100 }, (_, i) => ({
      address: `Address ${i}`,
      postcode: 'X',
      latitude: 1,
      longitude: 1,
      useCount: 1,
      lastUsedAt: '2020-01-01T00:00:00.000Z' // very old => very low score
    }));

    const result = recordUse(
      oldEntries,
      { address: 'New Address', postcode: 'Y', latitude: 2, longitude: 2 },
      now
    );

    expect(result).toHaveLength(100);
    expect(result.some(entry => entry.address === 'New Address')).toBe(true);
  });
});

describe('getFrequentAddresses', () => {
  const now = new Date('2026-07-09T12:00:00.000Z');

  it('returns an empty array for an empty memory list', () => {
    expect(getFrequentAddresses([], now, 5)).toEqual([]);
  });

  it('ranks a more recently/frequently used address above a stale one', () => {
    const memoryList = [
      { address: 'Stale Place', postcode: 'A', latitude: 1, longitude: 1, useCount: 10, lastUsedAt: '2020-01-01T00:00:00.000Z' },
      { address: 'Fresh Place', postcode: 'B', latitude: 2, longitude: 2, useCount: 2, lastUsedAt: '2026-07-08T00:00:00.000Z' }
    ];

    const result = getFrequentAddresses(memoryList, now, 5);

    expect(result[0].address).toBe('Fresh Place');
  });

  it('caps results at the given limit', () => {
    const memoryList = Array.from({ length: 10 }, (_, i) => ({
      address: `Address ${i}`, postcode: 'X', latitude: 1, longitude: 1,
      useCount: 1, lastUsedAt: now.toISOString()
    }));

    expect(getFrequentAddresses(memoryList, now, 3)).toHaveLength(3);
  });

  it('marks every returned suggestion with isFrequentSuggestion', () => {
    const memoryList = [
      { address: 'A', postcode: 'B', latitude: 1, longitude: 1, useCount: 1, lastUsedAt: now.toISOString() }
    ];
    const result = getFrequentAddresses(memoryList, now, 5);
    expect(result[0].isFrequentSuggestion).toBe(true);
  });
});
