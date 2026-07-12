# Pre-Launch Punch-List (before Google Play)

**Date:** 2026-07-12
**Source:** David's full first-run walkthrough as a guest.

## A. Bugs & onboarding correctness (broken first-run — do first)

1. **PDF interpretation fails** — uploading a rate-sheet PDF takes >30s and returns
   "The interpreter returned an unexpected format. Please reword and try again."
   Likely the sliding-scale matrix output exceeds `max_tokens` / isn't clean JSON.
   Fix: raise output cap, use structured JSON output, robust parse, real loading state.
2. **Onboarding is dismissible** — clicking outside the form or reloading drops the
   "describe how you get paid" prompt and it never re-shows. Make it a **freeze**:
   non-dismissible, and survives reload (re-prompt until pay is actually set up).
3. **Guest can't submit to AI** — investigate whether guests have a Firebase auth token
   (the callable requires `request.auth`). Guests must be able to use the AI setup.
4. **Tutorial never shows for guests** — gated to `logs ≤ 1`, but guests get 3 demo logs,
   so it's skipped. It should show for first-time/guest users.
5. **Em-dash copy** — the "—" reads oddly ("log your day — we'll do the maths"); appears
   in several places. Replace em-dashes in user-facing copy with plain punctuation.

## B. Quick UX wins

6. **One-tap guest** — "Try demo" then "Continue as guest" is two steps. Make it one:
   "Try as guest" signs in as guest immediately.
7. **Remove the Pro gate (for now)** — as a guest you can't see Invoices, and "Upgrade to
   Pro" does nothing. Remove the gate so everything is visible; park monetisation for later.
8. **AI replies in the user's language** — if they describe their pay in another language,
   the summary/confirmation should come back in that same language (feels personal).
9. **Stats trim** — rename "Weekly Statistics" → "Weekly Stats"; the header box is too tall
   with dead space before the week; shrink to ~one line + a small subtitle.
10. **Stats clickable cards** — Total Stops → Entries; Total Earnings → (leave as is / Stats).
11. **Pay Structure on Home** — add a quick "Pay Structure" link on the dashboard, near
    "Manage Invoices" / under Weekly Stats, for fast rate changes.

## C. Screen redesigns (UI-specialist pass)

12. **Profile redesign** — currently shifted right / poor sizing. Photo at the very top
    (above the name); "Free user / Pro user" label; "Sign in with Google" prompt for guests;
    de-dupe the two near-identical "Manage account / Settings" + "…/ Achievements" sections
    into one; grey-out/de-emphasise Achievements; move **Account Settings + Pay Structure**
    to the top (most important); keep **Delete Account** + **Sign Out**; remove **Export data**.
13. **Invoice tab** — remove Pro gate first (item 7), then: round the square top buttons to
    match the app; do a proper UI pass. (Deferred to near-last once visible.)
14. **Per-tab contextual tutorials** — not one big tour. Each tab gets a short, in-context
    coach hint on what it does and how to use it (Home, Entries, Routes, Invoice, Stats,
    Profile). Include a note that you can **swipe left/right** between tabs.
15. **Swipe affordance** — nothing signals the swipe gesture. Add a subtle sliding-motion
    hint (e.g. a peek/nudge or edge indicator) so users discover it.
16. **Animations throughout** — tab transitions and small motion so the app feels fluid and
    professional, not static.
17. **Entries keyboard scroll** — sometimes when focused low on the screen it doesn't scroll
    the input up above the keyboard; make it reliably scroll into view.

## D. Big features (parked — need keys/accounts/decisions)

18. **Routes → Google Places** — integrate Google address search + a PlaceMaker-style cache
    into the route planner (replaces/augments Nominatim). **Needs a Google API key.**
19. **iOS** — app-store-appropriate landing/feel (not a web page); build iOS structure.
    David is ready to buy an Apple developer account when we reach this.
20. **Landing page** — for App Store, feel like an app landing, not a web page; possibly a
    short showcase video (discuss later).
21. **Notifications** — later (limited on web).

## Background
- **UI audit** — a UI-specialist pass checking colour/appearance, alignment, overflow, and
  real usability across tabs, in both light and dark.
