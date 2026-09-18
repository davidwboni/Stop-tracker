# Stop Tracker — Security & Premium Boundary

## Core rule

Stop Tracker's free core remains useful without paid APIs:

- Log work and expected earnings
- Edit previous workdays
- Review entries and weekly totals
- Manually compare company pay against the driver's own records
- Use light/dark/system appearance

Premium features are reserved for services with ongoing external API cost or materially higher operating cost:

- Route optimisation using paid road-network APIs
- AI-assisted rate-sheet image reading (statement scanning remains a future Pro feature)
- Future advanced automation/reporting where justified

## Server-side entitlement model

Premium access must never rely on a hidden React button.

- The user profile may expose a plan label for UI purposes.
- Firestore rules prevent clients from changing their own `role`.
- Trusted Admin/billing code is the only code allowed to grant `pro`.
- Firebase callable functions resolve entitlements server-side before paid work.
- Anonymous Firebase sessions are always treated as `guest`, including legacy profiles.

## AI cost protection

`interpretPayStructure` is server-side, uses DeepSeek V4.1 Flash via its Anthropic-compatible endpoint, and keeps the DeepSeek key in Firebase Secret Manager.

Daily server-side quotas currently protect beta usage:

- Guest: 3 text interpretations / 1 image interpretation
- Free signed-in: 10 text / 3 image
- Pro: 50 text / 20 image

These are beta safety limits and can be tuned from real usage data.

## Routing during beta

Paid Google route/Places calls are deliberately removed from the active browser path.

The beta route planner uses:

- postcodes.io for postcode lookup
- Nominatim/OpenStreetMap for address search
- Leaflet/OpenStreetMap for map display
- local nearest-neighbour optimisation

When Pro billing is live, paid road-network optimisation should be introduced through a protected backend callable rather than exposing a paid server credential in browser JavaScript.

## Data access

- Firestore user documents and subcollections are scoped to the authenticated user's UID.
- The client cannot promote its own plan/role.
- Firebase Storage is scoped to `users/{uid}/...`.
- Current Storage uploads are restricted to images under 2 MB.
- Product analytics requires consent and excludes earnings, pay rates, invoice contents, notes, addresses, names, emails and AI free-form prompts.

## Automated checks

The GitHub security workflow runs:

- CodeQL
- committed-secret scanning
- strict high/critical audit for shipped runtime dependencies
- Functions runtime dependency audit
- full dependency audit as an informational report

### Dependency hardening completed in this beta

- `websocket-driver` is pinned to patched version 0.7.5 to address the 2026 critical WebSocket advisory.
- `jsPDF` is updated to the patched 4.2.1 line.
- `lodash` is updated to the patched 4.18.1 line.
- Firebase Functions runtime is refreshed to `firebase-admin` 14.4.0 and `firebase-functions` 7.4.0. The Anthropic SDK remains only as the transport client for DeepSeek's Anthropic-compatible API; the model/provider is DeepSeek.
- `jsonwebtoken` is constrained to patched `jws` 3.2.3 for its compatible 3.x dependency, while Google packages retain their separate current 4.x `jws` line.
- Remaining moderate dependency advisories are tracked separately and must not be mistaken for a clean bill of health; React Router's current advisory requires a deliberate v7 migration rather than a forced breaking update.

## Before production Pro launch

Still required:

1. Configure Stripe web billing secrets, price ID, production base URL and webhook endpoint; test purchase, renewal, cancellation and failed-payment states.
2. Add verified Google Play / App Store billing before enabling native purchases.
3. Enable Firebase App Check for production clients and paid callable Functions.
4. Confirm the server Routes key is API-restricted and billing quotas/alerts are configured.
5. Add AI statement scanning behind the same server entitlement if/when that feature ships.
6. Configure a Google-certified CMP before enabling ads for UK/EEA traffic.
7. Keep the repository visibility and any public privacy-policy contact details intentional; do not publish private operational information by accident.
