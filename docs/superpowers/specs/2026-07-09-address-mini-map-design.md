# Address Mini-Map Preview — Design Spec

## Background

Sub-project C of the original route-planner improvement request. Sub-projects
A (address-search reliability) and B (address memory) are shipped. This is
the last piece: a small inline map preview so a driver can confirm exactly
where a stop is pinned, without leaving the "Stops" list or scrolling up to
the shared route map. Named after the Royal Mail postcode-finder UX pattern
that inspired it.

## Goals

- Clicking an address already in the "Stops" list (`RoutePlanner.jsx`)
  expands that row inline to reveal a small (~160px), interactive Leaflet
  map centered on that one stop's coordinates, with a single marker — no
  route line, no numbering, just "here is exactly where this pin sits."
  Clicking the same address again collapses it.
- Reuse the app's existing Leaflet/OpenStreetMap dependency (already used by
  `RouteMap.jsx` for the full-route map) rather than adding a new static-map
  image service — no new external dependency, and the preview stays
  interactive (drivers can pan/zoom slightly to check the surrounding area).
- Accordion behavior: only one stop's mini-map is expanded at a time.
  Clicking a different stop collapses whichever was previously open. This
  keeps at most one real Leaflet map instance mounted at once (simpler,
  cheaper than allowing many simultaneously).

## Non-goals

- No changes to `RouteMap.jsx` (the existing full-route map with numbered
  markers and the route polyline) — untouched.
- No mini-map preview in the address-search suggestions dropdown (postcode,
  name-search, or frequent-address suggestions) — confirmed stops-list-only
  for this pass; previewing a result before adding it was considered and
  explicitly deferred.
- No changes to the existing reorder (`moveAddress`) or delete
  (`removeAddress`) buttons on each stop row.
- No navigation/deep-link behavior added to the mini-map itself (tapping the
  map doesn't open Google Maps, etc.) — it's a passive preview only; the
  existing "Start Navigation" flow elsewhere in `RoutePlanner.jsx` already
  covers turn-by-turn handoff.

## Architecture

**New file: `src/components/AddressMiniMap.jsx`** — a small, self-contained
component. Props: `{ latitude: number, longitude: number, address: string }`.
Renders a Leaflet `MapContainer` (via `react-leaflet`, already a project
dependency) roughly 160px tall, centered on `[latitude, longitude]` at a
street-level zoom (e.g. 16), with a single default Leaflet marker (no custom
numbered icon needed — there's only ever one pin per instance) and a
`Popup`/tooltip showing the `address` string, matching the interaction
pattern `RouteMap.jsx` already uses for its own markers' popups.

Leaflet's default marker icon needs the same one-time fix `RouteMap.jsx`
already applies (`delete L.Icon.Default.prototype._getIconUrl` +
`L.Icon.Default.mergeOptions({...cdnjs marker URLs...})`) — this component
duplicates that small fix rather than introducing a shared util for five
lines; calling it from two components is harmless since it only reassigns
static, idempotent icon options.

**Modify: `src/components/RoutePlanner.jsx`** — the "Stops" list's per-row
rendering. Add one new piece of state, `expandedAddressId`, tracking which
stop (if any) is currently expanded. Clicking a stop's address text toggles
it (same id → collapse to `null`; different id → replace, so only one is
ever open). A small chevron icon next to the address text indicates
expand/collapsed state. When a row's id matches `expandedAddressId`, render
`<AddressMiniMap>` beneath it, animated in/out with the same Framer Motion
expand pattern already used elsewhere in this file (e.g. the existing
`showNavOptions` expand/collapse).

## Testing / Verification

- No automated tests — this is a pure UI/map-rendering feature with no
  underlying logic to unit-test (matching `RouteMap.jsx` itself, which also
  has no test file in this codebase).
- Manual verification via the dev server: add 2-3 stops, click the first
  one's address, confirm a small map appears beneath it centered correctly
  on that stop with a marker and address popup; click a second stop's
  address and confirm the first one's map collapses while the second
  expands (accordion behavior, not both open); click the second stop again
  and confirm it collapses back to nothing expanded; confirm the existing
  reorder/delete buttons on each row still work unaffected by the new click
  target.
- Existing 61-test suite (`payPeriodCalculations` + `periodUtils` +
  `addressSearch` + `addressMemory`) must stay green throughout — no
  changes to those modules.
