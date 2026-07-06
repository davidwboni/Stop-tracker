# Pay Structure + Statement Reconciliation — Design

## Background

David is a subcontracted delivery driver working under a fleet operator ("the boss"), who
has DPD portal access David does not. Every 4-week pay period, the boss forwards:

1. DPD's self-billed invoice to the boss's company (stops-based earnings for the period)
2. DPD's invoice of charges back to the boss's company (lease, insurance, fuel, mileage)
3. The boss's own tracking spreadsheet, which nets these into a final `Total with VAT` —
   the exact figure David needs to invoice the boss for
4. A screenshot of DPD's day-by-day breakdown for David's van/round, which only the boss
   can see directly

David's recurring pain: manually cross-checking his own daily logs against the boss's
statement to catch missing or undercounted days, then manually typing the resulting
amount into an invoice.

Verified against real data the user provided: the app's existing `paymentConfig`
(tiered per-stop rate — 110 stops at £1.98, remainder at £1.48) exactly matches DPD's
actual published rate. The one missing piece is an excess-parcel fee: DPD also charges
`(Total Parcels − Stops) × £0.05` per day, and today's daily entry form has no
`totalParcels` field to compute it from.

This is Phase 1 of a larger roadmap (see "Out of scope" below for later phases).

## Goals

- Let David enter his boss's per-period figures (daily stops/parcels, DPD charge, admin
  fee) and have the app compute Gross → Total → VAT → Total-with-VAT exactly as the
  boss's spreadsheet does.
- Compare DPD's day-by-day stop counts against David's own logged stops for the same
  dates, flagging mismatches and missing days.
- Hand the final computed amount directly to the invoice generator instead of manual
  entry.
- Keep a persistent history of past pay periods (not a disposable one-off calculator).

## Data model

New per-user record set, `payPeriods`, stored the same way `invoiceData` is today
(one Firestore document per user, array of periods; guest users get localStorage):

```
{
  id: string,
  fromDate: string (ISO date),
  toDate: string (ISO date),
  payDate: string (ISO date),
  dailyEntries: [
    { date: string (ISO date), stops: number, totalParcels: number }
  ],
  dpdCharge: number,
  adminFee: number,
  vatRate: number,       // default 0.20, editable
  invoiceId: string | null,  // set once an invoice has been generated from this period
  createdAt: string (ISO timestamp)
}
```

Derived values (computed on read via `useMemo`, never persisted, so correcting a rate
later doesn't silently rewrite history):

- Per day: `excessParcels = totalParcels - stops`
- Per day: `stopFee = tieredRate(stops)` using `paymentConfig`
- Per day: `parcelFee = excessParcels * paymentConfig.excessParcelRate`
- Per day: `dayTotal = stopFee + parcelFee`
- `grossPayment = sum(dayTotal)` across `dailyEntries`
- `total = grossPayment - dpdCharge - adminFee`
- `vat = total * vatRate`
- `totalWithVat = total + vat`

## Calculation engine changes

Extend `paymentConfig` (currently `{ cutoffPoint, rateBeforeCutoff, rateAfterCutoff }`)
with one new field: `excessParcelRate` (default `0.05`). The existing tiered-rate logic
in `QuickEntry.jsx` is confirmed correct and is reused as-is for `stopFee`.

**Pre-existing bug to fix as part of this work:** `PaymentConfig.jsx` (the settings
screen) persists a different shape (`{ thresholds: [...] }`) than what
`DataContext.jsx` / `QuickEntry.jsx` actually read (`{ cutoffPoint, rateBeforeCutoff,
rateAfterCutoff }`) under the same Firestore field, `paymentConfig`. Rate changes made
in the settings screen today do not affect calculated totals. Since this phase adds
`excessParcelRate` to the same config, the settings screen must be reconciled to the
flat shape (or the flat shape's readers updated to consume `thresholds`) so the new
field actually works. Pick whichever shape is simpler to extend to N tiers in future;
do not carry both shapes forward.

## Comparison logic

For each `date` in a pay period's `dailyEntries`, look up David's own logged entry for
that date (from `DataContext.logs`) and compare `stops`. Three outcomes per date:

- **Match**: logged stops == DPD-reported stops
- **Mismatch**: both exist but differ (flag the delta and the resulting fee difference)
- **Missing**: a date exists in one source but not the other (flag explicitly — do not
  treat as a zero and silently include it in totals)

This is a stops-only comparison; DPD's own day-level Total figure is not
independently re-verified in this phase (see Out of scope).

## UI / screens

Replace the current "Verify" sub-tab of the Invoice page (today's `InvoiceCompare.jsx`,
which only compares whole-period totals) with:

- **History list**: past pay periods as cards — period dates, `totalWithVat`, and a
  match/discrepancy badge.
- **New Period form**: from/to/pay dates, a row-by-row daily entry table (date, stops,
  total parcels) matching the boss's screenshot layout, plus `dpdCharge` and `adminFee`
  fields.
- **Results view**: day-by-day comparison table (date | your stops | DPD stops |
  status), followed by the Gross → Total → VAT → Total-with-VAT breakdown.
- **Generate Invoice** button: navigates to the invoice creator with amount and period
  dates pre-filled from `totalWithVat`.

## Invoice handoff

`totalWithVat` is already VAT-inclusive. The invoice generator currently computes its
own VAT based on the *client's* VAT number field (a pre-existing bug — VAT liability
depends on whether the issuer is VAT-registered, not the client). To avoid double-
applying VAT when handing off from a pay period, the pre-filled amount must bypass the
invoice generator's own VAT calculation for this flow (e.g. pass the amount as already
final, or pass subtotal and VAT as separate pre-filled fields). Fixing the underlying
client-vs-issuer VAT bug is deferred to Phase 2 (invoice-out improvements).

## Edge cases

- Partial periods (bank holidays, fewer working days than usual) are allowed — no
  requirement to fill every date in the range.
- A date present in DPD's data but absent from David's own log (or vice versa) is
  shown as "missing," never silently treated as matching/zero.
- `dpdCharge` and `adminFee` are entered once per period (not per day), matching how
  the boss's spreadsheet presents them.

## Out of scope (later phases)

- OCR/PDF/paste-import of the boss's screenshot (Phase 1 fast-follow, only pursued once
  it's confirmed the portal table can actually be copy-pasted as text rather than only
  screenshotted).
- Independently re-verifying DPD's own per-day Total arithmetic (currently trusted at
  face value; only the stop counts are cross-checked against David's log).
- Fleet Manager mode (multi-driver dashboard, van tracking, bulk invoice-out) — a
  separate, larger subsystem for later, after this phase is validated in daily use.
- Freemium/ads monetization.
- Go-to-market/marketing plan — a separate business deliverable, not a code spec.
- Mileage tracking for personal tax/expense purposes (noted as a possible future
  feature; the `Route`/`Mileage` columns in DPD's daily data are not used here).
