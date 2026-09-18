# Stop Tracker launch security checklist

This document records the security boundary for the beta and future Pro launch.

## Already enforced in code

- Firestore user data is isolated by authenticated `uid`.
- Firebase Storage profile uploads are restricted to `users/{uid}/...`, images only, under 2 MB.
- Anthropic credentials are Firebase secrets and never shipped to the browser.
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

The existing `ANTHROPIC_API_KEY` secret must remain configured.

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

When billing is connected, the trusted billing webhook / Google Play verification backend should update the user's server-side entitlement. Client UI may display the resulting plan, but server Functions must remain authoritative for paid API access.

## Ads / consent

If ads are introduced on the free plan:

- Keep ads out of shift save/update and discrepancy-result interactions.
- Use a consent-management flow appropriate to the user's region before personalized advertising or non-essential tracking.
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
