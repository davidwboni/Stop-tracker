# Stop Tracker V5 — launch quality and security audit

Review date: 22 October 2026. This is a **source and CI review**, not a penetration test or certification. Do not advertise the app as hack-proof or invite a large public beta until the outstanding checks are resolved.

## Target driver journey

1. Sign up. State your rates naturally; AI interprets, driver confirms. Store rates historically per workday.
2. Finish shift. Log stops, parcels, optional extra work. Store independently in the driver's account.
3. Receive contractor statement (any sensible date range). Upload once to Pay V5. AI extracts only figures it can read and uses the statement's dates.
4. Pay V5 compares independently recorded days and VAT-aligned payout. It flags only possible discrepancies, incomplete evidence or unusual charges.
5. Driver confirms the original payout and handles differences. Unverified statements are saved, **not** marked checked. Exact difference can be accepted with reason, but is never silently dismissed.
6. If invoicing required, generate using the confirmed contractor statement figure. User reviews, shares and explicitly confirms sending; self-billed contractors can finish without an invoice.

## Checked in code

- [x] Primary nav consists of Home, Records, Pay, Routes. Profile access lives in consistent header control.
- [x] All uploaded statement amounts remain AI/unverified until driver action. Existing daily logs are not rewritten by AI.
- [x] History rate snapshots are retained, and incomplete old pay values are not silently estimated.
- [x] Before-VAT comparison requires known VAT basis; no generic automatic 20% assumption.
- [x] Driver can save a genuine statement without a fabricated comparison.
- [x] Source-scoped Firestore rules require uid match for user records and deny client edits to billing entitlements/usage.
- [x] Storage rules require owner, cap content type/size, reject unscoped writes.
- [x] Cloud Functions use signed-in Firebase Auth and server-checked entitlements/beta quotas.
- [x] Backend secrets are attached to Cloud Functions, not copied into client bundle.
- [x] Vercel serves no-sniff, anti-framing and referrer policies.
- [x] PWA layout includes Android/iOS safe areas, 48px+ major controls, reduced-motion CSS and light/dark theme variables.
- [x] V5 beta tests cover one-file upload, dynamic statement ranges, VAT ambiguity, fee uncertainty, saved evidence, no auto-invoice and no modification of work history.
- [x] Existing invoice flow checks for prior invoices and does not mark email as delivered merely because sharing was opened.

## Blocking checks before a wider public release

- [ ] Configure Firebase App Check for web/Android/iOS **and** verify legitimate clients receive tokens before enabling callable enforcement. Current functions' public HTTP transport plus Firebase Auth are not sufficient abuse protection. See Firebase documentation.
- [ ] Reduce GitHub deployer and default Compute Engine IAM permissions to the minimum verified role set; privileged temporary Cloud Functions Admin must be removed after deployments.
- [ ] Exercise Firestore/Storage rules with the Firebase emulator against cross-user reads, writes and fake paid roles. Static inspection is not an authorization penetration test.
- [ ] Run an up-to-date npm dependency audit and remove old CRA preflight/TS/ESLint bypass flags after build repairs; pin workflows to trusted action versions.
- [ ] Add Content Security Policy in report-only mode, verify Firebase, payments, Maps, analytics and Google sign-in; enforce after observing violations.
- [ ] Test V5 end-to-end with the founder's actual account and **different** representative statements: image, PDF, partial daily detail, VAT included/excluded, fuel discounts, duplicated stops, unknown pay rates, failures and offline recovery.
- [ ] Ensure payroll/invoicing data retention, account deletion and privacy disclosures match the real app behaviour. Confirm contractor statements aren't indefinitely stored as raw AI uploads.
- [ ] Add automated 320px/375px/390px and desktop viewport tests plus dark/light screenshots and keyboard accessibility checks; source-level responsive checks alone are insufficient.
- [ ] Confirm Stripe checkout/webhooks, subscription cancellation, entitlement expiry and first-three-trial enforcement using sandbox integration tests before removing the time-limited open beta.
- [ ] Implement or clearly scope first-run **past-work import** with preview, provenance and overwrite protection. Never reclassify contractor-supplied historical rows as independently logged evidence.
- [ ] Add a first-class fuel-card discount and net-charge field to expense entry. Currently receipts can be marked *unverified*, not automatically declared a mismatch.

## Design system decisions

Primary: indigo/purple CTA, not a gender cue. Background: graphite/navy dark and neutral off-white light. Green: success/verified; amber: possible difference or missing evidence; red: destructive/errors; blue: routing. Use one purple CTA per stage where possible. No neon or flashy effects. Semantic CSS tokens for both themes. For WCAG 2.2 AA, normal text requires 4.5:1 contrast and minimum target sizes are 24x24 CSS pixels (larger, approximately 44px, for main driver actions). Screen-reader, keyboard and dark/light screenshots still need direct device verification.

## Key files to revisit each release

`src/components/CheckPayV5.jsx`, `src/features/statements/autoCheck.js`,
`src/features/statements/chargeEvidence.js`, `src/components/InvoicePage.jsx`,
`src/components/InvoiceCreate.jsx`, `src/components/DailyQuickEntry.jsx`,
`src/components/PayOnboarding.jsx`, `src/contexts/DataContext.jsx`,
`src/contexts/ThemeContext.js`, `src/styles/check-pay-v5.css`,
`firestore.rules`, `storage.rules`, `functions/index.js`.

CI evidence is necessary, but not sufficient to call V5 launch-complete.
