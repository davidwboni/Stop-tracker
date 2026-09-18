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
- AI statement/photo/PDF scanning
- Future advanced automation/reporting where justified

## Server-side entitlement model

Premium access must never rely on a hidden React button.

- The user profile may expose a plan label for UI purposes.
- Firestore rules prevent clients from changing their own `role`.
- Trusted Admin/billing code is the only code allowed to grant `pro`.
- Firebase callable functions resolve entitlements server-side before paid work.
- Anonymous Firebase sessions are always treated as `guest`, including legacy profiles.

## AI cost protection

`interpretPayStructure` is server-side and the Anthropic key is a Firebase secret.

Daily server-side quotas currently protect beta usage:

- Guest: 3 text interpretations / 1 document interpretation
- Free signed-in: 10 text / 3 document
- Pro: 50 text / 20 document

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
- Firebase Functions runtime is refreshed to `firebase-admin` 14.4.0, `firebase-functions` 7.4.0 and Anthropic SDK 0.126.0; resolved gRPC/XML dependencies are on current patched lines.
- Remaining moderate dependency advisories are tracked separately and must not be mistaken for a clean bill of health; React Router's current advisory requires a deliberate v7 migration rather than a forced breaking update.

## Before production Pro launch

Still required:

1. Choose and integrate billing appropriate to the distribution channel (Google Play Billing for Android digital features; web billing separately if offered).
2. Have the billing backend grant/revoke the server-owned Pro entitlement.
3. Enable Firebase App Check for production clients and callable Functions.
4. Configure the paid route provider as a backend secret.
5. Add server-side route usage limits/cost controls.
6. Add AI statement scanning behind the same server entitlement.
7. If ads are enabled, add the appropriate consent/CMP flow and keep ads out of logging and pay-result interactions.
