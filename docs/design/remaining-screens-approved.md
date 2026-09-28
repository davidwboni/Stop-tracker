# Stop Tracker — remaining screen specification

Status: user authorised implementation of the remaining redesign together. This supersedes the earlier per-screen approval pauses, including `statement-comparison-proposed.md`. Existing Home, Quick Entry, Expenses, Pay Structure and Statement Review specifications remain in force.

## Shared experience

Five bottom destinations only: Home, Routes, Documents, Check Pay, Money. Profile is reached from Home. Money holds Overview, Expenses and Insights. Work records and pay periods are secondary destinations.

Graphite/navy surfaces, indigo primary actions, green positive money, amber differences, red failures and blue route pins. Both theme variants use foreground/card/border tokens. Main content is bounded to 680–900px; Routes uses up to 1100px with a side-by-side map at desktop widths. Forms use 16px input text, ordinary browser date/file inputs, labelled controls and practical 44–52px targets. Existing sheets preserve focus and keyboard behaviour; the sign-in sheet and tour use Headless UI dialogs.

Page transitions last 200ms. Reduced-motion users avoid page translation and smooth scrolling. No animated money counters or decorative loading delays. Loading placeholders never substitute zero for unavailable financial values. Failure messages preserve editable work whenever possible. Optional details remain collapsed.

## Comparison and resolution

- First attention: statement payout higher/lower than expected, or payout totals match. Expected is still labelled Estimated; statement is Reviewed.
- Compare after contractor deductions and charges, before the driver's own expenses, on a explicitly confirmed matching currency/period/VAT basis.
- Expand Work earnings, Contractor fee and Contractor charges only where comparable values are known. Do not infer a line discrepancy from a totals-only statement.
- Primary action in preview: Confirm and save check. This persists `checked`, never automatic reconciliation.
- Saved checks expose Mark comparison resolved, followed by an outcome selector and Confirm resolved. Matching totals do not prove every line matches or that payment arrived.
- Changed work/expense records invalidate the comparison. Recheck before resolving. Resaving a check clears its previous resolution.
- Reviewed statement charges are displayed separately, never silently inserted into Expenses.
- Events: comparison_detail_opened, statement_compared, discrepancy_found, reconciliation_started, reconciliation_completed. No amounts or charge labels in event properties.

## Documents

Three filters: Statements, Invoices, Receipts. Each has its own empty/loading/failure state. Statements list structured checks and link to their period in Check Pay. Original source uploads are not represented as archived PDFs.

Invoices are optional: self-billed drivers do not need to create one. Invoice history supports search, real PDF download and confirmed deletion. Each new invoice stores the business/client details used at creation, so later profile changes do not change old invoices. Older records lacking snapshots explicitly state they cannot recreate their original PDF.

Receipts appear only if the user chose retention. Open a receipt on demand. Deleting an invoice record does not delete copies previously downloaded or sent elsewhere. Events: documents_opened, document_viewed without document identity or contents.

## Invoice creation

Choose a pay period, review gross work as context, then prepare the invoice. Enter the agreed invoice amount explicitly: contractor payout is not automatically an invoice amount. Reuse sender/client details, with optional notes. Amounts require valid decimal currency and dates must be ordered.

Save the record before reporting success or downloading. Storage/transaction failures do not add an invoice to the visible ledger. A revision guard detects stale multi-tab changes. Downloads use one PDF generator with saved snapshots; share uses the device share capability and explains unsupported browsers. Sharing never proves payment. Generating an invoice does not change pay reconciliation status.

## Insights

Days worked, average stops/day, average excess parcels/day and estimated average gross/day. One simple stops trend and an expandable accessible daily table. Previous-period comparison explains when the current period is incomplete.

Group multiple records for the same day; derive excess parcels from total parcels minus stops where a saved excess field is absent. Explicit zero-work days are excluded from days worked. Missing earnings remain unavailable. Empty periods invite logging work. No remote analytics/AI call calculates insights.

## Routes

Search an address, add a start then stops, view numbered pins and reorder manually for free. Google Maps is the primary map; configured fallback remains available. One pin centres the map; multiple pins fit bounds after map readiness. Lines joining pins are explicitly not road directions.

Full optimisation calls the authenticated server, with three trial uses then Pro. Unknown entitlement status is not presented as a fresh trial. Failure preserves the driver's manual order. Busy actions prevent duplicate submissions. Do not substitute a simplistic local ordering algorithm for a paid successful optimisation.

Saved routes are opt-in and device-local under the current account ID, with clear removal. Do not read the old shared unscoped route store into another account. Late async responses from an earlier account are ignored. Location permission failure returns to address search. Navigation opens Google Maps to one selected destination.

Desktop places the map alongside search/list; mobile uses a single scroll sequence. Search results and stop controls work without drag gestures. Address search/maps/optimisation necessarily send required location information to their providers; product events contain no addresses or coordinates.

## Work records and pay periods

Work records are a searchable ledger with date filters. Edit opens the existing snapshot-aware Quick Entry flow, preserving historical pay arrangements. Delete requires confirmation and signals related checks may need reviewing. The tour displays a temporary example, never stored.

Pay periods show dates, work summary and lifecycle state; open a period in Money. Changing the known four-week anchor is an explicit separate action, persisted before success. Old checks remain attached to their original dates. Custom pay-cycle length is not added by this redesign.

## Profile, Pro, entry and help

Profile groups Pay Structure, period dates, appearance, optional profile editing, Pro, privacy/export and account actions. Natural-language AI pay setup remains available in onboarding and Pay Structure, with manual setup always available. Profile export downloads structured JSON, not original statements or receipt binaries.

Pro shows £4.99 monthly and £49.99 annually, including repeat billing wording. Guests see value before signing into a permanent account to purchase; they are told records do not transfer automatically. Entitlements remain server-controlled. Billing return waits for the server instead of granting access from a query parameter.

Analytics defaults off. Landing offers equally accessible Allow/No thanks; Profile permits withdrawal. Only explicit allowlisted events/properties go to a configured PostHog endpoint, using a random device ID rather than the account ID. No replay, autocapture, referrer URL, money, names or document contents. Withdrawal aborts pending analytics requests and removes the device ID.

Account deletion requires typed confirmation and a recent authenticated session. Active subscription deletion is blocked until billing is resolved. The callable deletes only owner-scoped storage/database records and removes authentication last. No real account was deleted during development.

Help opens the user's email client; it does not simulate a message being sent. The tour introduces Documents and Money, allows Skip/Next even when a highlighted target is missing, and always returns to real records.

## Platform acceptance

| Platform | Design contract | Remaining verification |
| --- | --- | --- |
| iPhone Safari / PWA | Safe-area spacing, 16px inputs, native pickers, bounded dialog, focus handling | Real keyboard resize, back gestures, PDF download/share and camera/HEIC flow |
| Android Chrome / PWA | Accessible targets, native file/location permission prompts, manual route ordering | Real permission denial, offline restore and Maps handoff |
| Capacitor iOS/Android | Same responsive screen hierarchy; server-owned billing/AI/routing | Native plugin versions, authentication, file/share plugins and store billing requirements |
| Desktop | Bounded content, two-column Routes, keyboard forms, searchable records | Browser visual/layout pass, 200% zoom and keyboard/screen-reader walkthrough |

Implementation includes these behaviours and automated tests where practical; this document does not claim real-device or live-provider verification. See `redesign-release-checklist.md`.
