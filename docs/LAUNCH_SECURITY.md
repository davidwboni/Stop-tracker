# Stop Tracker launch security checklist

This document records the security boundary for the beta and future Pro launch.

## Already enforced in code

- Firestore user data is isolated by authenticated `uid`.
- Firebase Storage profile uploads are restricted to `users/{uid}/...`, images only, under 2 MB.
- DeepSeek credentials are Firebase secrets and never shipped to the browser.
- AI interpretation has authenticated server-side daily quotas, with deliberately small guest limits.
- Anonymous Firebase sessions are treated as `guest` on the server even if an old profile document says `free`.
- Pro entitlements are read from Firestore by server functions; paid server actions do not trust a client-side button or role flag.
- Google road-network optimisation is a server callable and requires a server-confirmed `pro` role.
- Manual tracking and manual Check Pay remain free.
- GitHub CI runs dependency audit, CodeQL and a basic committed-secret scan.

## Required before deploying the new Functions

Set the Google Routes credential as a Firebase secret:

```
firebase functions:secrets:set GOOGLE_ROUTES_API_KEY
```

Then deploy Functions and rules:

```
firebase deploy --only functions,firestore:rules,storage
```

Set the AI and billing secrets/config before turning those features on:

```
firebase functions:secrets:set DEEPSEEK_API_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

Set `STRIPE_PRO_PRICE_ID` and `APP_BASE_URL` as Firebase Functions parameters during deployment. Configure the Stripe webhook endpoint to send checkout/session and customer/subscription events to `stripeWebhook`.

## Google Cloud key restrictions

Use separate credentials where practical:

1. Browser Maps/Places key
   - Restrict by the Stop Tracker production web origins / Android app.
   - Restrict enabled APIs to only the browser APIs the app needs.
   - This key is a browser credential and can be visible in a built web app.

2. Server Routes key
   - Store only as `GOOGLE_ROUTES_API_KEY` in Firebase Secret Manager.
   - Restrict it to Routes API.
   - Do not place it in `REACT_APP_*` variables or committed files.

## Firebase App Check

Before enabling paid Pro usage broadly, configure Firebase App Check for the web/Android clients and then enable enforcement on paid callable Functions. Rate limits are already present for beta, but App Check adds another barrier against scripted abuse.

Do not turn on `enforceAppCheck: true` until the production clients are registered, or legitimate app calls will be rejected.

## Billing / Pro roles

Do not let the client write its own `role: "pro"` value.

Web Stripe checkout now grants/revokes Pro only through the signed `stripeWebhook`. Client UI may display the resulting plan, but server Functions remain authoritative for paid API access. Native store billing still needs a separate verified Google Play / App Store implementation before native purchases are enabled.

## Ads / consent

If ads are introduced on the free plan:

- Keep ads out of shift save/update and discrepancy-result interactions.
- Keep `REACT_APP_ENABLE_ADS` disabled until a Google-certified CMP is configured for UK/EEA traffic and the AdSense slot is ready.
- Keep the Pro plan ad-free.
- Update Privacy Policy / store disclosures before release.

## Release gate

Before merging this branch to production:

- Security Audit workflow green.
- Preview build green.
- Test guest, free signed-in and Pro test accounts.
- Verify one user cannot read another user's Firestore/Storage data.
- Verify Free/Guest cannot invoke Pro route optimisation.
- Verify AI quotas return a controlled error when exceeded.
- Verify browser bundle contains no server API secrets.
