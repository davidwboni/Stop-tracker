# Check Pay entry — approved 27 September 2026

Approved by the user's “Great please proceed”. Implementation: CheckPayV4 and check-pay.css.

## Purpose and hierarchy
Select a full pay period without changing the driver's pay-period anchor. Show lifecycle status and estimated contractor payout after saved contractor fees and recorded charges, before own business costs/personal tax. Never substitute gross earnings or take-home. Link calculation to Money. Manual entry is free and first. AI is optional; exact remaining count only after a valid server response. A saved comparison can be reopened; changed records say Needs recheck. A matching figure never automatically reconciles a period.

## Implemented behavior
- Local calendar dates and selected Money period carry through; 13 recent periods plus incoming period.
- Empty records show Log work, no invented zero payout. Loading and partial data disable comparisons. Cached/offline state is explicit. Manual drafts remain in memory while open.
- Existing optional stops, gross earnings, adjustments and per-day comparison remain collapsed. These amounts never replace final payout. Reviewed detail fields persist only with confirmed check.
- AI file chooser -> explicit processing consent -> editable unverified draft -> deterministic comparison preview -> Confirm and save check. Entry alone causes no AI request.
- PDF/JPEG/PNG/WebP, up to 12 MB, up to 10 PDF pages, bounded rendered pages and encoded payload. Oversized documents fail entirely; never silently truncate. CSV/XLSX direct input awaits parser implementation: explicitly instruct export as PDF. HEIC requires export to supported format.
- Server authenticates, resolves entitlement, transactionally locks concurrent requests and caps 20 attempts/day; only usable extraction consumes a free check, using atomic usage increment. Server keys remain private. No provider/document error payloads logged.
- Extraction distinguishes gross from payout and returns bounded structured fields only. Missing currency or foreign currency never prefills GBP payout. Missing/mismatched periods require review. No original upload saved to Stop Tracker storage.
- Light/dark theme tokens, minimum 44px actions, 16px inputs, native file picker, safe-area padding, bounded two-card desktop layout. Reduced-motion respected. Unsaved close/reload warnings and router navigation blocking, including browser back. Native Back integration still needs real-device verification.
- Analytics requires existing consent and explicit allowlist; no amounts, filenames, document contents or model responses.

## Verification and remaining release gates
Component tests exercise free manual access, unavailable trial status, non-mutating period selection, empty/loading states, gross-vs-payout isolation, no automatic save and failed-save recovery. Server normalization tests exercise null handling, numeric types and removal of personal fields. Build checked separately. Live provider processing, Firebase deployment, iOS/Android/native file pickers and browser visual QA still need verification. Dedicated Review design is proposed separately; current handoff reuses editable payout/manual details. Statement line-item mapping and confidence/source references belong to that next screen.
