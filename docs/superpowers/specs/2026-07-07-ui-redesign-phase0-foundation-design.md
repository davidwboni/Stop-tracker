# UI Redesign — Phase 0: Design Foundation

## Background

Stop Tracker's UI has accumulated two competing visual languages across its
lifetime: a restrained, bordered-card style (`InvoiceGeneratorNew.jsx`,
`RoutePlanner.jsx`, and the new pay-period reconciliation screens) built on
the app's shared `ui/*` primitives, and a bolder, gradient-heavy "2.0" style
(`InvoiceCompare.jsx`) built with raw, ad-hoc Tailwind classes bypassing
those primitives. `tailwind.config.js` also carries a full 7-family "Apple
design system" color palette that is largely unused in practice.

This is Phase 0 of a broader UI redesign, scoped deliberately small: it
establishes one consistent visual foundation (tokens, two shared display
components, and retheming of the shared primitives) and applies it to the
Invoice tab (Create / History / Reconcile) — the newest and most
money-critical part of the app, and the one most recently built out with
the pay-period reconciliation feature. It does not touch every screen; that
is explicitly later phases (see Out of scope).

## Direction (approved via visual mockups)

A restrained, "data-forward" style — closer to Stripe/Linear than either of
the app's two existing styles — but warmed up to stay consumer-friendly per
explicit user feedback: rounder corners (not sharp), a warm teal accent (not
stark blue-on-black only), status shown as soft pill badges (not bare
colored text or emoji), and money amounts rendered with tabular numerals so
they visually align like a real statement. Supports both light and dark
mode, matching the app's existing theme toggle.

## Goals

- Replace the unused 7-family Apple color palette with a small, purposeful
  token set layered on the app's *existing* CSS-variable theming system
  (`background`, `card`, `primary`, `muted`, `accent`, `destructive`,
  `border` — already wired into `ui/*` components, just never given
  values matching this direction).
- Standardize on one corner-radius scale (18px cards, 14px
  buttons/inputs) instead of the three currently in ad-hoc use (Apple's
  10px/20px, the "2.0" style's 16px, and the shared primitives' default).
- Give every money amount in the app the same visual treatment
  (tabular numerals, consistent `£X.XX` formatting) via one shared
  component, instead of four different ad-hoc formatting patterns
  (`InvoiceGeneratorNew.jsx`, `PayPeriodResults.jsx`, `InvoiceCompare.jsx`,
  and Stats screens each format money slightly differently today).
- Give every match/mismatch/status indicator the same visual treatment
  (soft pill badge) via one shared component, instead of the inline
  colored-text/emoji patterns currently scattered across the Invoice tab.
- Retheme the shared primitives (`ui/card.jsx`, `ui/button.jsx`,
  `ui/input.jsx`, `ui/alert.jsx`, `ui/tabs.jsx`) once, so every screen
  already built on them (most of the Invoice tab, `RoutePlanner.jsx`)
  inherits the new look with no per-screen changes required.
- Migrate the one Invoice-tab screen NOT built on the shared primitives
  (`InvoiceCompare.jsx` — actually, per the pay-period reconciliation work,
  this is now `PayPeriodList.jsx`/`PayPeriodForm.jsx`/`PayPeriodResults.jsx`,
  which already used the shared primitives when built) onto the new
  `<Money>`/`<StatusBadge>` components specifically, since those are new
  in this phase.

## Design tokens

CSS variables (defined wherever the app's existing `background`/`card`/etc.
variables are currently defined — likely `src/index.css` or equivalent;
locate and confirm during planning) get concrete values:

**Light mode:**
- `--background`: `#fafafa`
- `--card`: `#ffffff`
- `--card-foreground` / `--foreground`: near-black (`#111113` or similar,
  matching existing dark-mode-background for consistency)
- `--primary` / `--accent`: `#0d9488` (teal)
- `--muted`: light gray (`#f3f4f6` family)
- `--muted-foreground`: `#9ca3af`
- `--border`: `#eeeeee`
- `--destructive`: existing red, unchanged
- Status colors (new, not part of the existing CSS-variable set — add as
  new variables or a small status-color utility): match/success
  `bg-green-100 text-green-700` (light) / `bg-green-900 text-green-400`
  (dark); mismatch/warning `bg-amber-100 text-amber-700` /
  `bg-amber-900 text-amber-400`.

**Dark mode:**
- `--background`: `#111113`
- `--card`: `#1c1c1f`
- `--foreground`: `#e5e5e5` / `#ffffff` for emphasis
- `--primary` / `--accent`: `#2dd4bf` (lighter teal, for contrast on dark)
- `--border`: `#2a2a2e`

