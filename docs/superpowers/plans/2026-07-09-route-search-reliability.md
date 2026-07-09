# Route Planner Address-Search Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a real reliability bug in `RoutePlanner.jsx`'s address search (stale, out-of-order responses silently overwriting fresh ones) and add postcode-aware, purpose-built search so partial UK postcodes are recognized and house-name searches are biased toward the driver's current stop cluster.

**Architecture:** Extract the address-search logic out of `RoutePlanner.jsx` into a new plain module, `src/services/addressSearch.js` — pure/testable functions for postcode classification, bias-center calculation, and the two external API calls (postcodes.io for postcodes, the existing Nominatim call for names, now bias- and cancellation-aware). `RoutePlanner.jsx` is then rewired to classify each query, route it to the right function, and manage an `AbortController` so stale requests can never win a race against fresher ones.

**Tech Stack:** React 18, Vitest (`globals: true`, `environment: 'jsdom'`), native `fetch`/`AbortController`, OpenStreetMap Nominatim (existing), postcodes.io (new, free, no API key).

## Global Constraints

- No changes to route optimization (`optimizeRoute`), geolocation (`getCurrentLocation`), saved routes (`saveRoute`/`loadRoute`/`deleteSavedRoute`), sharing (`shareRoute`/`copyRouteToClipboard`), the "Start Navigation" buttons, `RouteMap.jsx`, or the "Clear" button — all stay exactly as they are.
- Selecting a postcode suggestion adds that postcode's center point (from postcodes.io) as the stop directly — no secondary Nominatim lookup, no house-level precision attempted.
- `computeBiasCenter` weights the most recently added address (the last element of the `addresses` array) most heavily; an empty address list means no bias (national search, matching current behavior).
- Nominatim's `viewbox` parameter biases ranking without excluding results outside it (`bounded` is left unset/`0` — a soft bias, never a hard filter).
- Every fetch call must accept and pass through an `AbortSignal`; `AbortError` in a catch block is a silent no-op, never shown to the user via `showError`.
- New module lives at `src/services/addressSearch.js` (plain `.js`, matching the existing convention of `src/services/firebase.js`/`syncUtils.js`). New tests live at `src/__tests__/addressSearch.test.js` (matches the existing `vitest.config.js` include glob and `describe`/`it`/`expect` style used in `periodUtils.test.ts`).

---

## File Structure

**Create:**
- `src/services/addressSearch.js` — `isPostcodeLike`, `computeBiasCenter`, `searchPostcodes`, `resolvePostcode`, `searchAddresses`
- `src/__tests__/addressSearch.test.js` — unit tests for all five functions

**Modify:**
- `src/components/RoutePlanner.jsx` — `searchAddress` rewritten to classify + delegate + manage `AbortController`; address-suggestion JSX updated to distinguish postcode suggestions from name suggestions; `addAddress`-adjacent handling for picking a postcode suggestion.

---

### Task 1: Postcode classification and bias-center calculation

**Files:**
- Create: `src/services/addressSearch.js` (this task only adds `isPostcodeLike` and `computeBiasCenter`; later tasks add to the same file)
- Test: `src/__tests__/addressSearch.test.js` (this task only adds tests for these two functions)

**Interfaces:**
- Produces: `isPostcodeLike(query: string): boolean`, `computeBiasCenter(addresses: Array<{latitude: number, longitude: number}>): {latitude: number, longitude: number} | null` — later tasks (2, 3, 4) import both from `../services/addressSearch`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/addressSearch.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/addressSearch.test.js`
Expected: FAIL — `Cannot find module '../services/addressSearch'` (the module doesn't exist yet).

- [ ] **Step 3: Implement the two functions**

Create `src/services/addressSearch.js`:

```js
// UK postcode, full or partial, with or without a space:
// outward code (1-2 letters, 1 digit, optional letter/digit) optionally
// followed by inward code (1 digit + up to 2 letters).
const POSTCODE_LIKE_REGEX = /^[A-Za-z]{1,2}\d[A-Za-z\d]?(\s?\d[A-Za-z]{0,2})?$/;

export function isPostcodeLike(query) {
  if (!query) return false;
  return POSTCODE_LIKE_REGEX.test(query.trim());
}

