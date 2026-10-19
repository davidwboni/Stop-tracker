# Stop Tracker security and Android privacy pass — 19 October 2026

## Code-level changes
- Remove broad owner-write wildcards from Firebase Storage. Signed-in users may upload receipts within the existing 8 MB image/PDF limits, and profile images within a 2 MB JPEG/PNG/WebP limit. Owner-scoped legacy paths remain readable.
- Restrict Android backup and device-to-device transfer. Guest local records, credentials and financial information should not be placed in system backups.
- Frontend/API credentials: Firebase config and a browser-restricted Maps key are not server secrets; DeepSeek, Stripe, and Route Optimization credentials must remain on the server.
- Entitlements and free uses must remain server-authoritative. A UI badge does not grant Pro access.

## Not validated by a passing web build
1. **Firebase deploy** — merge does not publish Storage rules. Deploy with the correct Firebase project and review actual published rules.
2. **Rules emulator tests** — test owner A, owner B, guest, over-size/type rejection for receipt and profile, unexpected folders and object deletion. The static web policy test is not a substitute for these.
3. **Android native** — generate and install a release build, check OAuth deep links, photo picker/receipt upload, geolocation permissions, hardware Back, edge-to-edge/safe-area layout, screen readers and dark mode.
4. **Backup** — verify Android 12+ data extraction rules and pre-12 backup exclusions against a real release/device-transfer test.
5. **Payments and accounts** — verify cross-account Firestore reads fail, duplicate invoice prevention, paid status from verified Stripe webhooks, and no sensitive info in client analytics.
6. **Production** — confirm the deployed frontend SHA and Firebase project after rules deployment; do not infer backend deployment from Vercel READY.

## Release note
Avoid claiming the security audit is complete until Firebase rules have been deployed and these emulator/native tests have been run.