**Radius:** one Tailwind config value, `18px` for `rounded-card` (or
override the default `rounded-2xl` usage in `ui/card.jsx`), `14px` for
`rounded-button`/`rounded-input`.

**Remove:** the `apple-blue`/`apple-indigo`/`apple-purple`/`apple-green`/
`apple-yellow`/`apple-orange`/`apple-red`/`apple-gray` color families and
the `apple`/`apple-lg`/`apple-full` radius/shadow tokens from
`tailwind.config.js` — confirmed unused via a repo-wide search before
removal (verify again during planning, in case something references them
that wasn't visible during this brainstorm).

**Typography:** no change to the font stack (SF/system font already
correctly configured). Add tabular-numeral treatment via the `<Money>`
component (see below), not a global CSS rule, to avoid affecting non-money
numeric content.

## New shared components

**`<Money amount={number} className? />`** — renders `£{amount.toFixed(2)}`
with `font-variant-numeric: tabular-nums` applied. Replaces manual
`£{x.toFixed(2)}` string interpolation everywhere a money amount is
displayed within the Invoice tab's three screens
(`InvoiceGeneratorNew.jsx`, `InvoiceHistory.jsx` if it displays amounts,
`PayPeriodResults.jsx`). Location: `src/components/ui/money.jsx` (co-located
with the other shared primitives, since it's a generic display component,
not payperiod-specific).

**`<StatusBadge status="match" | "mismatch" | "missing-from-log" |
"missing-from-statement" />`** — renders a soft pill badge with the
appropriate color pairing and label text (reusing the exact status values
`comparePeriodToLogs` already produces, so `PayPeriodResults.jsx` can pass
its comparison result's `status` field straight through with no mapping
layer). Location: `src/components/ui/status-badge.jsx`.

## Retheming the shared primitives

`ui/card.jsx`, `ui/button.jsx`, `ui/input.jsx`, `ui/alert.jsx`,
`ui/tabs.jsx`: update their default Tailwind classes to use the new radius
values and confirm they read `bg-card`/`text-foreground`/`border-border`/
etc. (the CSS-variable-driven classes) rather than any hardcoded colors,
so the token change above is sufficient to reskin them without touching
each file's structural JSX.

## Screens affected in this phase

`InvoicePage.jsx` and its three tabs: `InvoiceGeneratorNew.jsx` (Create),
`InvoiceHistory.jsx` (History), and the pay-period reconciliation flow
(`PayPeriodList.jsx`, `PayPeriodForm.jsx`, `PayPeriodResults.jsx`). These
already use the shared primitives, so most of the visual change comes for
free from the token change; explicit work is needed only to swap in
`<Money>`/`<StatusBadge>` where amounts/statuses are currently rendered
with ad-hoc markup.

## Out of scope (later phases)

- **Phase 1**: Dashboard (`SimpleDashboard.jsx`) + Entries
  (`EntriesPage.jsx`/`StopEntryForm.jsx`), including unifying the two
  separate "log today's stops" entry points (the floating action button's
  `Layout.jsx` handler vs. the Entries tab's `StopEntryForm.jsx`) — a
  combined UX + code-cleanup fix, tracked alongside the existing
  `StopEntryForm.jsx`/`PaymentConfig.jsx` cleanup follow-up task.
- **Phase 2**: Routes (`RoutePlanner.jsx`/`RouteMap.jsx`) + Stats.
- **Phase 3**: Profile/Settings (`PaymentSettings.jsx`, `Profile.js`), and
  reconsidering the 6-item bottom navigation (possibly consolidating Stats
  into Dashboard/Profile) once the visual foundation is proven across the
  app.
- Removing the "Apple design system" tokens from `tailwind.config.js` is
  in scope for *this* phase (Design tokens section above), but any
  further dead-code cleanup in components (e.g., `InvoiceComparison.jsx`,
  already known dead code) is not.
- No visual regression test infrastructure is proposed — verification is
  manual (dev server, both light and dark mode, compared against the
  approved mockups) plus the existing 30 automated tests (logic-only,
  unaffected by this phase) staying green.

## Testing / verification

- Existing automated test suite (30 tests, `payPeriodCalculations` +
  `periodUtils`) must stay green — this phase touches no calculation
  logic, only presentation.
- Manual verification: run the dev server, view each of the three Invoice
  tab screens in both light and dark mode, compare against the approved
  mockup direction (rounded 18px cards, teal accent, tabular money,
  pill status badges).
