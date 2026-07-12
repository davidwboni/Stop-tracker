# Configurable Pay Structure — Design

**Date:** 2026-07-12
**Status:** Approved for planning
**Author:** David + Claude (brainstorming)

## Problem

Stop Tracker currently hard-codes one pay model: DPD tiered per-stop (£1.98/stop to 110,
then £1.48, plus an excess-parcel rate). Every other kind of delivery driver — flat per-stop,
per-mile, hourly, day-rate — cannot use the app, and even DPD drivers on different vans have
different mileage structures. The one existing settings screen (`PaymentSettings.jsx`) is
DPD-only **and unreachable** (no nav/Profile link to `/app/settings`), so users can't even
change their rates.

## Vision

**AI-first setup.** When a user signs up, they're asked one question — "How do you get paid?" —
and answer in **plain language, in any language** ("I get £1.70 per stop until 150, then 90p",
"me pagan £145 al día"), or **upload a mileage sheet as a PDF/photo**. The AI interprets it once
into a structured pay config, shows a **worked-example quality check** ("180 stops = £282.00 —
correct?"), and on confirmation resolves into a polished **welcome animation**. From then on the
daily screen is "the usual" — the hero field matches their pay type (stops / miles / hours / a
day-rate tick), plus the familiar optional "Extra £".

**Core safety principle:** *the AI reads the pay description once to fill in the structure; it
never does daily arithmetic.* All payday math runs in deterministic, unit-tested code. This keeps
income numbers trustworthy even though an LLM was involved in setup.

## The five underlying pay models

The AI (or a manual editor) always resolves a description into exactly one of these structured
shapes. Users never pick from this list directly — it's what the config *is*, under the hood.

| Model | Daily main field | Config params | Daily earnings |
|---|---|---|---|
| `tiered_stops` | stops | `thresholds: PaymentTier[]`, `excessParcelRate` | `calculateStopFee(stops, thresholds)` |
| `flat_stops` | stops | `ratePerStop`, `excessParcelRate?` | `stops * ratePerStop` |
| `per_mile` | miles | `ratePerMile`, `baseFee?` | `baseFee + miles * ratePerMile` |
| `hourly` | hours | `ratePerHour` | `hours * ratePerHour` |
| `per_day` | (a "worked today?" tick) | `ratePerDay` | `ratePerDay` |
| `sliding_scale` | stops **and** miles | `stopBands[]`, `mileBands[]`, `rateMatrix[][]` | `stops * lookupRate(stops, miles)` |

`sliding_scale` is a real, common DPD structure (e.g. the "e3.5tn Standard Sliding Scale"): a 2D
lookup where the £-per-stop rate depends on **both** the stop count (rows) and the mileage
(columns), and daily pay is `stops × rate[stopBand][mileBand]`. It is the reason the upload path
matters — no fixed menu of single-axis models can express a matrix; an AI transcribing the grid
can. It is the one model that needs **two** daily inputs (stops and miles) rather than one.

Every model also adds the universal optional **`extra`** (£) the user types (bonuses, tips,
waiting time). Daily total is always `modelEarnings(inputs) + extra`.

## Data model

A single discriminated shape, stored where `paymentConfig` lives today (Firestore main user doc
`paymentConfig` field; `guestConfig_<uid>` in localStorage for guests):

```js
PayStructure = {
  model: 'tiered_stops' | 'flat_stops' | 'per_mile' | 'hourly' | 'per_day',
  // tiered_stops:
  thresholds?: PaymentTier[],      // [{ stopCount: 150, rate: 1.70 }, { rate: 0.90 }]
  excessParcelRate?: number,       // tiered_stops / flat_stops
  // flat_stops:
  ratePerStop?: number,
  // per_mile:
  ratePerMile?: number,
  baseFee?: number,
  // hourly:
  ratePerHour?: number,
  // per_day:
  ratePerDay?: number,
  // sliding_scale (2D lookup, e.g. DPD e3.5tn):
  stopBands?: number[],     // row headers, ascending, e.g. [5,10,15,...,300]
  mileBands?: number[],     // column headers, ascending, e.g. [10,20,...,300]
  rateMatrix?: number[][],  // rateMatrix[rowIndex][colIndex] = £ per stop
}
```

### Backward compatibility (critical, low-risk)

`DataContext.normalizePaymentConfig()` is already the single choke point every consumer passes
through, and already upgrades a legacy flat shape to `{ thresholds, excessParcelRate }`. We add
**one rule**: a config with **no `model` key** is treated as `model: 'tiered_stops'`. Every
existing user (and the DPD default) silently becomes `tiered_stops` with their exact current
rates, and every downstream consumer keeps working unchanged. No data migration job; the upgrade
happens on read, exactly as the existing legacy upgrade does.

### Daily log storage (decision)

Today each log row is `{ id, date, stops, extra, total, notes, timestamp }`, and Stats / Invoice
read `log.stops` and `log.total` directly.

**v1 decision:** keep storing the primary daily quantity in the existing **`stops`** field
regardless of model (miles/hours live in `stops`; `per_day` stores `stops: 1`), and keep `total`
as the computed daily earnings. This avoids rippling a field rename through Stats, Invoice, and
reconciliation. The field name is an internal misnomer for non-stop models; the UI label is driven
by the model, so users never see "stops" for a mileage driver. A future cleanup can introduce a
neutral `quantity`/`unit` pair. Documented here so it's a deliberate choice, not an accident.

**Second input for `sliding_scale`.** This is the one model that needs a second daily number
(miles). Store it in a new optional **`miles`** field on the log row (`stops` still holds the stop
count, so Stats/Invoice keep reading `stops`/`total` unchanged). `miles` is written only for
sliding-scale entries and ignored elsewhere.

## Components / architecture

### New: pay calculator (`src/features/payperiod/payStructure.ts`)

Pure, unit-tested. `calculateDayEarnings(config: PayStructure, inputs: { quantity: number; miles?: number }): number`
dispatches on `config.model`, reuses the existing `calculateStopFee` for `tiered_stops`, and does a
2-axis band lookup for `sliding_scale` (`lookupRate(stops, miles, config)` → `stops * rate`). Also
exports `PAY_MODELS` metadata (id, main-field label(s), unit(s), whether a second `miles` input is
needed, which params it stores) so the setup UI and the daily form are data-driven rather than
hard-coding a branch per model.

### New: AI interpretation (Firebase Function + client)

- **`functions/interpretPayStructure`** — a callable Firebase Function that takes `{ text }` or
  `{ fileBase64, mimeType }` (PDF or image), calls the Claude API with a system prompt describing the
  six models + the JSON schema, and returns a validated `PayStructure` plus a plain-English summary
  and a worked example. The API key lives in Function config (never in the client bundle). Runs only
  at setup/edit — cost is a fraction of a penny per call. **Model choice:** a vision-capable model is
  required because sliding-scale sheets arrive as images/PDFs; use `claude-opus-4-8` (or another
  current vision model) for the transcription so the rate grid is captured accurately — the accuracy
  of a whole pay table is worth more than the sub-penny saving of a smaller model, and it still runs
  only at setup. Transcribing a full matrix is the hardest thing the AI does here, which is exactly
  why the worked-example confirm exists.
- **Client:** the describe/upload UI calls the Function, renders the summary + worked example for
  confirmation, and on "Looks right" saves the returned `PayStructure`. On "Not quite", the user
  rewords, or falls through to the manual field editor.
- **Any language:** the model interprets meaning, so non-English descriptions need no special
  handling — noted in the system prompt.
- **Never trust the AI for arithmetic:** the worked example shown to the user is computed by the
  deterministic `calculateDayEarnings`, *not* by the LLM, so the confirm step is a true check.

### Changed: setup surface

- **Onboarding:** a first-run "How do you get paid?" step (describe box + PDF/photo upload) shown
  once for new users, before they reach the dashboard. Resolves to the welcome animation.
- **Profile:** a new **"Pay Structure"** row linking to the setup screen (fixes the current
  unreachable `/app/settings`). Same describe-or-edit experience for changing rates later.
- **`/app/settings`** (`PaymentSettingsWrapper`) becomes the model-aware editor: it shows the AI
  describe box **and** the manual field editor for the active model (the manual editor is also the
  "edit" fallback from the AI confirm step, and the guest path where the Function isn't called).

### Changed: daily entry (`StopEntryForm.jsx`)

Reads the active model from `paymentConfig` and swaps its hero input's label/type accordingly
(stops number / miles number / hours number / a day-rate tick). For `sliding_scale` it shows **two**
inputs — stops **and** miles — and the estimate is `stops × lookedUpRate`. The live estimate always
uses `calculateDayEarnings`. The "Extra £" and notes fields are unchanged.

### New: welcome animation

After the quality-check confirm, a Framer-Motion welcome moment matching the app's spring-y, teal,
rounded feel: a check-mark springs in with a ring pulse, then a staggered "You're all set" +
personalised pay-summary pill + "Start tracking" button. Copy/summary personalise to the chosen
model. (Detailed timing/confetti/sign-in placement to be refined during build.)

## Scope boundary (v1)

- **"Check Pay" invoice reconciliation stays stop-specific.** It's DPD/parcel-coupled; non-stop
  models simply don't surface it in v1.
- **First-run tutorial is the final phase.** Coach-marks (spotlight + tooltip) guiding the user
  through their *real* first entry — deliberately **not** seeded "test" data (which would force an
  exclude-flag through every total/stat/invoice calc and risk corrupting income numbers). Built
  last, once the screens it points at are final.

## Build phases

1. **Foundation** — `PayStructure` type (all six models), `calculateDayEarnings` + `PAY_MODELS` +
   the `sliding_scale` band lookup, extend `normalizePaymentConfig` (legacy → `tiered_stops`), unit
   tests (including the `Sliding Scale.pdf` grid as a fixture). No UI change; existing behaviour
   identical.
2. **Config editing surface** — model-aware manual editor at `/app/settings`; add reachable
   "Pay Structure" row in Profile. Shippable/testable with no AI.
3. **Daily entry field-swap** — `StopEntryForm` hero field(s) + estimate driven by model, including
   the two-input (stops + miles) `sliding_scale` case.
4. **AI-assisted setup** — `interpretPayStructure` Function + describe/upload UI + worked-example
   confirm; becomes the onboarding front door. (Requires an Anthropic API key with billing on the
   Function — user-provided.)
5. **Welcome animation** — Framer-Motion completion moment.
6. **First-run tutorial (final)** — coach-marks over the real daily screen.

## Prerequisites / open items

- **Anthropic API key with billing** for the Function (Phase 4). User provides; stored in Firebase
  Function config, never in the client.
- **Sliding-scale band-lookup rule** — when a day's exact stops/miles fall between table bands
  (e.g. 176 stops at 85 miles), decide the rule: nearest band, round-down, or interpolate. Confirm
  against a few of the reference driver's real paid days before finalising `lookupRate`. The
  worked-example confirm step surfaces any mismatch.
- Exact onboarding trigger (new-user detection already exists via `isNewUser` in `DataContext`).
- Welcome-animation fine details (timing, sign-in placement) — refined in Phase 5.

## Reference materials

- `Sliding Scale.pdf` (DPD "e3.5tn Standard Sliding Scale") — a real `sliding_scale` example:
  stops 5–300 (rows) × miles 10–300 (columns), each cell the £-per-stop rate, daily pay =
  `stops × rate`. Kept as the canonical test fixture for the sliding-scale calculator and the
  AI transcription.
