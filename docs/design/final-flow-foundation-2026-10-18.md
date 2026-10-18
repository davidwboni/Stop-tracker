# Stop Tracker – Final driver-first experience (approved foundation)

Approved 18 October 2026 after review of Android walkthrough 137392.mp4. This is the stable product reference for subsequent screen passes. **Do not silently alter accounting or remove existing features in a visual refactor.**

## Driver journey (the primary measure of success)
1. Home → Log your day (once, with editable work record).
2. Home/Pay → Four-week expected contractor payout; status is **estimated** until checked.
3. Pay → Contractor statement PDF/photo AI extraction (Pro/trial) **or** free manual comparison.
4. Check a statement → Review all days, extra payments, contractor deductions and VAT/tax basis; confirm or explain discrepancies. No automated acceptance of a mismatch.
5. **Looks good** → Create invoice using the verified agreed amount, pay-period dates, saved business and saved contractor billing address; review tax and recipient.
6. **Send invoice** via device email sharing for now; delivery status is **not confirmed**. Save an immutable PDF-capable invoice record to Records. Reshare without generating a duplicate invoice.
7. Records stores Work, Expenses and Documents; it's an archive, not a required stop in the payment flow.

## Shared UI design rules
- Home/Records/Pay/Routes/Expenses use a single 44px round profile shortcut with user photo or stable initials. Same position, look, label, focus state and destination.
- Visibility eye precedes profile only on screens displaying private monetary figures.
- Four primary tabs only: Home / Records / Pay / Routes.
- One obvious primary action per task; secondary links and optional fields must not compete.
- App shell alone reserves space for fixed bottom navigation + safe area. Individual pages do not add duplicate bottom padding.
- Every tappable control at least 44px; keyboard-safe sheets; do not leave the user trapped by a dirty draft.
- Dark navy/graphite background; slate cards; purple interactive focus and primary actions; green positive verified figures; amber discrepancies; red failures; blue routes. Color alone never conveys status. Reduced motion supported.
- Never show a checked statement as **Paid**, or email sharing as **Delivered** without independent evidence.
- Loading, offline, permission and sync-error states must not show deceptive zeros or success.

## Screen acceptance states
### Home
- Greeting and date; one shared profile + privacy control.
- Today: earnings, basic counts and **Log your day** / **View today's record**.
- Current four-week period: estimated payout + stage-aware CTA, not a prematurely finalised payment.
- 2–3 recent work rows, tap to view. One compact **Expenses** row below.
- No duplicated quick-tools footer or redundant Back to Home links.

### Log your day
- Today selected. Stop count, total parcels, automatically derived excess. Extra work only if toggled.
- Saved pay structure determines estimate; per-stop/per-day/hour/per-mile models remain supported.
- No mandatory notes, categories or secondary details. Save status accurate for offline.
- Prevent duplicate day overwrites and preserve pay history. Show a clear edit/view path after save.

### Records
- Work / Expenses / Documents in one tab bar. Work date rows and pagination; optional search.
- Personal expenses: amount required; description optional; date defaults today. AI scan separate, server-entitled, extract → edit → confirm.
- Statements and invoices in one Documents view, direct PDF access, not another nested tab.

### Pay
- Four-week period picker with accessible mobile bottom sheet and completed-period shortcut.
- Stage determines single next action. A previously checked period should not show duplicate manual/AI cards by default.
- Difference must be reviewed before invoice. Explicitly accepted discrepancy may be invoiced at the agreed checked amount.
- Statement fingerprint updates should not be invalidated by unrelated personal expenses.

### Invoice
- Reuse default contractor, sender details, period and checked amount. Review VAT/tax treatment and billing recipient.
- Primary device action **Send invoice** with PDF attachment; download secondary. Web Share/mailto handoff does not certify delivery.
- Duplicate invoice guard; persisted invoice record and ability to resend after cancelled sharing.

### Routes
- Each location appears as an ordered marker; fit bounds on add/remove; route stays intact if optimization unavailable.
- Optional recent addresses stored in account-scoped device storage, clearable. Pro/trial entitlement validated server-side.

## Security and release gate (not yet fully certified)
- Confirm no cross-account data via Firestore/Storage emulator tests, including profile photo, receipts and every collection.
- Verify Firebase Functions deployments and server-side entitlement checks. Current AI status/route optimisation incidents remain open; client Pro labels must never be trusted alone.
- AI must not store personal statement files by default; extraction values always reviewed, size/type limited, logs scrubbed of personal/account numbers.
- Invoice number uniqueness and atomic storage; idempotent sends once a real email provider is integrated.
- Accessibility mobile review: 320/360/390/430 px plus tablet/desktop; keyboard focus, headings, contrast, reduced motion, voice labels.
- All Vitest unit/UI tests, Functions tests, syntax preflight, genuine build-output verification, real Vercel READY plus compiled-success log, domain alias check, manual Android smoke test before calling a release final.

## Implementation phases
1. Shared header, footer clearance, Home simplification (this branch).
2. Day entry/editor + sheet review and regression tests.
3. Records/Pay/Invoice end-to-end navigation and error-state pass.
4. Routes, Profile, onboarding visual/system pass.
5. Backend Firebase entitlement and security audit, device testing, final release.
