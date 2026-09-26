# Approved Home implementation

Approved by the owner in chat on 27 September 2026. Based on main 785cb2147e7d17c35f06744bef4761104f85c11b.

## User intent
Record today's work; understand its estimated value. Today: work quantity, relevant excess parcels, estimated take-home, compact gross/after-fee/expenses breakdown. Expand calculations on demand. Weekly gross, current pay period, manual expense and records links are secondary. Persistent Quick Entry above mobile navigation. Desktop constrained columns and five-item navigation rail. Light/dark theme tokens, 44px+ targets, safe areas and reduced motion.

## Financial contract
- Gross is the stored entry total, never silently repriced by current settings.
- New and edited entries save payStructureSnapshot when calculation uses known rates.
- Contractor fee is explicitly configurable on Pay Structure (0–100%, gross including extras). Nothing hard-codes 6%.
- Legacy entries without saved fees expose their known gross, not invented take-home. Changing financial input explicitly uses current settings and warns first.
- Calculate in pennies. Approved example: 120 × £2.08 + 38 × £0.05 + £30 = £281.50; 6% = £16.89; after fee £264.61; dated expenses £45.20; take-home £219.41.
- Daily expenses include only that date; periodOnly charges are excluded. Contractor percentage is separate from expense rows.
- No loaded expenses is distinct from expense-load failure. Take-home is suppressed if expense data is unavailable.
- Weekly card explicitly means gross earned so far, not forecast or net.
- Legacy reconciled status previously represented comparison completion, so Home conservatively says Checked rather than certifying payment receipt/resolution.

## Persistence and privacy
- Guest work/expenses stored under user-specific local keys. No automatic sample ledger writes. Walkthrough examples remain UI-only.
- Expenses use users/{uid}/expenses/{stableId}, protected by existing user-isolation rules. Source is contractor_charge or my_expense. No upload/receipt retention introduced.
- Manual expense retries reuse an ID. Signed-in expense saving requires connectivity and awaits server confirmation; offline form remains unsaved. Full expense offline queue belongs to later review.
- Delivery-log failure propagates; local saved work is labelled pending where applicable. Server failure enters the existing sync queue.
- Money masking preference is device local. No values sent through analytics. Event allowlist requires explicit local analytics consent and an already configured PostHog instance. No new analytics service, autocapture or replay is enabled.

## Scope
Home is implemented. Existing Quick Entry received only prerequisite fixes (load existing entry, preserve ID, error propagation, parcels, pay-model quantity, pay snapshot, focus-trapped dialog). Its visual redesign is proposed next, not pre-approved.
MoneyHomeBridge is a functional range/expenses destination, not the final Money redesign. Documents currently opens invoice tools; document archive design is later. Recurring matching, fixed deductions, templates, AI and bank-payment confirmation are not introduced.

## Verification
Production build and focused financial/component tests are run for this change. Local browser attempt is blocked by environment socket permissions. Do not describe iOS/Android/desktop visual rendering as verified. Before release: run the isolated e2e/home-preview Vite harness and actual guest/signed-in flows on mobile browsers; verify Firestore failure, offline sync, keyboard and safe-area behaviour. This change is not a dedicated security audit.

## Next screen: Quick Entry (proposed)
One focused sheet, no bottom navigation while editing. Date always selectable. Stops + total parcels; excess derived. Parcels may remain unknown (never silently assumed); missing parcel earnings labelled. Extra-work off by default; optional type, amount and notes. Gross and after-fee preview labelled Estimated/before expenses and personal tax. Save becomes Save changes for existing day. Inline validation preserves inputs. No AI/API cost for calculations. Design approval required before its visual overhaul.
