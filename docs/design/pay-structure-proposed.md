# Pay Structure — next screen, awaiting approval

Purpose: define how new daily records calculate expected work earnings and contractor fees. Manual entry remains free and is the default. No Pro promotion, receipt upload, business-expense entry, or personal tax computation on this screen.

One focused form (no bottom nav during initial setup): Back + Pay structure; short purpose line; pay method select (Per stop, Day rate, Tiered per stop, Hourly, Per mile, Sliding scale) showing Per stop in this mockup. Selected model reveals only relevant fields. Rate per stop £2.08. Optional excess parcels toggle and £0.05 rate. Optional contractor deduction toggle and 6% rate; no global default fee. New users start with unknown/blank rate and toggles off, not these illustrative example values. Show “Applied to work earnings before expenses” so deduction order is explicit.

Collapsible Advanced pay rules retains model-specific tiers/mileage tables; tiered/sliding selected models must reveal their required fields automatically. Distinguish marginal tiers from a rate for all stops with a worked example before saving. Fixed period charges are recorded in Expenses as contractor charges (recurring if approved) and must not be deducted a second time here. No arbitrary rules engine in this release.

Live deterministic example card labelled “Example only · Not saved”: 120 stops + 38 excess parcels; work earnings £251.50; contractor fee −£15.09; after fee £236.41; before expenses and personal tax. Preview values are not stored and never sent to AI or analytics. Invalid/incomplete fields show an incomplete preview rather than a £0 estimate. Do not claim this is confirmed pay.

Sticky Save pay structure button, 48px minimum. Existing saved days keep their original rate snapshots. New entries use this saved structure; a newly entered past day must show which rate it is using and permit choosing the applicable older saved structure before saving (needed Quick Entry integration when implementing). No silent repricing of history. Saving from onboarding continues to existing completion/walkthrough; editing returns to the originating screen. Changed pay type must immediately update the prompt for new daily work. Switching pay methods preserves unsaved per-method drafts until save or confirmed discard.

Optional AI help can live as a secondary “Help me set this up” action, only when configured; it must return an editable proposal and use the same deterministic validation. Manual setup never depends on AI. Not shown as an extra upload pane in the approved single-screen mockup proposal.

States: first-use blank setup; returning saved values; skeleton while loading; save pending prevents repeats; errors preserve draft; offline signed-in changes stay unsaved with clear status, guest local-save label. Back/close guards unsaved edits. Percentage range 0–100; monetary rates nonnegative, explicit required zero rates supported with clear preview; tier overlaps/gaps and matrix completeness validated before save.

Platforms: 16px decimal inputs, numeric keyboard, native selects, safe-area sticky footer and keyboard viewport resizing on iOS/PWA/Capacitor; Android Back hides keyboard before discard prompt. Desktop 560px form with optional adjacent example at wide widths. Accessible labels, 44px+ targets, visible focus, error association; no colour-only meaning. 150–200ms optional-field expansion and preview highlight; no rolling counters; reduced-motion disables transitions.

Analytics: pay_setup_started, pay_model_selected, pay_setup_validation_failed, pay_setup_completed, pay_setup_abandoned (consent, enum source/model/error type only). No rates, percentages, employer information or described terms. Store structured versioned rates and snapshot selected version on every saved day; no employer name needed. Existing historic data without a fee snapshot must be labelled unknown and reviewed explicitly.

Approval decision: this simple form, editable per-driver fee, worked example and preserved historical rates. Version selection for newly logged past work is a necessary integration, not a silent history migration. Final tier/matrix editing details must be documented before implementing those variants; preserve current supported structures.

Model field contract for this proposal:
- Per stop: one GBP/stop rate; quantity × rate.
- Day rate: one GBP/day rate; worked day on/off in Quick Entry.
- Hourly: one GBP/hour rate; hours may contain decimals.
- Per mile: GBP/mile plus optional daily base payment; miles may contain decimals.
- Tiered per stop: ascending stop caps and rate per band, final unlimited band. Current supported interpretation is marginal bands (each block of stops has its own rate), not a cliff that reprices all stops. Show this wording and two values on either side of a threshold in the example.
- Sliding scale: existing stop/mileage bands and rate matrix, labelled “Rate for all stops” to distinguish it from marginal bands. Editable band controls require ordered unique boundaries; every matrix cell must be filled. Selected stop and mileage bands highlight the preview lookup. Model-required controls cannot stay hidden behind Advanced.

The optional Advanced disclosure on the flat-rate mockup offers explanations and switching into tiered/sliding arrangements; it must never silently add a cutoff to flat per-stop pay. A future simplified implementation may omit that row when it adds no useful action. No capability outside these supported models is promised as a working custom formula editor.
