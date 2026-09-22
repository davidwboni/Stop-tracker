# Stop Tracker production configuration

Never commit real secret values to this repository.

## Firebase Secret Manager (server-only)
Set these with the Firebase CLI / Google Cloud Secret Manager:
- `DEEPSEEK_API_KEY` — DeepSeek API key used by authenticated Cloud Functions.
- `STRIPE_SECRET_KEY` — Stripe secret key used to create checkout/customer sessions.
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (required before subscriptions are activated).

## Firebase Functions environment (non-secret)
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`

## Vercel / web build
- `REACT_APP_GOOGLE_MAPS_API_KEY` — browser key. Restrict by Stop Tracker domains and enabled APIs.
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` — publishable Stripe key only if the client later needs Stripe.js.

## Release gates
1. Deploy Firestore and Storage rules and run cross-account denial tests.
2. Add Stripe webhook handling before treating checkout as a Pro entitlement. Checkout success URLs are never proof of payment.
3. Move billable Google Routes optimisation behind an authenticated server endpoint before enabling it broadly.
4. Statement/photo AI uploads must be temporary: extract -> validate -> delete original -> persist only user-confirmed structured comparison.
5. Run web, iOS and Android smoke tests after secrets are configured.