export function computeBiasCenter(addresses) {
  if (!addresses || addresses.length === 0) return null;

  let weightedLatSum = 0;
  let weightedLonSum = 0;
  let weightSum = 0;

  addresses.forEach((addr, index) => {
    const weight = index + 1; // later (more recent) addresses weigh more
    weightedLatSum += addr.latitude * weight;
    weightedLonSum += addr.longitude * weight;
    weightSum += weight;
  });

  return {
    latitude: weightedLatSum / weightSum,
    longitude: weightedLonSum / weightSum
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/addressSearch.test.js`
Expected: PASS — 11/11 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/services/addressSearch.js src/__tests__/addressSearch.test.js
git commit -m "feat: add postcode classification and bias-center helpers for route search"
```

---

### Task 2: Postcode lookup via postcodes.io

**Files:**
- Modify: `src/services/addressSearch.js` (add `searchPostcodes`, `resolvePostcode`)
- Modify: `src/__tests__/addressSearch.test.js` (add tests for both, with mocked `fetch`)

**Interfaces:**
- Consumes: nothing from Task 1 directly (independent functions in the same file).
- Produces: `searchPostcodes(query: string, signal: AbortSignal): Promise<string[]>`, `resolvePostcode(postcode: string, signal: AbortSignal): Promise<{postcode: string, latitude: number, longitude: number}>` — Task 4 imports both from `../services/addressSearch`.

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/addressSearch.test.js` (new imports and new `describe` blocks — append, don't replace the existing content):

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isPostcodeLike,
  computeBiasCenter,
  searchPostcodes,
  resolvePostcode
} from '../services/addressSearch';

// ... (keep the existing isPostcodeLike/computeBiasCenter describe blocks above, just extend the import line to include the two new names)

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/addressSearch.test.js`
Expected: FAIL — `searchPostcodes`/`resolvePostcode` are not exported yet.

- [ ] **Step 3: Implement both functions**

Add to `src/services/addressSearch.js` (after the Task 1 functions):

```js
export async function searchPostcodes(query, signal) {
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(query)}/autocomplete?limit=10`,
    { signal }
  );

  if (!response.ok) {
    throw new Error('Postcode search failed');
  }

  const data = await response.json();
  return data.result || [];
}

