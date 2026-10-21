# Temporary AI testing access (21 October 2026)

**Scope:** Stop Tracker staging/beta testing on the existing public web app. This preview is not a paid subscription, and never writes to the Stripe entitlement collection.

## Features available to permanent signed-in accounts

- AI statement extraction and review even after the normal three free uses.
- AI receipt extraction even without Pro (no change to the manual expense workflow).
- Full Google route optimisation for testing beyond the normal three lifetime uses.
- AI interpretation of pay setup was already available to signed-in users; its existing 20/day rate limit remains.

Guests/anonymous sessions are **not** included in the preview. Always require a server-validated Firebase Auth identity. Do not let browser state or a client-supplied `isPro` flag grant access.

## Server-side safety

- Preview automatically ends **2026-11-22 00:00 UTC**.
- Set Firebase Functions runtime `STOP_TRACKER_BETA_ACCESS=false` to disable it earlier, then redeploy affected functions. The regular 3 free checks and paid Pro entitlements continue independently.
- Max **8 AI statement attempts, 8 receipt scan attempts and 8 route optimisation attempts per account per UTC day**, even with a free subscription.
- Shared **100 paid beta requests per UTC day** across all three features. Every reserved attempt counts toward the budget, including provider failures. Limits are recorded in `usage/{uid}` and `betaApiBudget/{yyyy-mm-dd}`, never document payloads.
- The original receipt/statement input limits, authentication, AI review and money verification safeguards still apply. No keys or raw financial documents are stored in analytics.
- Cloud Functions use `maxInstances:5` for statement and receipt extraction. A Google Cloud billing budget and API spending alert must also be configured before wider beta invitations; API-side spending alarms are **not** implemented by this code.

## Important: Vercel is not Firebase Functions

Updating the React web app on Vercel **does not deploy these back-end authorisation changes**. Without deploying Firebase Functions, the web UI will still receive the old permission/Pro responses and receipt AI may still be disabled.

From an authorised Firebase project environment, run:

```bash
firebase use <correct-firebase-project-id>
firebase deploy --only functions:getPremiumStatus,functions:extractStatement,functions:getReceiptStatus,functions:extractExpenseReceipt,functions:optimizeDriverRoute,functions:consumeRouteOptimization
```

Only proceed after checking the active Firebase project and confirming `DEEPSEEK_API_KEY` is present in Secret Manager. Google Route Optimization API and the Functions service account role must also be configured for routes to work. Firebase deployment is a separate release step; a successful GitHub/Vercel build alone is not proof that paid APIs work.

## Smoke test from a free permanent account

1. In Pay, use **Check statement → Upload with AI** and confirm the beta access message; review extracted fields before saving.
2. In Records → Expenses, choose **Scan receipt with AI**, extract a test receipt, review and save. Confirm no raw receipt is retained unless explicitly chosen.
3. In Routes, optimise a short two-stop route and confirm an existing free-trial count of 3 does not trigger the paywall.
4. Test exceeded per-account limit, anonymous sign-in and a second account (no cross-account records).
5. Confirm the Stripe subscription remains free/inactive after all three operations.
6. Confirm manual entry, checked statement/invoice safeguards and PDF sharing still work.

**Rollback:** Set `STOP_TRACKER_BETA_ACCESS=false` in the Firebase Functions environment and redeploy the same six functions. Remove the beta code before paid public launch or let the automatic expiry take effect. Do not manually update users to Pro to simulate testing.
