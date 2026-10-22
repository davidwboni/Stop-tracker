# Stop Tracker V5 — launch audit and acceptance criteria
_Last reviewed: 22 October 2026. Evidence here is source-code/CI based; **not** a penetration-test certificate._

## Core journey
The target is **Tell us how you're paid → Log work → Upload contractor statement → AI compares only supported figures → Review exceptions → Save/check → Invoice or finish self-billing**. All financial figures remain estimated until the driver has reviewed the relevant contractor evidence. A payment is never marked received by invoice creation or sharing.

| Area | Source / tests | What must hold |
| --- | --- | --- |
| First-time setup | `PayOnboarding`, `PayStructureAISetup`, pay setup and onboarding tests | Natural-language pay descriptions require review before saved rates; no fixed 28-day assumption |
| Previous records | `PreviousWorkImport`, import tests | Import parsed days only after review; never silently replace logs |
| Daily work | `DailyQuickEntry`, `StopEntryForm`, entry tests | One fast save; preserve date-specific rate, stops, parcels and extras |
| Statement AI | `CheckPayV5`, `extractStatement`, auto-check tests | Identify contractor period; compare saved records without changing them; clearly label totals-only evidence |
| Discrepancies | `autoCheck`, `findingGate` and tests | Zero-pay non-working days ignored; missing values never become zero; unresolved stop differences stop invoicing even if totals match |
| VAT and deductions | `autoCheck`, `chargeEvidence`, VAT and fuel tests | Never assume VAT rate or fuel-card discount; compare like-for-like net payout only where explicit evidence exists |
| Invoicing | `InvoicePage`, `InvoiceCreate`, invoice tests | Use checked contractor amounts; duplicate-period warning; no send/paid claims until driver confirmation |
| Route planner | `RoutePlanner` and tests | Non-satnav addresses and route optimization remain independent from financial checks |
| Navigation | `AppNavigation`, `Layout` | Four bottom navigation actions, top profile access, mobile safe-area, keyboard-focus controls |
| Design | `index.css`, `home.css`, PWA manifest | Graphite dark, readable light, restrained purple; badges for actual states only; no forced portrait orientation |

## Data security (source audit, not independent testing)
- Firestore rules scope `/users/{uid}`, `/payPeriodData/{uid}`, `/invoiceData/{uid}` and personal address memory to the signed-in UID. Billing-entitlement collections deny client writes.
- Firebase Storage rules scope profile and receipts to the owner, with file type/size and non-anonymous write constraints.
- The server holds the DeepSeek key and checks Firebase Auth for AI calls. No uploaded contractor image is stored by the statement workflow.
- Historical pay fee repairs record explicit confirmation and do not overwrite gross earnings or original pay-rate snapshots.
- On production Vercel, `vercel.json` configures `nosniff`, frame denial, strict referrer policy and permissions policy.
- CI runs web, functions and compile checks on PRs; passing tests demonstrate tested paths, **not** resistance to every attack.

## Must verify before public beta (not signed off)
- [ ] Fresh-account sign-up with email and Google on Android, iOS Safari and desktop; verify guest stays isolated and can migrate appropriately.
- [ ] Read/write deny tests against Firestore/Storage using a second independent Firebase account and the emulator/rules unit tests.
- [ ] Independent authenticated security assessment of server function authorization, quota abuse, direct invocation, Stripe webhook signatures, billing entitlements and Firestore rules.
- [ ] Refresh browser/PWA cached bundles, screen-reader labels, keyboard/VoiceOver/TalkBack, contrast on all screens, Android soft-keyboard behaviour and desktop responsive testing.
- [ ] Real statement comparison across PDF, screenshot and spreadsheet formats. Verify day-level results, VAT basis, fuel-card discounts and intentional mismatches. Do not send personal statements to diagnostics.
- [ ] End-to-end invoice generation and email attachment flow for multiple contractors; verify that sharing does not imply email delivery.
- [ ] Error recovery when offline or a document is malformed; avoid duplicates or partial saves.
- [ ] Decide guest-data migration, retention/deletion policy, privacy/terms, consent analytics and customer support procedures.
- [ ] Revoke **temporary elevated Cloud Functions Admin** from the CI deployer after a least-privilege deployment role is established. Keep production keys server-only.
- [ ] Turn off temporary free-beta AI gating or establish the final freemium limits, subscriptions, abuse budgets and monitoring before external users.
- [ ] Backup/restore drill; staged rollback instructions and telemetry dashboards for AI status, extraction errors, expense scans, route optimization and invoices.

## Shipping rule
**Do not call the app fully secure, fully accessible or ready for outside paid customers until these manual and independent checks pass.** UI improvements and green unit tests are valuable but do not replace them.
