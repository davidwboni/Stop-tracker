# Route Planner — Address Search Reliability & Postcode-Aware Ranking

## Background

`RoutePlanner.jsx`'s address search (`searchAddress`, lines ~64-116) calls
OpenStreetMap's Nominatim directly from the browser on a 500ms typing
debounce. Two problems surfaced from real phone use:

1. **Reliability bug**: no request is ever cancelled. On a slower or more
   variable mobile connection, an older, slower response can resolve after a
   newer one and silently overwrite the latest results with stale data —
   the search appears to "not work" or show the wrong thing.
2. **Wrong tool for postcodes**: Nominatim is a general geocoder. It has no
   concept of "the user is midway through typing a UK postcode" and doesn't
   prioritize results the way a purpose-built postcode lookup would. Typing
   a partial postcode (e.g. `bn44`) doesn't reliably surface the right
   postcode as a suggestion, and once several stops in the same postcode
   area have been added, subsequent house-name searches don't take that
   into account — results for a house/street name feel "rather random"
   instead of being weighted toward the area the driver is actually working
   in.

This sub-project (the first of three: search reliability, then address
memory, then a mini-map preview — decided during brainstorming) fixes both,
without changing route optimization, geolocation, saved routes, or the
existing UI layout.

## Goals

- Cancel in-flight requests when a new search fires, so a stale response can
  never overwrite fresher results.
- Recognize postcode-shaped input (full or partial, with or without a
  space) and query a purpose-built UK postcode service (postcodes.io — free,
  no API key) instead of Nominatim for that input.
- For non-postcode (house name/street) input, bias Nominatim's results
  toward the area of the addresses already added to the current route,
  weighted toward the most recently added stop, without hard-excluding
  genuinely distant matches.
- Extract the search logic into a plain, testable module so the
  classification and bias-calculation logic (real logic with edge cases) has
  real unit tests, following the existing `src/__tests__/` pattern
  (`payPeriodCalculations.test.ts`, `periodUtils.test.ts`).

## Non-goals

- No change to route optimization (`optimizeRoute`, the Nearest Neighbor
  algorithm), geolocation (`getCurrentLocation`), saved routes
  (`saveRoute`/`loadRoute`/`deleteSavedRoute`), sharing, or the "Start
  Navigation" external-nav-app buttons.
- No change to `RouteMap.jsx` (marker/polyline colors stay exactly as they
  are, per explicit decision during brainstorming) or to the three
  nav-app buttons' brand colors.
- No house-level precision for postcode-picked stops. Selecting a postcode
  suggestion adds that postcode's center point as the stop. UK unit
  postcodes average ~15 addresses, and "Start Navigation" already hands off
  to Google/Waze/Apple Maps for door-level precision, so postcode-centroid
  accuracy is sufficient for getting the driver to the right spot.
- Address memory/favorites and the mini-map-on-click preview are separate,
  later sub-projects — not built here.
- No change to the "Clear" (delete-all-stops) button — it already exists
  (`RoutePlanner.jsx:624-632`) and works; not touched by this spec.

## Architecture

New module: `src/services/addressSearch.js`. Pure functions, no React,
so they're directly unit-testable:

- `isPostcodeLike(query: string): boolean` — regex-based classifier for
  full or partial UK postcodes typed with or without a space (e.g. `"bn44"`,
  `"bn443dd"`, `"BN44 3DD"`).
- `searchPostcodes(query: string, signal: AbortSignal): Promise<string[]>`
  — calls postcodes.io's autocomplete endpoint
  (`GET https://api.postcodes.io/postcodes/{query}/autocomplete`), returns
  an array of matching postcode strings (e.g. `["BN44 3DD", "BN44 3TH"]`).
- `resolvePostcode(postcode: string, signal: AbortSignal): Promise<{postcode: string, latitude: number, longitude: number}>`
  — calls postcodes.io's lookup endpoint
  (`GET https://api.postcodes.io/postcodes/{postcode}`) for the chosen
  postcode's center coordinates.
- `computeBiasCenter(addresses: Array<{latitude: number, longitude: number}>): {latitude: number, longitude: number} | null`
  — returns a weighted center point from the current address list (weighted
  toward the most recently added address — the last element of the array),
  or `null` if the list is empty (meaning: no bias, search nationwide).
- `searchAddresses(query: string, biasCenter: {latitude: number, longitude: number} | null, signal: AbortSignal): Promise<Array<{address, postcode, latitude, longitude, type}>>`
  — the existing Nominatim call (same request shape/response mapping as
  today), with an added `viewbox`+`bounded=0` parameter pair computed from
  `biasCenter` when provided (soft bias — ranks nearby results first without
  excluding distant genuine matches). When `biasCenter` is `null`, behaves
  exactly as today (unbiased UK-wide search).

`RoutePlanner.jsx`'s `searchAddress` function is rewritten to:
1. Classify the query via `isPostcodeLike`.
2. If postcode-like: call `searchPostcodes`, map each result into the
   existing `addressSuggestions` shape (tagged so the dropdown can show a
   small postcode-specific indicator), distinct from name-based results.
   Selecting a postcode suggestion calls `resolvePostcode` and adds the
   result directly as a stop (no secondary Nominatim round-trip).
3. If not postcode-like: call `computeBiasCenter(addresses)`, then
   `searchAddresses(query, biasCenter, signal)` — same result shape as
   today, existing `addAddress` flow unchanged.

## Reliability fix

Every dispatch of `searchAddress` creates a fresh `AbortController` and
stores it in a ref (e.g. `activeSearchControllerRef`). Before firing a new
search, any previous controller is aborted. Both `searchPostcodes` and
`searchAddresses` receive the new controller's `signal` and pass it to
`fetch`. In the `catch` block, `AbortError` is treated as a silent no-op
(not shown to the user as a search failure) — only genuine network/API
errors surface the existing `showError` messaging.

## Resilience

If postcodes.io is unreachable or errors for a postcode-shaped query, fall
back to a plain (unbiased) Nominatim search for that same query rather than
showing no results — postcode-awareness is a progressive enhancement, not a
hard dependency.

## Testing

`src/__tests__/addressSearch.test.ts` (new), covering the pure/testable
pieces of `src/services/addressSearch.js`:

- `isPostcodeLike`: accepts partial and full UK postcodes with/without a
  space (`"bn44"`, `"bn443dd"`, `"BN44 3DD"`, `"bn44 3"`), rejects house
  names and street addresses (`"10 High Street"`, `"Buckingham Palace"`).
- `computeBiasCenter`: returns `null` for an empty address list; returns a
  point for a single address; returns a point weighted toward the most
  recent address for a multi-address list with addresses spread across
  different areas.
- URL/parameter construction for `searchAddresses` (viewbox math derived
  from a given bias center) and for `searchPostcodes`/`resolvePostcode`
  (correct endpoint URLs, encoding of the query).

Manual verification (dev server, since this touches live third-party APIs
and mobile-network-dependent behavior that unit tests can't fully cover):
type a partial postcode and confirm postcode suggestions appear and are
distinguishable from name-based ones; add 2-3 stops in the same postcode
area, then search a house name and confirm nearby matches rank first; type
quickly to exercise the abort-and-replace path and confirm no stale-result
flicker.

## Self-review notes

- Placeholder scan: none — every function has a concrete signature and
  behavior description.
- Internal consistency: the "no house-level precision, centroid is enough"
  non-goal is justified by the same reasoning used for the postcode-first
  UX in Goals — consistent, not contradictory.
- Scope check: this is one cohesive change (extract + fix + add postcode
  path) touching one new module and one existing component — appropriately
  sized for a single implementation plan, not further decomposition.
