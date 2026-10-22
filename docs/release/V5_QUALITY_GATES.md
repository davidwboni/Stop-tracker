# Stop Tracker V5 – release gates and rollout audit (2026-10-22)

**Product contract**: log work once → upload contractor statement once → AI compares matching dates/stops/parcels/charges and VAT basis where data exists → show material differences, uncertain entries separately → driver approves → create the invoice using contractor-confirmed figures (or archive an existing self-billed invoice). The first-time user must understand this without coaching.

## Verified in repository, not yet a completed end-to-end release audit

- Firebase Auth / Firestore owner-scoped rules: baseline owner UID checks present. **Production Firestore rules deployment and emulator attack tests still to verify**; a rule in Git is not evidence the rules are deployed.
- Storage owner-scoped rules and type/size limits for receipts and profile uploads exist. **Production deployment and emulator access-denial tests outstanding**.
- Entitlements and free AI quotas enforced by callable Functions and read-only client entitlements. **Full abuse/quotas/rate-limit and replay checks outstanding**.
- Pay uses immutable historic-rate snapshots and explicit driver-confirmed recovery for missing fee records. Do not silently reprice history.
- Current period screen still assumes four-week periods; **variable invoice date ranges are not yet implemented**.
- AI autoCheck presently matches **daily stops and daily gross figures** when present. Parcel mismatches, extra work, charge/receipt reconciliation, fuel-card discounts and likely duplicates **are not yet complete** and must not be described as checked.
- Statement summary-only output cannot prove daily matches; explicitly disclose coverage and uncertainty.
- Light/dark theme toggle exists. **Cross-screen contrast, focus, legibility, and visual parity need device testing**.
- PWA/Android mobile: responsive layouts and safe-area CSS exist. **Real Android/iOS browsers, keyboard, touch, scroll, dialogs, offline and reduced-motion still require final hands-on tests**.
- Google routing, AI receipt reading, Stripe entitlement/checkout, invoice recipient/send status each require separate live workflow validation.

## V5 rollout order and acceptance criteria

1. **Pay entry (current release slice)**: upload AI statement directly from Pay home; automatic scan begins on file selection, without redundant manual/AI choice or second 'Read statement' tap. Manual path always available when AI fails. Never auto-confirm or send.
2. **Statement date matching**: derive date range from statement, search saved workdays within exactly that range, resolve mismatched/ambiguous dates with one targeted question. No universal 28-day requirement.
3. **Smart checking**: show what was compared (summary vs day-by-day), compare stops/parcels/gross/extras per day, fee model at each historic date; check contractor deductions/receipts and discounted fuel against actual charged amounts. Keep unknowns explicit; duplicate-stop differences require driver review.
4. **One results screen**: expected vs statement on matched before-VAT basis; only material differences and unknowns accessible. No charge checkboxes for items already matched with trustworthy evidence.
5. **Complete action**: approve or accept documented discrepancies, invoice from contractor-confirmed figures (not inferred tracker earnings), prefill saved contractor, preview then send/share; self-billed driver may archive and finish.
6. **Onboarding/import**: conversational pay interpreter + confirmation; optional historical records upload and validated import; no fabricated rates.
7. **Design system**: one header/profile placement, one bottom nav, consistent page gutters and mobile safe areas; typography/icon inventory; dark/light contrast AA; reduced motion. Purple/indigo as a restrained action accent is not inherently gender-specific; test comprehension rather than gender assumptions.
8. **Security/reliability**: validate Firebase Firestore/Storage deployment rules and cross-user negative tests, secret isolation, entitlement bypass and callback cost limits, invoice ownership, upload limits, Stripe webhook verification/idempotency, privacy/retention, error boundaries, rollbacks.
9. **Release test**: new driver signs up, sets rate, logs 3+ days, uploads statement with intentional stop/parcel/charge mismatch, identifies issue, confirms correct VAT basis, generates and sends or archives invoice on Android/mobile Safari and desktop. Test fresh account and older records.

**Definition of done**: Automated green checks + browser/device acceptance walkthrough + production deployment READY + actual driver workflow completion. Passing unit tests alone is **not** sufficient to call all of V5 ready.

No live financial data should be modified by a migration without backup, reconciliation and driver consent.
