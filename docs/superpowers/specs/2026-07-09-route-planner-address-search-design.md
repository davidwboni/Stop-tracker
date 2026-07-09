# Route Planner — Address Search Reliability + Postcode-Aware Ranking

## Background

`RoutePlanner.jsx`'s address search (`searchAddress`, lines 64-116) calls
OpenStreetMap's Nominatim directly from the browser on every keystroke
(debounced 500ms). Testing on a phone surfaced three related problems:

1. **Reliability bug**: no request cancellation. On a mobile connection with
   variable latency, an older, slower response can resolve *after* a newer
   one and silently overwrite the freshest results with stale data.
2. **Postcode recognition is weak**: Nominatim is a general geocoder, not a
   postcode-first autocomplete. Typing a partial postcode (e.g. `bn44`) does
   not reliably surface matching postcodes the way a dedicated postcode
   lookup would.
3. **No spatial awareness across a route**: searching by house/street name
   returns nationally-ranked results with no bias toward the area the
   driver is already working in, even when several stops already share a
   postcode prefix (e.g. `BN44`).

This is the first of three planned improvements to the Route Planner
(address-search reliability + ranking, then an address-memory/favorites
feature, then a mini-map preview on address click) — this spec covers only
the first.

## Goals

- Fix the race condition: an in-flight search request is always cancelled
  when a newer one starts, so stale responses can never overwrite fresh
  results.
- Recognize postcode-shaped input as you type and use a purpose-built
  postcode lookup (postcodes.io) instead of Nominatim for that case.
- Bias house/street-name search results toward the area of already-added
  stops (weighted toward the most recently added one), without hard-
  excluding genuinely distant matches.
- No behavior change for the first stop on an empty route — bias only
  applies once at least one address already exists.
- Extract the search logic into a standalone, unit-tested module rather
  than leaving it embedded in the component body, since this is now real
  logic (classification, bias-center calculation) rather than pure
  rendering.

## Non-goals

- No changes to route optimization (`optimizeRoute`, the nearest-neighbor
  algorithm), saved routes, or the navigation-app handoff buttons.
- No address-memory/favorites feature — that's the next sub-project.
- No mini-map-on-click preview — that's the sub-project after that.
- No confirmation dialog added to the existing "Clear" (delete all stops)
  button — it already exists (`RoutePlanner.jsx:624-632`); not touched here
  unless it turns out to be broken, which hasn't been established.
- Selecting a postcode suggestion adds it at the postcode's center point,
  not a specific house within it — UK unit postcodes average ~15 addresses,
  and the app already hands off to Google/Waze/Apple Maps for door-level
  navigation, so postcode-level precision is sufficient for routing.

## Architecture

New module: `src/services/addressSearch.js` — pure functions, no React,
fully unit-testable:

- `isPostcodeLike(query: string): boolean` — true if `query` looks like a
  partial or full UK postcode (letters-then-digits outward-code pattern,
  with or without a space, with or without the inward code typed yet).
- `searchPostcodes(query: string, signal: AbortSignal): Promise<string[]>`
  — calls postcodes.io's autocomplete endpoint
  (`GET https://api.postcodes.io/postcodes/{query}/autocomplete?limit=10`),
  returns an array of matching postcode strings (e.g.
  `["BN44 3DD", "BN44 3TH", ...]`). Returns `[]` on no match.
- `resolvePostcode(postcode: string, signal: AbortSignal): Promise<{postcode: string, latitude: number, longitude: number}>`
  — calls `GET https://api.postcodes.io/postcodes/{postcode}` for the
  chosen suggestion's center coordinates.
- `computeBiasCenter(addresses: Array<{latitude: number, longitude: number}>): {latitude: number, longitude: number} | null`
  — returns `null` for an empty list (no bias). Otherwise returns a
  weighted center: the most-recently-added address (last element) counts
  double relative to the rest, so a driver's current working area pulls
  bias faster than the route's historical average.
- `searchAddresses(query: string, biasCenter: {latitude: number, longitude: number} | null, signal: AbortSignal): Promise<Array<{address, postcode, latitude, longitude, type}>>`
  — calls Nominatim exactly as today, but when `biasCenter` is non-null
  adds `viewbox=<lon-0.15>,<lat+0.15>,<lon+0.15>,<lat-0.15>&bounded=0` (a
  soft bias box roughly 10 miles across at UK latitudes — biases ranking
  without excluding results outside it). Returns the same suggestion shape
  `RoutePlanner.jsx` already consumes, so the calling component doesn't
  need to change how it renders results.

## Data flow

`RoutePlanner.jsx`'s existing debounced `useEffect` (lines 169-179) still
triggers on `currentAddress` changes, but its body now:

1. Creates a fresh `AbortController` for this search and aborts the
   previous one (stored in a `ref`) if it's still pending.
2. Calls `isPostcodeLike(currentAddress)`.
3. **If postcode-like**: calls `searchPostcodes`, and renders the returned
   postcode strings as a distinct suggestion type in the existing dropdown
   (visually tagged, e.g. a small postcode-pin icon, to distinguish from
   name-based results). Selecting one calls `resolvePostcode` and calls the
   existing `addAddress` with the resolved `{address: postcode, postcode,
   latitude, longitude, type: 'postcode'}` shape — no changes needed to
   `addAddress`, `removeAddress`, `moveAddress`, or downstream route logic.
4. **If name-like**: calls `computeBiasCenter(addresses)` (the component's
   existing `addresses` state) then `searchAddresses(query, biasCenter,
   signal)`, populating `addressSuggestions` exactly as today.
5. On abort, the fetch's rejection is caught and silently ignored (checked
   via `signal.aborted` or the error's `name === 'AbortError'`) — never
   shown to the user as a search failure.

## Error handling

- If postcodes.io errors or is unreachable (network failure, non-2xx
  response), the postcode-like branch falls back to calling
  `searchAddresses` with the raw query and no bias — so postcode typing
  still returns *something* via Nominatim rather than an empty dropdown.
- Nominatim failures behave exactly as today: `showError` with the existing
  message, suggestions cleared.
- Aborted requests are not errors and never trigger `showError`.

## Testing

`src/__tests__/addressSearch.test.ts` (new, following the existing
`payPeriodCalculations.test.ts` / `periodUtils.test.ts` pattern — plain
Vitest, no component rendering):

- `isPostcodeLike`: true for `"bn44"`, `"BN44"`, `"bn44 3dd"`,
  `"bn443dd"`, `"sw1a1aa"`; false for `"10 high street"`, `"the old
  bakery"`, `""`, `"123"` (a house number alone isn't postcode-shaped).
- `computeBiasCenter`: `null` for `[]`; returns the single point for a
  one-address list; for a multi-address list, confirms the returned point
  is closer to the last address than a straight unweighted average would
  be (verifies the "most recent counts double" weighting).
- `searchAddresses`'s URL-building: given a non-null bias center, the
  constructed URL includes `viewbox` and `bounded=0`; given `null`, it
  matches today's URL exactly (no `viewbox` param) — a direct regression
  guard against changing first-stop behavior.
- Network calls (`fetch`) are mocked in these tests — no real requests to
  Nominatim or postcodes.io during the test run.
- Manual verification: real dev server, testing the exact scenarios from
  the bug report — typing a partial postcode and confirming autocomplete
  suggestions appear, adding two addresses in the same postcode area and
  confirming a subsequent name search prioritizes that area, and rapid
  typing to confirm no stale-result flicker.
- Existing test suite (30 tests) must stay green throughout.
