# Stop Tracker

Delivery-driver tracking PWA (also shipped as a native app via Capacitor). Drivers log
stops/pay, plan routes on a map, and generate invoices. **v3.3.0**, private.

## Stack
- **React 18** (Create React App / `react-scripts`), **Tailwind CSS**, **Framer Motion**
- **Firebase** — Firestore, Auth, Storage (`src/services/firebase.js`)
- **Capacitor** — Android + iOS wrappers (`android/`, `capacitor.config.ts`)
- **Leaflet + react-leaflet** — route map (OpenStreetMap + free Nominatim geocoding, no API key)
- **jsPDF** — invoice PDFs · **Recharts** — stats · **React Router v6**
- Tests: **Vitest** (unit) + **Playwright** (e2e). Deploys to **Vercel**.

## Commands
```bash
npm start          # dev server on http://localhost:3001 (PORT set in .env.local)
npm run build      # production build -> /build
npm test           # vitest run (unit)
npm run e2e        # playwright e2e
npx kill-port 3001 # if the port is stuck
```
In Claude Code, prefer the `stop-tracker-main` launch config (`.claude/launch.json`) over raw `npm start`.

## App layout — 6 bottom-nav tabs
Home (`/app/dashboard`) · Entries (`/app/entries`) · Routes (`/app/routes`) ·
Invoice (`/app/invoice`) · Stats (`/app/stats`) · Profile (`/app/profile`).
Routes defined in `src/router/index.js`; nav in `src/components/AppNavigation.jsx`.

## Architecture
- **State = React Context**, in `src/contexts/`: `AuthContext`, `DataContext`,
  `InvoiceContext`, `ThemeContext`, `AddressMemoryContext`. Prefer these over prop-drilling.
- **Services** (`src/services/`): `firebase.js`, `addressSearch.js` (Nominatim),
  `addressMemory.js`, `interpretPayStructure.js` (AI pay-model setup), `syncUtils.js` (offline sync).
- **Pay model** is configurable per driver (flat, per-stop, sliding-scale incl. miles). The
  quick-entry FAB must follow the active pay model — see recent commits touching sliding-scale/miles.
- **Offline-first**: entries queue to local storage and sync when back online.
- **Premium gating** (£4.99/mo) via `PremiumFeatureGate.jsx` — some routes/invoice features are Pro-only.
- Components in `src/components/` (many `*Wrapper.jsx` route wrappers); shared UI in `src/components/ui/`.

## Conventions & gotchas
- **Windows dev environment.** Use the Bash tool for POSIX scripts, PowerShell for the rest.
- `postinstall`/`prestart`/`prebuild` run custom **security-patch scripts** (`package-audit-fix.js`,
  `patch-vulnerabilities.js`, `force-patch.js`) that rewrite node_modules/package-lock. Don't be
  surprised by their output; don't remove them without reason. Intentionally suppressed CVEs live in
  `.npmauditrc.json` / `.auditignore` (postcss, nth-check — low-risk frontend-only).
- Mobile UX is a first-class concern: 48–56px touch targets, haptics (`navigator.vibrate`),
  swipe between tabs, pull-to-refresh, keyboard-aware inputs. Preserve these when editing forms/nav.
- New `.jsx` components use function components + hooks. Match surrounding style.

## Do NOT auto-read these (token discipline — open only if a task truly needs it)
Reading these wastes large amounts of context for near-zero value:
- **`package-lock.json`** (~950 KB) and **`node_modules/`**, **`build/`** — generated; never read to understand the code. Use `package.json` for deps.
- **Root screenshots / media** — `Screenshot_*.png` (up to 1.7 MB each — huge as vision tokens), `WhatsApp Image*.jpeg`, `*.pdf`, `playstore-icon-512.png`, `app-screenshot.svg`. Don't open unless the task is specifically about that image.
- **`docs/archive/`** — dated session logs (`PROJECT_STATUS.md`, `SESSION_NOTES.md`, `UPGRADE_TO_V2.md`, `V3_UPDATE_SUMMARY.md`, `CHANGELOG_V3.1.md`). Historical only; **trust the code + `git log` over these.** Retrieve from archive only if explicitly asked about past work.
- **`.claude/worktrees/`** — throwaway worktree copies of the repo; ignore.

## Active docs (deeper detail — still trust code + git log first if they conflict)
- `README.md` — overview + the custom security-patch scheme
- `ROUTE_PLANNER_GUIDE.md` — route planner internals
- `DEPLOYMENT.md` — deploy steps · `QUICK_START_GUIDE.md` — user guide · `CHANGELOG.md` — canonical changelog
- Play Store / legal: `GOOGLE_PLAY_*`, `PRIVACY_POLICY.html`, `terms.html`, `DELETE_ACCOUNT.html`
