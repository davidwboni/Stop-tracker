import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isPostcodeLike,
  computeBiasCenter,
  searchPostcodes,
  resolvePostcode
} from '../services/addressSearch';

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

describe('searchPostcodes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the matching postcodes from postcodes.io', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 200, result: ['BN44 3DD', 'BN44 3TH'] })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await searchPostcodes('bn44', new AbortController().signal);

    expect(result).toEqual(['BN44 3DD', 'BN44 3TH']);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.postcodes.io/postcodes/bn44/autocomplete?limit=10',
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('returns an empty array when postcodes.io finds no matches', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 200, result: null })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await searchPostcodes('zz99', new AbortController().signal);

    expect(result).toEqual([]);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(
      searchPostcodes('bn44', new AbortController().signal)
    ).rejects.toThrow('Postcode search failed');
  });
});

describe('resolvePostcode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the coordinates for a full postcode', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 200,
        result: { postcode: 'BN44 3DD', latitude: 50.9123, longitude: -0.2456 }
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await resolvePostcode('BN44 3DD', new AbortController().signal);

    expect(result).toEqual({ postcode: 'BN44 3DD', latitude: 50.9123, longitude: -0.2456 });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.postcodes.io/postcodes/BN44%203DD',
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(
      resolvePostcode('ZZ99 9ZZ', new AbortController().signal)
    ).rejects.toThrow('Postcode lookup failed');
  });
});
