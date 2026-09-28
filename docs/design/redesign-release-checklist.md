# Redesign release checklist

## Implemented in the redesign branch

Home, daily entry, expense overview and entry, Money, natural-language/manual Pay Structure, statement upload/review/comparison, explicit resolution, Documents, invoice generation/history, Insights, Routes, work records, pay periods, Profile/Pro, entry/help screens and updated guided tour.

Core manual tracking/expense/comparison remains free. Paid AI and routing remain server-authorised. Statement originals are not persisted by the application; receipt retention is optional.

## Configuration and release gates

- Deploy the revised Firebase callables/rules/storage rules with the frontend; this branch has not been promoted or deployed by this pass. New account deletion requires `deleteDriverAccount` deployment.
- Configure `REACT_APP_POSTHOG_PROJECT_TOKEN` and `REACT_APP_POSTHOG_HOST` (`https://eu.i.posthog.com` or `https://us.i.posthog.com`) to enable opted-in events. Without both, no analytics requests occur. The token is a public ingestion token, not an administration secret. Verify a synthetic event in the chosen project before rollout.
- Verify actual AI provider deployment, rate limits, transient processing and receipt feature gate. Receipt extraction remains gated by `RECEIPT_AI_ENABLED` on the server. Configure keys only in the appropriate server secret store.
- Verify Stripe checkout, webhook entitlement transitions, cancellation and billing portal with test accounts. Account deletion blocks subscriptions still active at period end; the support process must resolve those cases before removal.
- Verify Google browser-key origin/API restrictions and server optimisation permissions, quotas and trial counts. Test no API key configured, search failure, permission denial and optimisation timeout.
- Perform real iPhone Safari, Android Chrome, PWA and Capacitor checks from the platform table in the screen specification. The browser automation CLI/browser binary was unavailable in the final environment, so no new real-browser screenshot or native-device pass is claimed.
- Dedicated production security/privacy audit remains required: owner isolation with emulators, concurrent deletion/writes/webhooks, retention, account export completeness, billing access, rules and upload limits. Confirm the support email is monitored and approve the updated privacy text before publication.

## Explicit product limits

- CSV/Excel uploads must currently be exported to PDF; there is no direct spreadsheet parser or learned document-template engine yet.
- GBP comparison requires the driver to confirm a matching VAT basis. It does not calculate personal tax, certify receipt of payment or perform general VAT accounting.
- Recurring-cost suggestions do not silently create future expenses. Statement charges are not automatically merged into expenses; this avoids double counting.
- Pay periods remain four weeks. No new arbitrary pay-cycle-length setting was added.
- Guests do not automatically transfer records to permanent accounts. Export is available; a reviewed import/migration flow is separate work.
- Legacy invoices without sender/client snapshots cannot reproduce their original PDFs. New records preserve those snapshots.
- Saved routes are account-scoped on the current device, not a cloud route archive. Navigation hands off one selected destination, not an in-app satnav.
- PostHog usage is device-scoped and consent-dependent. Funnel totals will not include nonconsenting users or reliably join multiple devices. Provider network infrastructure still receives request transport metadata.
- JSON export includes structured current records, not original uploaded statements, receipt image binaries, all other devices' local routes, or payment-provider records.

## Verification evidence

Verification: 177 frontend tests passed across 24 files, 15 targeted backend tests passed, and the production build compiled successfully. Targeted backend tests cover AI structure/rate limits and account deletion guards. These are synthetic tests; they do not exercise real paid provider calls or delete a real account. Existing dependency, CRA bundle-size and lint warnings must be assessed separately from a successful compile.

## Preview hosting follow-up

Vercel Git integration builds `feat/approved-home` as a preview in the existing Stop Tracker project. It uses the same configured Firebase project as the app, not an isolated test database; use guest mode or a dedicated test account and synthetic data. Preview hosting is access-protected by Vercel; an owner login or temporary share link is needed. Removed the old unconditional AdSense script and restored browser zoom before distributing the preview.
