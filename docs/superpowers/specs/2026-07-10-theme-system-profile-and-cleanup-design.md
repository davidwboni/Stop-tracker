# Theme System + Profile Retheme + Small Cleanup — Design Spec

## Background

Follow-up work after a status check revealed the UI redesign never touched
every screen: Home/Entries/Invoice got a real retheme across earlier phases,
but Profile was never touched at all, and Stats/Routes only looked
consistent by coincidence (they were already close to the new tokens before
this initiative started). This spec covers two independent pieces bundled
into one implementation pass:

1. **Theme system**: `ThemeContext.js` currently hardcodes dark mode with a
   no-op toggle ("we always stay in dark mode") — a deliberate prior choice,
   not a bug. The ask now is to make it a real system: auto-detect the
   OS/browser's `prefers-color-scheme`, with a manual override.
2. **Profile retheme + small chores**: `Profile.js` never got the Phase
   0/1 token treatment and still references two Tailwind classes
   (`shadow-apple-card`, `shadow-apple-button`) that were deleted from
   `tailwind.config.js` back in Phase 0 — they've silently resolved to
   nothing (no shadow) ever since. Plus two small, already-scoped touch-ups
   (`StopEntryForm.jsx`'s 2 leftover blue spots, `WeeklyStats.jsx`'s 3 raw
   money spans) and a batch of confirmed-dead files.

## Goals

**Theme system:**
- On first load (no stored preference), the app matches the OS/browser's
  `prefers-color-scheme` automatically.
- A 3-way control — System / Light / Dark — lives in Profile's "Account
  Settings" card, replacing the current fake "Subscription Plan" (Pro/Free)
  placeholder row (a static, non-functional stub with no backing logic —
  removed as part of this same retheme since it does nothing today; not
  scope creep, this row was already going to be visually rethemed).
- If set to "System," the app reacts live if the OS setting changes while
  the app is open (e.g. the OS auto-switches to dark mode at sunset).
- The choice persists in `localStorage` (`theme-preference`, one of
  `"system" | "light" | "dark"`) — a device display preference, not synced
  via Firestore (no stated need to sync a display preference across
  devices).

**Profile retheme:**
- Replace every hardcoded gradient/color in `Profile.js` with the
  established tokens (`bg-primary`, `text-muted-foreground`, `bg-card`,
  `bg-muted`, `border-border`, and the semantic
  `bg-emerald-500/10`/`bg-destructive/10` success/error pattern), matching
  the convention from every prior phase.
- Fix the two dead-class references (`shadow-apple-card`,
  `shadow-apple-button`) by replacing them with a real, current shadow
  token (`shadow-sm`), restoring the visual depth that's been silently
  missing since Phase 0.
- Convert the Achievement cards from vivid blue/gray gradient badges to the
  muted `Card` style with an icon accent, same conversion pattern used for
  `EntriesList.jsx`'s summary cards in Phase 1.
- Convert the "Upgrade to Pro" demo-account card similarly (muted style,
  not a vivid emerald/cyan gradient).
- Replace raw `<Button className="bg-blue-500...">` overrides with the
  shared `Button`'s own default primary styling (no override needed).

**Small chores:**
- `StopEntryForm.jsx`: the sync-status text (`text-blue-600`, line 449) and
  the "View All" link (`text-blue-600 dark:text-blue-400`, line 755) both
  become `text-primary`.
- `WeeklyStats.jsx`: the 3 raw `£{x.toFixed(2)}` spans (lines 203, 240,
  274) become `<Money>`; the `rounded-lg` stat tiles/daily-breakdown rows
  (lines 174, 197, 220, 234, 261) become `rounded-[14px]`; the two
  `text-green-500` trend-arrow colors (lines 184, 207) become
  `text-emerald-500`, matching the established semantic-positive convention.
- Delete confirmed-dead files: `AppFooter.jsx` (shadowed by the live
  `AppFooter.js`, which wins under Create React App's module resolution
  order — confirmed distinct content, `.jsx` even references the same dead
  `shadow-apple-button` class, confirming it's the stale one),
  `LandingPage.jsx` (same shadowing pattern, `.js` is live), `ThemeProvider.js`
  and `ThemeProvider.jsx` (both completely unimported anywhere — unrelated
  dead code, distinct from the live `ThemeContext.js`), `setupTests.js` (an
  empty leftover CRA-scaffold file; `vitest.config.js` points at
  `setupTests.ts` by explicit path, so there's no resolution ambiguity here,
  just clutter), `QuickEntry.jsx` (zero importers, confirmed dead in an
  earlier session), `PaymentConfig.jsx` + `PaymentConfig.old.js` +
  `StopTracker.js` (a fully dead chain: `StopTracker.js` has zero
  importers anywhere, `PaymentConfig.jsx` is only ever rendered from inside
  that dead file, and `PaymentConfig.old.js` isn't resolved by any import at
  all given its `.old.js` suffix) — plus the now-orphaned
  `import PaymentConfig from '../components/PaymentConfig';` at
  `router/index.js:14`, which becomes unused once the file is deleted.

## Non-goals

- No changes to Profile's actual data logic: profile-picture upload,
  display-name/bio editing, Firestore read/write calls, data export, or the
  achievement-unlock logic itself (still the same 4 hardcoded achievements)
  — presentation and the new theme control only.
- No cross-device sync of the theme preference — device-local via
  `localStorage`, matching how most apps treat display preferences.
- No changes to `RoutePlanner.jsx` — confirmed via direct grep that its
  only remaining `text-blue-600` is the intentional Google-Maps nav-icon
  brand color, already decided to stay as-is in an earlier phase. Nothing
  to touch there.
- No changes to the bottom navigation (6-tab bar) — still out of scope,
  as flagged (and deferred) all the way back in the original Phase 0 spec.
- No attempt to reconstruct or salvage anything from the deleted dead
  files — they're confirmed unreferenced; deletion is a straight removal,
  not a merge/migration.

## Testing / Verification

- No automated tests apply to the theme system or Profile retheme (pure
  UI/context work, matching the no-test-file precedent for
  `RouteMap.jsx`/`AddressMiniMap.jsx`) — verified manually via the dev
  server: toggle the OS/browser's color-scheme emulation and confirm the
  app follows it when set to "System"; select "Light"/"Dark" explicitly and
  confirm it sticks across a page reload; confirm the Profile page renders
  correctly in both resolved themes with real shadows now visible on the
  Achievements card.
- The dead-file deletions are verified by running the existing 61-test
  suite (must stay green — none of the deleted files are imported by
  anything, so removing them should have zero effect) plus a dev-server
  boot check (the app must still start and render normally after each
  deletion, confirming no hidden import was missed).
