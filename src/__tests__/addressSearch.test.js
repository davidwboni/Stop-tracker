import { describe, it, expect } from 'vitest';
import { isPostcodeLike, computeBiasCenter } from '../services/addressSearch';

describe('isPostcodeLike', () => {
  it('recognizes a partial outward code', () => {
    expect(isPostcodeLike('bn44')).toBe(true);
  });

  it('recognizes a full postcode with no space', () => {
    expect(isPostcodeLike('bn443dd')).toBe(true);
  });

  it('recognizes a full postcode with a space', () => {
    expect(isPostcodeLike('BN44 3DD')).toBe(true);
  });

  it('recognizes a short outward-only postcode', () => {
    expect(isPostcodeLike('M1')).toBe(true);
  });

  it('recognizes a partial inward code', () => {
    expect(isPostcodeLike('bn44 3')).toBe(true);
  });

  it('rejects a house-number street address', () => {
    expect(isPostcodeLike('10 High Street')).toBe(false);
  });

  it('rejects a place name', () => {
    expect(isPostcodeLike('Buckingham Palace')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isPostcodeLike('')).toBe(false);
  });
});

describe('computeBiasCenter', () => {
  it('returns null for an empty address list', () => {
    expect(computeBiasCenter([])).toBeNull();
  });

  it('returns the address itself for a single-address list', () => {
    const result = computeBiasCenter([{ latitude: 50.9, longitude: -0.2 }]);
    expect(result).toEqual({ latitude: 50.9, longitude: -0.2 });
  });

  it('weights the most recently added address most heavily', () => {
    const addresses = [
      { latitude: 51.5, longitude: -0.1 },  // London, oldest
      { latitude: 50.9, longitude: -0.2 }   // Brighton area, most recent
    ];
    const result = computeBiasCenter(addresses);

    // Weighted average with weights [1, 2]: closer to the second point.
    expect(result.latitude).toBeCloseTo((51.5 * 1 + 50.9 * 2) / 3, 5);
    expect(result.longitude).toBeCloseTo((-0.1 * 1 + -0.2 * 2) / 3, 5);
  });
});
