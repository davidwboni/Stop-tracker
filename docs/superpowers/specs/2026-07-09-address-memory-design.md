# Address Memory — Design Spec

## Background

Sub-project A (Route Planner address-search reliability, shipped) fixed a
race-condition bug and added postcode-aware search to `RoutePlanner.jsx`.
This is sub-project B of the same original request: a "memory" of
frequently-used addresses, so a driver with recurring stops doesn't have to
re-search the same address every time.

This is distinct from the existing "Saved Routes" feature (`RoutePlanner.jsx`'s
`saveRoute`/`loadRoute`/`deleteSavedRoute`), which saves a whole named list of
stops as one unit. Address Memory tracks individual addresses across all
routes, ranked by how often and how recently you've used each one.

While investigating storage options, a real gap was found in the existing
Saved Routes feature: it persists to `localStorage.getItem('savedRoutes')`
with no per-user key at all, unlike the rest of the app's real user data
(logs, payment config), which is Firestore-backed for signed-in users via
`DataContext.jsx`, with a `localStorage` fallback correctly keyed per guest
user ID. If two different accounts ever sign into the same browser, they
would see each other's saved routes. Address Memory follows the correct,
existing `DataContext.jsx` pattern instead of copying this flaw — it is not
this project's job to fix Saved Routes itself, only to not repeat its mistake.

## Goals

- Automatically track every address a driver adds to a route (no manual
  "favorite" action required) and surface the most frequently/recently used
  ones as immediate suggestions the moment the address search box is
  focused — before the driver types anything.
- Rank by a combination of frequency and recency, not raw use-count alone, so
  an address visited often last year doesn't permanently outrank one visited
  daily this week.
- Store per-user: Firestore for signed-in users, in its own dedicated
  collection (mirroring `PayPeriodContext.jsx`'s `payPeriodData/{uid}`
  pattern, not the shared `users/{uid}` document `paymentConfig` lives on —
  a dedicated collection avoids write contention with unrelated fields on
  that document), `localStorage` keyed by `guestAddressMemory_${user.uid}`
  for guests — matching the guest-vs-signed-in branching `DataContext.jsx`
  and `PayPeriodContext.jsx` both already use.
- Follow the precedent set by sub-project A: pure, unit-tested ranking/dedup
  logic in a plain service module, separate from the React/Firestore
  plumbing.

## Non-goals

- No manual "un-remember"/delete-from-memory control in this pass. Decay
  already causes rarely-used addresses to naturally fall out of the ranked
  list over time; a manual removal UI can be a future addition if requested.
- No changes to the existing "Saved Routes" feature itself (still
  unscoped-localStorage, still a separate concept) — out of scope, flagged
  above only as context for why this new feature uses a different pattern.
- No changes to `optimizeRoute`, geolocation, sharing, "Start Navigation"
  buttons, `RouteMap.jsx`, or the "Clear" button — same non-goals carried
  from sub-project A, since this again touches `RoutePlanner.jsx`.
- No minimum-use threshold before an address becomes suggestible — even a
  single past use is enough to appear (subject to the ranking naturally
  pushing it down as other addresses accumulate more recent/frequent use).

## Architecture

**New file: `src/services/addressMemory.js`** — plain, pure functions, no
Firestore/React dependency, following the exact separation-of-concerns
pattern `src/services/addressSearch.js` established in sub-project A:

- `computeScore(entry, now)` — frequency decayed by recency. Formula:
  `entry.useCount * Math.pow(0.5, daysSinceLastUse / 30)` — a 30-day
  half-life, so an address's contribution to its own score halves roughly
  every month since it was last used, while repeated recent use keeps
  compounding the count.
- `recordUse(memoryList, address, now)` — given the current list and an
  address just added to a route, returns a **new** list: increments
  `useCount`/updates `lastUsedAt` if an entry with the same `address` string
  already exists (dedup key — the same display string already used
  elsewhere), otherwise appends a new entry with `useCount: 1`. If the
  resulting list exceeds a 100-entry cap, evicts the lowest-scored entries
  (by `computeScore`) until back at 100 — this is a pure function, it does
  not perform any I/O itself.
- `getFrequentAddresses(memoryList, now, limit)` — scores every entry, sorts
  descending, returns the top `limit` (the UI will use 5), each formatted as
  `{ address, postcode, latitude, longitude, isFrequentSuggestion: true }`
  — a new suggestion-type flag alongside the existing `isPostcodeSuggestion`
  flag from sub-project A, so the dropdown can render a third visual
  treatment.

Each stored entry's shape:
```js
{
  address: string,      // dedup key, same field used for display elsewhere
  postcode: string,
  latitude: number,
  longitude: number,
  useCount: number,
  lastUsedAt: string     // ISO 8601 timestamp
}
```

**New file: `src/contexts/AddressMemoryContext.jsx`** — mirrors
`src/features/payperiod/PayPeriodContext.jsx`'s existing pattern (a small,
single-responsibility context, not folded into the already-multi-concern
`DataContext.jsx`). On mount, loads the current list (Firestore field for
signed-in users, per-user `localStorage` key for guests — same branching
`DataContext.jsx` already uses for logs/config). Exposes:
- `frequentAddresses` — the current top-5 ranked list, ready to render
- `recordAddressUse(address)` — calls `recordUse` from the service module,
  persists the updated list (Firestore write or `localStorage.setItem`
  depending on auth state), and updates the ranked list in state

## Data Flow

1. Driver adds a stop in `RoutePlanner.jsx` (either via a resolved postcode
   suggestion, or a Nominatim name-search result) — `addAddress` calls
   `recordAddressUse(address)` for both paths, so anything actually added to
   a route counts, regardless of which search path found it.
2. Driver later focuses/taps the address search input with it empty (before
   typing) — `RoutePlanner.jsx` populates `addressSuggestions` with
   `frequentAddresses` directly, no network call needed (this data is
   already loaded and ranked client-side).
3. As soon as the driver starts typing, the existing sub-project A
   postcode/name classification and search takes over as normal — frequent
   suggestions are only shown for the empty-input state, not merged into
   in-progress search results.
4. Selecting a frequent suggestion adds it to the route exactly like any
   other suggestion (via the existing `addAddress` path), which in turn
   records another use — naturally reinforcing genuinely-recurring stops.

## Testing / Verification

- `computeScore`, `recordUse`, and `getFrequentAddresses` get real unit
  tests in `src/__tests__/addressMemory.test.js`, following the exact
  `vitest`/`describe`/`it`/`expect` convention established for
  `addressSearch.test.js` — dedup on repeated use, decay behavior over
  concrete day counts, cap eviction at 100 entries, empty-list edge case.
- `AddressMemoryContext.jsx`'s Firestore/localStorage branching is
  presentation/integration-layer code with no existing precedent for
  automated testing in this codebase (same as `DataContext.jsx` and
  `PayPeriodContext.jsx`, neither of which have test files) — verified
  manually via the dev server: as a guest user, add a few addresses to a
  route, confirm they appear in the search box's empty-state suggestions
  ranked sensibly, confirm the list persists across a page reload (guest
  localStorage path); as a signed-in user if a real account is available,
  confirm the same behavior round-trips through Firestore.
- Existing 50-test suite (`payPeriodCalculations` + `periodUtils` +
  `addressSearch`) must stay green throughout — no changes to those
  modules.