export async function resolvePostcode(postcode, signal) {
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error('Postcode lookup failed');
  }

  const data = await response.json();

  return {
    postcode: data.result.postcode,
    latitude: data.result.latitude,
    longitude: data.result.longitude
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/addressSearch.test.js`
Expected: PASS — 16/16 tests passing (11 from Task 1 + 5 new).

- [ ] **Step 5: Sanity-check the real API's response shape**

The tests above mock `fetch`, which proves the code handles the *assumed* postcodes.io response shape correctly, but not that the assumption matches reality. Run this once against the live API to confirm:

```bash
node -e "fetch('https://api.postcodes.io/postcodes/bn44/autocomplete?limit=10').then(r => r.json()).then(d => console.log(JSON.stringify(d)))"
```

Expected: a JSON object with a `status` field and a `result` field that is either an array of postcode strings or `null`. If the real shape differs from what Step 3's implementation assumes, fix the implementation now (and update the mocked tests to match) before moving on — do not proceed with an unverified assumption about a real external API.

- [ ] **Step 6: Commit**

```bash
git add src/services/addressSearch.js src/__tests__/addressSearch.test.js
git commit -m "feat: add postcodes.io lookup functions for postcode-aware route search"
```

---

### Task 3: Bias- and cancellation-aware Nominatim search

**Files:**
- Modify: `src/services/addressSearch.js` (add `searchAddresses`, extracted and adapted from `RoutePlanner.jsx`'s current `searchAddress` function)
- Modify: `src/__tests__/addressSearch.test.js` (add tests, with mocked `fetch`)

**Interfaces:**
- Consumes: nothing from Tasks 1-2 directly (independent function in the same file; `RoutePlanner.jsx` in Task 4 is what wires `computeBiasCenter`'s output into this function's `biasCenter` parameter).
- Produces: `searchAddresses(query: string, biasCenter: {latitude: number, longitude: number} | null, signal: AbortSignal): Promise<Array<{address: string, postcode: string, latitude: number, longitude: number, type: string}>>` — Task 4 imports this from `../services/addressSearch`.

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/addressSearch.test.js` (extend the import line to include `searchAddresses`, add this new `describe` block):

```js
describe('searchAddresses', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns [] for queries shorter than 3 characters without calling fetch', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await searchAddresses('ab', null, new AbortController().signal);

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('maps Nominatim results to the expected shape, unbiased when biasCenter is null', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          display_name: '10 High Street, Brighton, BN1 1AA, UK',
          address: { postcode: 'BN1 1AA' },
          lat: '50.8225',
          lon: '-0.1372',
          type: 'house'
        }
      ])
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await searchAddresses('High Street', null, new AbortController().signal);

    expect(result).toEqual([{
      address: '10 High Street, Brighton, BN1 1AA, UK',
      postcode: 'BN1 1AA',
      latitude: 50.8225,
      longitude: -0.1372,
      type: 'house'
    }]);

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).not.toContain('viewbox');
  });

  it('adds a soft-bias viewbox (not bounded) when a biasCenter is given', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', mockFetch);

    await searchAddresses(
      'High Street',
      { latitude: 50.9, longitude: -0.2 },
      new AbortController().signal
    );

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('viewbox=');
    expect(calledUrl).not.toContain('bounded=1');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(
      searchAddresses('High Street', null, new AbortController().signal)
    ).rejects.toThrow('Address search failed');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/addressSearch.test.js`
Expected: FAIL — `searchAddresses` is not exported yet.

- [ ] **Step 3: Implement `searchAddresses`**

Add to `src/services/addressSearch.js`:

```js
const BIAS_RADIUS_DEGREES = 0.15; // roughly a 15-20km soft-bias radius

function buildViewbox(center) {
  const minLon = center.longitude - BIAS_RADIUS_DEGREES;
  const minLat = center.latitude - BIAS_RADIUS_DEGREES;
  const maxLon = center.longitude + BIAS_RADIUS_DEGREES;
  const maxLat = center.latitude + BIAS_RADIUS_DEGREES;
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

export async function searchAddresses(query, biasCenter, signal) {
  if (query.length < 3) {
    return [];
  }

  let url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}&` +
    `countrycodes=gb&` +
    `format=json&` +
    `addressdetails=1&` +
    `limit=5`;

  if (biasCenter) {
    url += `&viewbox=${buildViewbox(biasCenter)}`;
  }

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal
  });

  if (!response.ok) {
    throw new Error('Address search failed');
  }

  const data = await response.json();

  return data.map(place => ({
    address: place.display_name,
    postcode: place.address?.postcode || 'N/A',
    latitude: parseFloat(place.lat),
    longitude: parseFloat(place.lon),
    type: place.type
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/addressSearch.test.js`
Expected: PASS — 20/20 tests passing (16 from Tasks 1-2 + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/services/addressSearch.js src/__tests__/addressSearch.test.js
git commit -m "feat: add bias- and cancellation-aware Nominatim address search"
```

---

### Task 4: Wire postcode-aware, cancellation-safe search into RoutePlanner.jsx

**Files:**
- Modify: `src/components/RoutePlanner.jsx:1-2` (imports), `:28-116` (state + `searchAddress` + the debounce effect), `:566-590` (address-suggestions dropdown JSX)

**Interfaces:**
- Consumes: `isPostcodeLike`, `computeBiasCenter`, `searchPostcodes`, `resolvePostcode`, `searchAddresses` from `../services/addressSearch` (all four prior tasks).
- Produces: no new exports — this is the integration task. `RoutePlanner`'s own props/exports are unchanged (it takes none).

- [ ] **Step 1: Read the current file to confirm content**

Read `src/components/RoutePlanner.jsx` in full — match the snippets below by surrounding code content, since exact line numbers may have drifted from what's cited above.

- [ ] **Step 2: Add the new imports**

Add after the existing `lucide-react` import block (after line 26, before `const RoutePlanner = () => {`):

```js
import {
  isPostcodeLike,
  computeBiasCenter,
  searchPostcodes,
  resolvePostcode,
  searchAddresses
} from "../services/addressSearch";
```

- [ ] **Step 3: Add a ref to track the in-flight request's AbortController**

Add alongside the existing `useState` declarations near the top of the component body (after the `savedRoutes` state, before the `useEffect` that loads saved routes):

```js
  const activeSearchControllerRef = useRef(null);
```

This requires `useRef` to be imported — update the React import line at the top of the file from:
```js
import React, { useState, useEffect } from "react";
```
to:
```js
import React, { useState, useEffect, useRef } from "react";
```

- [ ] **Step 4: Replace the `searchAddress` function**

Replace the existing `searchAddress` function (currently calling Nominatim directly) with:

```js
  const searchAddress = async (query) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    if (activeSearchControllerRef.current) {
      activeSearchControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeSearchControllerRef.current = controller;

    setIsSearching(true);

    try {
      if (isPostcodeLike(query)) {
        const postcodes = await searchPostcodes(query, controller.signal);

        if (postcodes.length === 0) {
          showError('No matching postcodes found.');
          setAddressSuggestions([]);
          return;
        }

        setAddressSuggestions(
          postcodes.map(postcode => ({
            address: postcode,
            postcode,
            isPostcodeSuggestion: true
          }))
        );
      } else {
        const biasCenter = computeBiasCenter(addresses);
        const suggestions = await searchAddresses(query, biasCenter, controller.signal);

        if (suggestions.length === 0) {
          showError('No addresses found. Try a different search term.');
          setAddressSuggestions([]);
          return;
        }

        setAddressSuggestions(suggestions);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Address search error:', error);
      showError('Unable to search addresses. Please check your connection.');
      setAddressSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };
```

- [ ] **Step 5: Handle picking a postcode suggestion**

Replace the existing `addAddress` function:

```js
  const addAddress = (address) => {
    setAddresses([...addresses, { ...address, id: Date.now() }]);
    setCurrentAddress("");
    setAddressSuggestions([]);
  };
```

with a version that resolves postcode suggestions to coordinates first:

```js
  const addAddress = async (address) => {
    if (address.isPostcodeSuggestion) {
      try {
        const resolved = await resolvePostcode(address.postcode, new AbortController().signal);
        setAddresses([...addresses, {
          address: resolved.postcode,
          postcode: resolved.postcode,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          type: 'postcode',
          id: Date.now()
        }]);
      } catch (error) {
        console.error('Postcode resolve error:', error);
        showError('Unable to resolve that postcode. Please try again.');
        return;
      }
    } else {
      setAddresses([...addresses, { ...address, id: Date.now() }]);
    }

    setCurrentAddress("");
    setAddressSuggestions([]);
  };
```

- [ ] **Step 6: Distinguish postcode suggestions in the dropdown**

Find the address-suggestions rendering block (inside the `AnimatePresence` wrapping `addressSuggestions.map`):

```jsx
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => addAddress(suggestion)}
                          className="w-full p-2 text-left text-sm bg-muted hover:bg-muted/80 rounded border border-border/50 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-xs">{suggestion.address}</p>
                            </div>
                          </div>
                        </button>
                      ))}
```

Replace with a version whose icon and label reflect whether it's a postcode suggestion:

```jsx
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => addAddress(suggestion)}
                          className="w-full p-2 text-left text-sm bg-muted hover:bg-muted/80 rounded border border-border/50 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            {suggestion.isPostcodeSuggestion ? (
                              <Navigation2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            ) : (
                              <MapPin className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs">{suggestion.address}</p>
                              {suggestion.isPostcodeSuggestion && (
                                <p className="text-[10px] text-muted-foreground">Postcode area</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
```

`Navigation2` is already imported in this file (used elsewhere for the page header icon), so no new icon import is needed.

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: PASS — 50/50 (30 pre-existing + 20 from Tasks 1-3), unchanged/unaffected by this task's component-only change.

- [ ] **Step 8: Manually verify in the dev server**

Start the dev server (`npm start`) and navigate to Route Planner (`/app/routes`):
1. Type a partial postcode (e.g. `bn44`) into the address search box. Confirm postcode suggestions appear, each showing a "Postcode area" label and a distinct icon from name-based suggestions.
2. Click one — confirm it's added to the Stops list directly (no intermediate step).
3. Add 2-3 stops that share a postcode area, then type a house/street name into the search box. Confirm the results returned are plausible for that area (not scattered nationwide) — check the Network tab or console to confirm the request URL includes a `viewbox` parameter.
4. Type a query quickly, character by character, on a throttled/slow network (browser devtools network throttling) to exercise the cancel-and-replace path. Confirm no stale/flickering wrong results appear, and confirm no error message is shown for the aborted requests.
5. With an empty stop list, search a house name and confirm results are unbiased (no `viewbox` in the request), matching current behavior for a first stop.

- [ ] **Step 9: Commit**

```bash
git add src/components/RoutePlanner.jsx
git commit -m "feat: use postcode-aware, cancellation-safe address search in RoutePlanner"
```

---

## Self-Review Notes

- **Spec coverage:** All five functions named in the spec (`isPostcodeLike`, `computeBiasCenter`, `searchPostcodes`, `resolvePostcode`, `searchAddresses`) are built and tested (Tasks 1-3); the reliability fix (AbortController cancel-and-replace, silent AbortError handling) and the RoutePlanner integration (postcode-suggestion UI, bias-aware name search) are both in Task 4. The non-goals (no changes to optimization/geolocation/saved-routes/sharing/nav buttons/RouteMap/Clear button) are respected — no task touches any of those.
- **Placeholder scan:** none found — every step has complete, runnable code and exact commands with expected output.
- **Type/name consistency:** `isPostcodeLike`, `computeBiasCenter`, `searchPostcodes`, `resolvePostcode`, `searchAddresses` are named and signatured identically across Tasks 1-4 (checked import lines in Task 4 against each function's `export` in Tasks 1-3). `addressSuggestions` items now carry an `isPostcodeSuggestion` flag consistently used in both `addAddress` (Task 4 Step 5) and the dropdown JSX (Task 4 Step 6).
