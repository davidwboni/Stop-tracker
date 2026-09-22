# Stop Tracker production configuration

Never commit real secret values to this repository.

## Firebase Secret Manager (server-only)
Set these with the Firebase CLI / Google Cloud Secret Manager:
- `DEEPSEEK_API_KEY` — DeepSeek API key used by authenticated Cloud Functions.
- `STRIPE_SECRET_KEY` — Stripe secret key used to create checkout/customer sessions.
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (required before subscriptions are activated).

## Vercel / web build
- `REACT_APP_GOOGLE_MAPS_API_KEY` — browser key. Restrict by Stop Tracker domains and ONLY `Maps JavaScript API` + `Places API (New)`.
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` — publishable Stripe key only if the client later needs Stripe.js.

## Release gates
1. Deploy Firestore and Storage rules and run cross-account denial tests.
2. Configure the deployed `stripeWebhook` endpoint in Stripe and set `STRIPE_WEBHOOK_SECRET`. Checkout success URLs are never proof of payment; only signed webhook state grants Pro.
3. Route optimisation is server-side through Firebase `optimizeDriverRoute` and Google Cloud OAuth. Grant the Firebase Functions runtime service account `roles/routeoptimization.editor` (or another role containing `routeoptimization.locations.use`). Do not enable Route Optimization or Routes API on the browser key.
4. Statement/photo AI uploads must be temporary: extract -> validate -> delete original -> persist only user-confirmed structured comparison.
5. Run web, iOS and Android smoke tests after secrets are configured.

### Stripe sandbox
- Product: `prod_VIz03dr133C5mm` — Stop Tracker Pro
- Monthly: £4.99, lookup key `stop_tracker_pro_monthly`
- Annual: £49.99, lookup key `stop_tracker_pro_annual`
- These IDs are test-mode only. Create separate live-mode product/prices before production launch.
