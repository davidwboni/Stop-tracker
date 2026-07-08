# UI Redesign — Phase 1: Dashboard + Entries

## Background

Phase 0 (already shipped) established a warm, restrained visual foundation —
CSS-variable color tokens, a teal accent, `<Money>`/`<StatusBadge>` shared
components — and applied it to the Invoice tab. This phase (1) extends that
foundation to the Dashboard tab and the Entries tab: five files
(`SimpleDashboard.jsx`, `StopEntryForm.jsx`, `FloatingActionButton.jsx`,
`EntriesPage.jsx`, `EntriesList.jsx`), all still on the pre-redesign look.

While reviewing these screens for the redesign, a real data-correctness bug
was found: `StopEntryForm.jsx` (the main "Log Entry" card embedded in the
Dashboard) computes earnings from its own disconnected rate
(`localStorage.getItem('rate-per-stop')`, defaulting to a flat £1.90/stop)
instead of the app's actual tiered `paymentConfig`. The floating action
button's handler (`Layout.jsx`) was already fixed to use the shared
`calculateStopFee` during earlier work; `StopEntryForm.jsx` was not. Result:
logging the same stop count through the two different entry points on the
same day produces two different saved totals. This phase fixes that as part
of touching the file for the retheme.

## Goals

- Fix `StopEntryForm.jsx` to compute earnings via `calculateStopFee` +
  `paymentConfig` (from `useData()`), matching `Layout.jsx`'s already-correct
  pattern — so the Dashboard form and the floating action button always
  agree on the total for the same stop count.
- Apply the Phase 0 visual tokens to all five files. `SimpleDashboard.jsx`
  already uses the shared `Card` primitive, so most of it updates for free
  from the token change alone — remaining manual work there is swapping raw
  `£{x.toFixed(2)}` spans for `<Money>` and using the shared `Button` for its
  two quick-action buttons (currently raw `bg-primary/10`/`bg-secondary/10`
  divs).
- `StopEntryForm.jsx` and `FloatingActionButton.jsx` hardcode colors/gradients
  directly (not via the shared primitives) and need a real per-component
  retheme: new tokens, `<Money>` for all amount displays, consistent radius.
- `EntriesList.jsx`'s three summary cards (7-day / 28-day / 30-day) currently
  use full vivid gradient backgrounds (blue→indigo, purple→pink,
  emerald→cyan) — the strongest surviving instance of the old "2.0" style.
  Convert these to the same muted `Card` style used everywhere else, with a
  small colored icon accent instead of a full gradient wash, and `<Money>`
  for the £ figures.
- `EntriesPage.jsx`'s header banner (currently a vivid blue→indigo→purple
  gradient block) and filter card (`border-2 border-blue-100`) get the same
  muted-card treatment; its per-entry rows in `EntriesList.jsx` (currently
  `hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50`) simplify to
  a single consistent hover state matching the Invoice tab's row style.

## Non-goals

- No change to `FloatingActionButton.jsx`'s behavior or its status as a
  separate entry point from `StopEntryForm.jsx` — both stay, now
  calculation-consistent and visually consistent, not merged into one
  component.
- No new entry-adding capability on `EntriesPage.jsx` itself (it remains
  search/filter/export of existing entries only) — out of scope, not
  requested.
- `EntriesList.jsx`'s CSV export, sorting, and pagination logic are
  unchanged — presentation only.
- No change to the bottom navigation (6 tabs) — flagged in the original
  Phase 0 spec as a possible Phase 3 item, not this one.

## The correctness fix, precisely

Current (`StopEntryForm.jsx`):
```js
const [rate, setRate] = useState(1.90);
useEffect(() => {
  const savedRate = localStorage.getItem('rate-per-stop');
  if (savedRate) setRate(parseFloat(savedRate));
}, []);
// ...
const earnings = (stopsNum * rate) + extraNum;
```

New: read `paymentConfig` from `useData()` (already the pattern in
`Layout.jsx` and `QuickEntry.jsx`), call
`calculateStopFee(stopsNum, paymentConfig.thresholds) + extraNum` from
`src/features/payperiod/payPeriodCalculations.ts`. Remove the `rate` state,
the `localStorage.getItem('rate-per-stop')` effect, and the `rate` prop
threaded through `calculateEstimatedEarnings`/`handleFormSubmit` entirely —
this is a straight swap, not an additive change, so the old disconnected
rate can never silently resurface.

## Testing / verification

- No calculation logic changes outside the `StopEntryForm.jsx` fix; that fix
  reuses the already-tested `calculateStopFee` (20 existing tests covering
  it) rather than introducing new logic — no new automated tests needed for
  it specifically.
- Manual verification: log the same stop count (e.g. 176) through both
  `StopEntryForm.jsx` and the floating action button and confirm they now
  produce the identical total (£315.48, the same real-DPD-data figure
  already verified in Phase 0's Task 1).
- Manual verification of the retheme: dev server, light and dark mode, all
  five files.
- Existing 30-test suite must stay green throughout.
