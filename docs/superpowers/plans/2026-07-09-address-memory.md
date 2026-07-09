# Address Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically remember addresses a driver adds to routes, ranked by frequency decayed by recency, and surface the top few as instant suggestions the moment the Route Planner's address search box is focused — before typing anything.

**Architecture:** A new plain, pure-function module (`src/services/addressMemory.js`) handles scoring, deduping, and capping the remembered-address list — no Firestore/React dependency, fully unit-tested, mirroring the `src/services/addressSearch.js` pattern from the prior Route Planner reliability work. A new context (`src/contexts/AddressMemoryContext.jsx`) owns the actual persistence, mirroring `src/features/payperiod/PayPeriodContext.jsx`'s exact structure: its own dedicated Firestore collection (`addressMemoryData/{uid}`) for signed-in users, per-user-keyed `localStorage` for guests. `RoutePlanner.jsx` calls into the context to record a use whenever a stop is added, and to populate the search suggestions dropdown with frequent addresses when the input is focused and empty.

**Tech Stack:** React 18, Vitest (`globals: true`, `environment: 'jsdom'`), Firebase Firestore (`firebase/firestore`), existing `AuthContext` for guest/signed-in branching.

## Global Constraints

- Dedup key for a remembered address is its `address` string field (the same field already used for display everywhere else) — not coordinates, not postcode.
- Score formula: `useCount * Math.pow(0.5, daysSinceLastUse / 30)` — a 30-day recency half-life.
- Stored list is capped at 100 entries; when adding a new entry would exceed the cap, the lowest-scored entries are evicted first.
- Frequent suggestions shown in the UI are capped at 5 (`FREQUENT_ADDRESSES_LIMIT`).
- Firestore storage lives in its own dedicated collection, `addressMemoryData/{uid}` (mirroring `payPeriodData/{uid}` from `PayPeriodContext.jsx`) — NOT a field on the shared `users/{uid}` document that `paymentConfig` lives on.
- Guest storage: `localStorage` keyed by `guestAddressMemory_${user.uid}` (per-user, unlike the existing "Saved Routes" feature's unscoped key — do not repeat that flaw).
- No manual delete/un-remember UI in this pass.
- No changes to `optimizeRoute`, `getCurrentLocation`, `saveRoute`/`loadRoute`/`deleteSavedRoute`, `shareRoute`/`copyRouteToClipboard`, the "Start Navigation" buttons, `RouteMap.jsx`, or the "Clear" button.
- Frequent suggestions only populate the dropdown when `currentAddress` is empty at focus time — the existing debounced search (from the prior Route Planner reliability work) already clears suggestions on any keystroke, so no new logic is needed to make frequent suggestions disappear once typing starts.

---

## File Structure

**Create:**
- `src/services/addressMemory.js` — `computeScore`, `recordUse`, `getFrequentAddresses`
- `src/__tests__/addressMemory.test.js` — unit tests for all three functions
- `src/contexts/AddressMemoryContext.jsx` — `AddressMemoryProvider`, `useAddressMemory`

**Modify:**
- `src/index.js` — wire `AddressMemoryProvider` into the provider tree
- `src/components/RoutePlanner.jsx` — consume `useAddressMemory`, call `recordAddressUse` on add, populate suggestions on focus, add a third dropdown visual treatment

---

### Task 1: Pure ranking, dedup, and cap logic

**Files:**
- Create: `src/services/addressMemory.js`
- Test: `src/__tests__/addressMemory.test.js`

**Interfaces:**
- Produces: `computeScore(entry: {useCount: number, lastUsedAt: string}, now: Date): number`, `recordUse(memoryList: Array<Entry>, address: {address, postcode, latitude, longitude}, now: Date): Array<Entry>`, `getFrequentAddresses(memoryList: Array<Entry>, now: Date, limit: number): Array<{address, postcode, latitude, longitude, isFrequentSuggestion: true}>` — where `Entry` is `{address: string, postcode: string, latitude: number, longitude: number, useCount: number, lastUsedAt: string}`. Task 2 (`AddressMemoryContext.jsx`) imports `recordUse` and `getFrequentAddresses` from this module. `computeScore` is used internally by both, and is also exported directly so its tests can pin down the exact decay math independently.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/addressMemory.test.js`:

```js
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
    // 180 days = 6 half-lives
    expect(computeScore(entry, now)).toBeCloseTo(10 * Math.pow(0.5, 180 / 30), 5);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/addressMemory.test.js`
Expected: FAIL — `Cannot find module '../services/addressMemory'` (the module doesn't exist yet).

- [ ] **Step 3: Implement the module**

Create `src/services/addressMemory.js`:

```js
const RECENCY_HALF_LIFE_DAYS = 30;
const MAX_ENTRIES = 100;

export function computeScore(entry, now) {
  const daysSinceLastUse = (now - new Date(entry.lastUsedAt)) / (1000 * 60 * 60 * 24);
  const recencyWeight = Math.pow(0.5, daysSinceLastUse / RECENCY_HALF_LIFE_DAYS);
  return entry.useCount * recencyWeight;
}

export function recordUse(memoryList, address, now) {
  const existingIndex = memoryList.findIndex(entry => entry.address === address.address);
  let newList;

  if (existingIndex === -1) {
    newList = [
      ...memoryList,
      {
        address: address.address,
        postcode: address.postcode,
        latitude: address.latitude,
        longitude: address.longitude,
        useCount: 1,
        lastUsedAt: now.toISOString()
      }
    ];
  } else {
    newList = memoryList.map((entry, index) =>
      index === existingIndex
        ? { ...entry, useCount: entry.useCount + 1, lastUsedAt: now.toISOString() }
        : entry
    );
  }

  if (newList.length > MAX_ENTRIES) {
    newList = [...newList]
      .sort((a, b) => computeScore(b, now) - computeScore(a, now))
      .slice(0, MAX_ENTRIES);
  }

  return newList;
}

export function getFrequentAddresses(memoryList, now, limit) {
  return [...memoryList]
    .sort((a, b) => computeScore(b, now) - computeScore(a, now))
    .slice(0, limit)
    .map(entry => ({
      address: entry.address,
      postcode: entry.postcode,
      latitude: entry.latitude,
      longitude: entry.longitude,
      isFrequentSuggestion: true
    }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/addressMemory.test.js`
Expected: PASS — 11/11 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/services/addressMemory.js src/__tests__/addressMemory.test.js
git commit -m "feat: add frequency/recency scoring and dedup logic for address memory"
```

---

### Task 2: AddressMemoryContext (Firestore/localStorage persistence)

**Files:**
- Create: `src/contexts/AddressMemoryContext.jsx`
- Modify: `src/index.js:1-10` (imports), `:20-34` (provider tree)

**Interfaces:**
- Consumes: `recordUse`, `getFrequentAddresses` from `../services/addressMemory` (Task 1). `useAuth` from `./AuthContext` (existing).
- Produces: `useAddressMemory()` hook returning `{ frequentAddresses: Array<{address, postcode, latitude, longitude, isFrequentSuggestion}>, recordAddressUse: (address: {address, postcode, latitude, longitude}) => Promise<void>, loading: boolean }` — Task 3 (`RoutePlanner.jsx`) imports and calls this hook.

- [ ] **Step 1: Create the context**

Create `src/contexts/AddressMemoryContext.jsx`:

```jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { recordUse, getFrequentAddresses } from "../services/addressMemory";

const AddressMemoryContext = createContext();

export const useAddressMemory = () => {
  const context = useContext(AddressMemoryContext);
  if (!context) {
    throw new Error("useAddressMemory must be used within an AddressMemoryProvider");
  }
  return context;
};

const FREQUENT_ADDRESSES_LIMIT = 5;

export const AddressMemoryProvider = ({ children }) => {
  const { user } = useAuth();
  const [memory, setMemory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        if (user.isGuest) {
          const saved = localStorage.getItem(`guestAddressMemory_${user.uid}`);
          if (saved) setMemory(JSON.parse(saved));
        } else {
          const memoryDoc = await getDoc(doc(db, "addressMemoryData", user.uid));
          if (memoryDoc.exists()) {
            setMemory(memoryDoc.data().entries || []);
          }
        }
      } catch (error) {
        console.error("Error loading address memory:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const saveMemory = async (newMemory) => {
    if (!user) return;

    try {
      if (user.isGuest) {
        localStorage.setItem(`guestAddressMemory_${user.uid}`, JSON.stringify(newMemory));
      } else {
        await setDoc(
          doc(db, "addressMemoryData", user.uid),
          { entries: newMemory, updatedAt: new Date() },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("Error saving address memory:", error);
      throw error;
    }
  };

  const recordAddressUse = async (address) => {
    const newMemory = recordUse(memory, address, new Date());
    setMemory(newMemory);
    await saveMemory(newMemory);
  };

  const frequentAddresses = getFrequentAddresses(memory, new Date(), FREQUENT_ADDRESSES_LIMIT);

  const value = { frequentAddresses, recordAddressUse, loading };

  return (
    <AddressMemoryContext.Provider value={value}>
      {children}
    </AddressMemoryContext.Provider>
  );
};
```

- [ ] **Step 2: Wire the provider into the app**

Modify `src/index.js`. Add the import after the `PayPeriodProvider` import:

```js
import { PayPeriodProvider } from './features/payperiod/PayPeriodContext';
import { AddressMemoryProvider } from './contexts/AddressMemoryContext';
```

Add `AddressMemoryProvider` into the tree, nested anywhere inside `AuthProvider` (it only needs `useAuth`) — insert it between `PayPeriodProvider` and `InvoiceProvider`:

```jsx
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <DataProvider>
          <PayPeriodProvider>
            <AddressMemoryProvider>
              <InvoiceProvider>
                <RouterProvider router={router} />
              </InvoiceProvider>
            </AddressMemoryProvider>
          </PayPeriodProvider>
        </DataProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: PASS — 61/61 (50 pre-existing + 11 from Task 1), unaffected by this task's context/wiring-only change.

- [ ] **Step 4: Manually verify the app still boots**

Run: `npm start`, sign in as guest, confirm the app loads without a blank screen or console error referencing `AddressMemoryProvider`/`useAddressMemory` (the hook isn't consumed by any component yet — Task 3 does that — so this step just confirms the provider itself mounts cleanly).

- [ ] **Step 5: Commit**

```bash
git add src/contexts/AddressMemoryContext.jsx src/index.js
git commit -m "feat: add AddressMemoryContext for per-user frequent-address persistence"
```

---

### Task 3: Wire into RoutePlanner.jsx

**Files:**
- Modify: `src/components/RoutePlanner.jsx:1-33` (imports), `:35-47` (component body, hook usage), `:191-217` (`addAddress`), `:574-581` (search `Input`), `:606-626` (suggestions dropdown JSX)

**Interfaces:**
- Consumes: `useAddressMemory` from `../contexts/AddressMemoryContext` (Task 2), returning `{ frequentAddresses, recordAddressUse }`.
- Produces: no new exports — this is the integration task. `RoutePlanner`'s own props/exports (it takes none) are unchanged.

- [ ] **Step 1: Read the current file to confirm content**

Read `src/components/RoutePlanner.jsx` in full — match the snippets below by surrounding code content, since exact line numbers may have drifted since the prior Route Planner reliability work.

- [ ] **Step 2: Add the import**

Add after the existing `../services/addressSearch` import block:

```js
import { useAddressMemory } from "../contexts/AddressMemoryContext";
```

Also add `Clock` to the existing `lucide-react` import list (used for the frequent-suggestion icon in Step 5) — the import currently reads:

```js
import {
  MapPin,
  Navigation,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Navigation2,
  CheckCircle2,
  Zap,
  Copy,
  Play,
  Locate,
  Save,
  FolderOpen,
  Share2,
  AlertCircle
} from "lucide-react";
```

Change it to:

```js
import {
  MapPin,
  Navigation,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Navigation2,
  CheckCircle2,
  Zap,
  Copy,
  Play,
  Locate,
  Save,
  FolderOpen,
  Share2,
  AlertCircle,
  Clock
} from "lucide-react";
```

- [ ] **Step 3: Use the hook in the component**

Add inside the component body, right after the existing state declarations (after `const activeSearchControllerRef = useRef(null);`):

```js
  const { frequentAddresses, recordAddressUse } = useAddressMemory();
```

- [ ] **Step 4: Record a use whenever an address is actually added**

Replace the `addAddress` function:

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
        if (error.name === 'AbortError') {
          return;
        }
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

with a version that also calls `recordAddressUse` for both paths:

```js
  const addAddress = async (address) => {
    if (address.isPostcodeSuggestion) {
      try {
        const resolved = await resolvePostcode(address.postcode, new AbortController().signal);
        const newAddress = {
          address: resolved.postcode,
          postcode: resolved.postcode,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          type: 'postcode',
          id: Date.now()
        };
        setAddresses([...addresses, newAddress]);
        recordAddressUse(newAddress);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('Postcode resolve error:', error);
        showError('Unable to resolve that postcode. Please try again.');
        return;
      }
    } else {
      const newAddress = { ...address, id: Date.now() };
      setAddresses([...addresses, newAddress]);
      recordAddressUse(newAddress);
    }

    setCurrentAddress("");
    setAddressSuggestions([]);
  };
```

Note: `recordAddressUse` is called without `await` here (fire-and-forget) — matching the existing fire-and-forget pattern already used elsewhere in this file for non-blocking side effects, since the UI shouldn't wait on a Firestore/localStorage write before letting the driver continue adding stops.

- [ ] **Step 5: Show frequent addresses when the search box is focused and empty**

Replace the search `Input`:

```jsx
                    <Input
                      type="text"
                      placeholder="Search UK address..."
                      value={currentAddress}
                      onChange={(e) => setCurrentAddress(e.target.value)}
                      className="pl-10"
                    />
```

with:

```jsx
                    <Input
                      type="text"
                      placeholder="Search UK address..."
                      value={currentAddress}
                      onChange={(e) => setCurrentAddress(e.target.value)}
                      onFocus={() => {
                        if (!currentAddress && frequentAddresses.length > 0) {
                          setAddressSuggestions(frequentAddresses);
                        }
                      }}
                      className="pl-10"
                    />
```

- [ ] **Step 6: Distinguish frequent suggestions in the dropdown**

Replace the suggestions-rendering block:

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

with:

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
                            ) : suggestion.isFrequentSuggestion ? (
                              <Clock className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            ) : (
                              <MapPin className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs">{suggestion.address}</p>
                              {suggestion.isPostcodeSuggestion && (
                                <p className="text-[10px] text-muted-foreground">Postcode area</p>
                              )}
                              {suggestion.isFrequentSuggestion && (
                                <p className="text-[10px] text-muted-foreground">Frequently used</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
```

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: PASS — 61/61 (30 pre-existing route-search-unrelated + 20 addressSearch + 11 addressMemory), unaffected by this task's component-only change.

- [ ] **Step 8: Manually verify in the dev server**

Start the dev server (`npm start`), sign in as guest, navigate to Route Planner:
1. Add 2-3 different addresses to the route (via name search and/or postcode search).
2. Clear the search input (or it should already be empty after adding), click away, then click/focus back into the search input without typing. Confirm the 2-3 addresses you just added appear as suggestions immediately, each with a clock icon and "Frequently used" label, distinct from the postcode/name icons.
3. Add one of those same addresses again (search for it and re-add, or select it from the frequent-suggestions list) — confirm no duplicate entry is created in memory (this can be checked by reloading the page and re-focusing the search box: the list should still show it once, not twice).
4. Reload the page (still signed in as the same guest) and confirm the frequent suggestions persist (guest `localStorage` path working).
5. Start typing in the search box after focusing — confirm the frequent suggestions are replaced by real search results as expected (no merging/duplication).

- [ ] **Step 9: Commit**

```bash
git add src/components/RoutePlanner.jsx
git commit -m "feat: surface frequently-used addresses as instant suggestions in RoutePlanner"
```

---

## Self-Review Notes

- **Spec coverage:** All three architecture pieces from the spec (pure service module, dedicated-collection context, UI wiring) are covered by Tasks 1-3 respectively. The spec's stated non-goals (no manual delete UI, no changes to unrelated RoutePlanner features) are respected — no task touches anything beyond the named files/functions. The spec's data-flow steps (record on add, suggest on focus-when-empty, real search takes over on typing, selecting a suggestion re-records) are all implemented across Tasks 2-3.
- **Placeholder scan:** none found — every step has complete, runnable code and exact commands with expected output.
- **Type/name consistency:** `computeScore`/`recordUse`/`getFrequentAddresses` (Task 1) are imported with identical names and signatures in Task 2's `AddressMemoryContext.jsx`. `useAddressMemory`'s returned shape (`frequentAddresses`, `recordAddressUse`, `loading`) matches exactly what Task 3 destructures and calls. The `isFrequentSuggestion` flag introduced in Task 1's `getFrequentAddresses` output is consumed consistently in Task 3's dropdown JSX, alongside the pre-existing `isPostcodeSuggestion` flag from the prior Route Planner reliability work.
