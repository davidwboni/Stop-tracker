# Pay Structure + Statement Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user enter his boss's per-period statement figures, have the app compute Gross → Total → VAT → Total-with-VAT exactly like the boss's own spreadsheet, cross-check DPD's day-by-day stop counts against the user's own logged stops, and hand the final amount straight to the invoice generator.

**Architecture:** A pure, fully-tested calculation module (`payPeriodCalculations.ts`) is the single source of truth for the tiered stop-rate, excess-parcel fee, period totals, and day-by-day comparison. A new `PayPeriodContext` persists pay-period records the same way `InvoiceContext` persists invoices (Firestore doc for real users, localStorage for guests). Three new UI components (`PayPeriodForm`, `PayPeriodResults`, `PayPeriodList`) replace the existing whole-period-only "Verify" tab. A pre-existing bug is fixed along the way: `PaymentConfig.jsx` (the rate settings screen) saves a `{ thresholds }` shape that `DataContext.jsx`/`QuickEntry.jsx` never actually read — this plan makes the whole app consistently use the `{ thresholds }` shape, since it already supports N tiers.

**Tech Stack:** React 18, Vitest (tests live under `src/__tests__/**`, see `vitest.config.ts`), Firebase Firestore, date-fns, existing `src/components/ui/*` primitives (Card, Button, Input, Label, Alert).

## Global Constraints

- Tests only run from `src/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}` (per `vitest.config.ts`) — new test files MUST live there, not next to their source file.
- New feature code lives under `src/features/payperiod/`, matching the existing (currently orphaned) `src/features/payperiod/periodUtils.ts`.
- Money math already verified against the user's real DPD statement: 176 stops → £315.48 (110×£1.98 + 66×£1.48), excess parcels × £0.05. Every calculation test below uses these exact real-world figures — don't substitute round numbers where a real figure is given.
- Do not touch `InvoiceComparison.jsx` — it's dead code (only referenced from the unused `StopTracker.js`), out of scope for this plan.
- Run `npm run test` (`vitest run`) after every task; all tests must pass before moving on.

---

## File Structure

**Create:**
- `src/features/payperiod/payPeriodCalculations.ts` — pure calculation + comparison engine
- `src/__tests__/payPeriodCalculations.test.ts` — its tests
- `src/features/payperiod/PayPeriodContext.jsx` — Firestore/localStorage persistence (mirrors `InvoiceContext.jsx`)
- `src/features/payperiod/PayPeriodForm.jsx` — new-period entry form
- `src/features/payperiod/PayPeriodResults.jsx` — comparison table + totals + "Generate Invoice"
- `src/features/payperiod/PayPeriodList.jsx` — history list, orchestrates Form/Results

**Modify:**
- `src/contexts/DataContext.jsx` — `paymentConfig` default shape (two places: real-user default, guest default); later gains a `normalizePaymentConfig` helper in Task 6
- `src/components/QuickEntry.jsx` — `calculateEarnings` uses the shared `calculateStopFee` instead of its own inline duplicate math (discovered during Task 5 to be dead code, fixed anyway at negligible cost)
- `src/components/Layout.jsx` — **(added during execution, not in original plan)** the real live "quick entry" handler (floating action button, `handleQuickEntry`) had the identical bug to `QuickEntry.jsx`; fixed the same way
- `src/components/PaymentSettings.jsx` — **(retargeted during execution from `PaymentConfig.jsx`, which turned out to be dead code — see Task 6)** add `excessParcelRate` field and migrate to the `{ thresholds }` shape
- `src/components/InvoicePage.jsx` — swap `InvoiceCompare` for `PayPeriodList`, add invoice prefill handoff
- `src/components/InvoiceGeneratorNew.jsx` — accept a `prefill` prop, skip double-applying VAT when prefilled
- `src/index.js` — wrap the app with `PayPeriodProvider`

**Known, deliberately out-of-scope findings from execution** (flagged as follow-ups, not fixed here): `StopEntryForm.jsx` has its own separate, unrelated flat-rate calculation (never reads `paymentConfig` in any shape); `PaymentConfig.jsx` is dead code (imported in `src/router/index.js:14`, never rendered on any route) and is left as-is.

---

### Task 1: Tiered stop-fee calculation

**Files:**
- Create: `src/features/payperiod/payPeriodCalculations.ts`
- Test: `src/__tests__/payPeriodCalculations.test.ts`

**Interfaces:**
- Produces: `calculateStopFee(stops: number, thresholds: Array<{ stopCount?: number; rate: number }>): number` — the last entry in `thresholds` has no `stopCount` (it's the overflow rate). Later tasks import this.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/payPeriodCalculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculateStopFee } from '../features/payperiod/payPeriodCalculations';

describe('calculateStopFee', () => {
  const thresholds = [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }];

  it('charges the base rate only when under the cutoff', () => {
    expect(calculateStopFee(97, thresholds)).toBeCloseTo(192.06, 2);
  });

  it('charges base + overflow rate when over the cutoff (real DPD data, 20th June)', () => {
    expect(calculateStopFee(112, thresholds)).toBeCloseTo(220.76, 2);
  });

  it('matches real DPD data for 19th June (176 stops)', () => {
    expect(calculateStopFee(176, thresholds)).toBeCloseTo(315.48, 2);
  });

  it('matches real DPD data for 18th June (147 stops)', () => {
    expect(calculateStopFee(147, thresholds)).toBeCloseTo(272.56, 2);
  });

  it('matches real DPD data for 17th June (157 stops)', () => {
    expect(calculateStopFee(157, thresholds)).toBeCloseTo(287.36, 2);
  });

  it('supports more than two tiers', () => {
    const threeTiers = [
      { stopCount: 110, rate: 1.98 },
      { stopCount: 150, rate: 1.70 },
      { rate: 1.48 },
    ];
    // 110*1.98 + 40*1.70 + 26*1.48 = 217.8 + 68 + 38.48 = 324.28
    expect(calculateStopFee(176, threeTiers)).toBeCloseTo(324.28, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- payPeriodCalculations`
Expected: FAIL — `payPeriodCalculations.ts` does not exist / `calculateStopFee` is not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/payperiod/payPeriodCalculations.ts

export interface PaymentTier {
  stopCount?: number;
  rate: number;
}

export function calculateStopFee(stops: number, thresholds: PaymentTier[]): number {
  let remaining = stops;
  let previousCap = 0;
  let total = 0;

  for (let i = 0; i < thresholds.length - 1; i++) {
    const tier = thresholds[i];
    const tierCap = tier.stopCount ?? previousCap;
    const tierStops = Math.min(remaining, tierCap - previousCap);
    if (tierStops <= 0) break;
    total += tierStops * tier.rate;
    remaining -= tierStops;
    previousCap = tierCap;
  }

  if (remaining > 0) {
    const overflowRate = thresholds[thresholds.length - 1].rate;
    total += remaining * overflowRate;
  }

  return total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- payPeriodCalculations`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/payperiod/payPeriodCalculations.ts src/__tests__/payPeriodCalculations.test.ts
git commit -m "feat: add tiered stop-fee calculation for pay period reconciliation"
```

---

### Task 2: Excess parcel fee + per-day total

**Files:**
- Modify: `src/features/payperiod/payPeriodCalculations.ts`
- Modify: `src/__tests__/payPeriodCalculations.test.ts`

**Interfaces:**
- Consumes: `calculateStopFee` from Task 1.
- Produces: `calculateExcessParcelFee(stops: number, totalParcels: number, excessParcelRate: number): number`; `DailyDpdEntry { date: string; stops: number; totalParcels: number }`; `PaymentConfig { thresholds: PaymentTier[]; excessParcelRate: number }`; `DayCalculation { date, stops, totalParcels, excessParcels, stopFee, parcelFee, dayTotal }`; `calculateDayTotal(entry: DailyDpdEntry, config: PaymentConfig): DayCalculation`. Later tasks import all of these.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/payPeriodCalculations.test.ts`:

```ts
import { calculateExcessParcelFee, calculateDayTotal } from '../features/payperiod/payPeriodCalculations';

describe('calculateExcessParcelFee', () => {
  it('matches real DPD data for 20th June (112 stops, 132 parcels)', () => {
    expect(calculateExcessParcelFee(112, 132, 0.05)).toBeCloseTo(1.00, 2);
  });

  it('matches real DPD data for 19th June (176 stops, 214 parcels)', () => {
    expect(calculateExcessParcelFee(176, 214, 0.05)).toBeCloseTo(1.90, 2);
  });

  it('matches real DPD data for 18th June (147 stops, 196 parcels)', () => {
    expect(calculateExcessParcelFee(147, 196, 0.05)).toBeCloseTo(2.45, 2);
  });

  it('matches real DPD data for 17th June (157 stops, 260 parcels)', () => {
    expect(calculateExcessParcelFee(157, 260, 0.05)).toBeCloseTo(5.15, 2);
  });

  it('never goes negative when total parcels is somehow less than stops', () => {
    expect(calculateExcessParcelFee(100, 90, 0.05)).toBe(0);
  });
});

describe('calculateDayTotal', () => {
  const config = {
    thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
    excessParcelRate: 0.05,
  };

  it('matches the real DPD "Total" column for 19th June exactly', () => {
    const day = calculateDayTotal({ date: '2026-06-19', stops: 176, totalParcels: 214 }, config);
    expect(day.stopFee).toBeCloseTo(315.48, 2);
    expect(day.parcelFee).toBeCloseTo(1.90, 2);
    expect(day.dayTotal).toBeCloseTo(317.38, 2);
    expect(day.excessParcels).toBe(38);
  });

  it('matches the real DPD "Total" column for 20th June exactly', () => {
    const day = calculateDayTotal({ date: '2026-06-20', stops: 112, totalParcels: 132 }, config);
    expect(day.dayTotal).toBeCloseTo(221.76, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- payPeriodCalculations`
Expected: FAIL — `calculateExcessParcelFee`/`calculateDayTotal` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/features/payperiod/payPeriodCalculations.ts`:

```ts
export interface DailyDpdEntry {
  date: string;
  stops: number;
  totalParcels: number;
}

export interface PaymentConfig {
  thresholds: PaymentTier[];
  excessParcelRate: number;
}

export interface DayCalculation {
  date: string;
  stops: number;
  totalParcels: number;
  excessParcels: number;
  stopFee: number;
  parcelFee: number;
  dayTotal: number;
}

export function calculateExcessParcelFee(
  stops: number,
  totalParcels: number,
  excessParcelRate: number
): number {
  const excessParcels = Math.max(0, totalParcels - stops);
  return excessParcels * excessParcelRate;
}

export function calculateDayTotal(entry: DailyDpdEntry, config: PaymentConfig): DayCalculation {
  const stopFee = calculateStopFee(entry.stops, config.thresholds);
  const excessParcels = Math.max(0, entry.totalParcels - entry.stops);
  const parcelFee = calculateExcessParcelFee(entry.stops, entry.totalParcels, config.excessParcelRate);

  return {
    date: entry.date,
    stops: entry.stops,
    totalParcels: entry.totalParcels,
    excessParcels,
    stopFee,
    parcelFee,
    dayTotal: stopFee + parcelFee,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- payPeriodCalculations`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/payperiod/payPeriodCalculations.ts src/__tests__/payPeriodCalculations.test.ts
git commit -m "feat: add excess-parcel fee and per-day total calculation"
```

---

### Task 3: Period totals aggregation

**Files:**
- Modify: `src/features/payperiod/payPeriodCalculations.ts`
- Modify: `src/__tests__/payPeriodCalculations.test.ts`

**Interfaces:**
- Consumes: `calculateDayTotal`, `DailyDpdEntry`, `PaymentConfig`, `DayCalculation` from Task 2.
- Produces: `PeriodTotals { days: DayCalculation[]; grossPayment: number; dpdCharge: number; adminFee: number; total: number; vat: number; totalWithVat: number }`; `calculatePeriodTotals(dailyEntries: DailyDpdEntry[], dpdCharge: number, adminFee: number, vatRate: number, config: PaymentConfig): PeriodTotals`. Later tasks (PayPeriodResults) import this.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/payPeriodCalculations.test.ts`:

```ts
import { calculatePeriodTotals } from '../features/payperiod/payPeriodCalculations';

describe('calculatePeriodTotals', () => {
  const config = {
    thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
    excessParcelRate: 0.05,
  };

  it('sums daily totals into gross payment, then applies charge/fee/VAT', () => {
    const dailyEntries = [
      { date: '2026-06-19', stops: 176, totalParcels: 214 }, // dayTotal 317.38
      { date: '2026-06-20', stops: 112, totalParcels: 132 }, // dayTotal 221.76
    ];
    // grossPayment = 317.38 + 221.76 = 539.14
    // total = 539.14 - 39.14 (dpdCharge) - 0 (adminFee) = 500.00
    // vat = 500.00 * 0.20 = 100.00
    // totalWithVat = 600.00
    const result = calculatePeriodTotals(dailyEntries, 39.14, 0, 0.20, config);

    expect(result.grossPayment).toBeCloseTo(539.14, 2);
    expect(result.total).toBeCloseTo(500.00, 2);
    expect(result.vat).toBeCloseTo(100.00, 2);
    expect(result.totalWithVat).toBeCloseTo(600.00, 2);
    expect(result.days).toHaveLength(2);
  });

  it('subtracts admin fee as well as DPD charge', () => {
    const dailyEntries = [{ date: '2026-06-19', stops: 176, totalParcels: 214 }];
    // grossPayment = 317.38; total = 317.38 - 10 - 7.38 = 300.00; vat = 60.00; totalWithVat = 360.00
    const result = calculatePeriodTotals(dailyEntries, 10, 7.38, 0.20, config);

    expect(result.total).toBeCloseTo(300.00, 2);
    expect(result.totalWithVat).toBeCloseTo(360.00, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- payPeriodCalculations`
Expected: FAIL — `calculatePeriodTotals` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/features/payperiod/payPeriodCalculations.ts`:

```ts
export interface PeriodTotals {
  days: DayCalculation[];
  grossPayment: number;
  dpdCharge: number;
  adminFee: number;
  total: number;
  vat: number;
  totalWithVat: number;
}

export function calculatePeriodTotals(
  dailyEntries: DailyDpdEntry[],
  dpdCharge: number,
  adminFee: number,
  vatRate: number,
  config: PaymentConfig
): PeriodTotals {
  const days = dailyEntries.map((entry) => calculateDayTotal(entry, config));
  const grossPayment = days.reduce((sum, day) => sum + day.dayTotal, 0);
  const total = grossPayment - dpdCharge - adminFee;
  const vat = total * vatRate;
  const totalWithVat = total + vat;

  return { days, grossPayment, dpdCharge, adminFee, total, vat, totalWithVat };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- payPeriodCalculations`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/payperiod/payPeriodCalculations.ts src/__tests__/payPeriodCalculations.test.ts
git commit -m "feat: add pay period totals aggregation (gross to VAT-inclusive total)"
```

---

### Task 4: Day-by-day comparison against logged stops

**Files:**
- Modify: `src/features/payperiod/payPeriodCalculations.ts`
- Modify: `src/__tests__/payPeriodCalculations.test.ts`

**Interfaces:**
- Consumes: `DailyDpdEntry` from Task 2.
- Produces: `ComparisonStatus = 'match' | 'mismatch' | 'missing-from-log' | 'missing-from-statement'`; `DayComparison { date: string; loggedStops: number | null; statementStops: number | null; status: ComparisonStatus; difference: number }`; `comparePeriodToLogs(dailyEntries: DailyDpdEntry[], logs: Array<{ date: string; stops: number }>): DayComparison[]`. `PayPeriodResults` (Task 8) imports this.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/payPeriodCalculations.test.ts`:

```ts
import { comparePeriodToLogs } from '../features/payperiod/payPeriodCalculations';

describe('comparePeriodToLogs', () => {
  const dailyEntries = [
    { date: '2026-06-19', stops: 176, totalParcels: 214 },
    { date: '2026-06-20', stops: 112, totalParcels: 132 },
  ];

  it('flags a match when logged stops equal statement stops', () => {
    const logs = [{ date: '2026-06-19', stops: 176 }];
    const result = comparePeriodToLogs(dailyEntries, logs);
    const day19 = result.find((d) => d.date === '2026-06-19');
    expect(day19?.status).toBe('match');
    expect(day19?.difference).toBe(0);
  });

  it('flags a mismatch and computes the difference', () => {
    const logs = [
      { date: '2026-06-19', stops: 176 },
      { date: '2026-06-20', stops: 100 },
    ];
    const result = comparePeriodToLogs(dailyEntries, logs);
    const day20 = result.find((d) => d.date === '2026-06-20');
    expect(day20?.status).toBe('mismatch');
    expect(day20?.difference).toBe(-12); // logged 100, statement says 112
  });

  it('flags a date missing from the log', () => {
    const logs = [{ date: '2026-06-19', stops: 176 }];
    const result = comparePeriodToLogs(dailyEntries, logs);
    const day20 = result.find((d) => d.date === '2026-06-20');
    expect(day20?.status).toBe('missing-from-log');
    expect(day20?.loggedStops).toBeNull();
  });

  it('flags a date missing from the statement', () => {
    const logs = [
      { date: '2026-06-19', stops: 176 },
      { date: '2026-06-20', stops: 112 },
      { date: '2026-06-21', stops: 50 },
    ];
    const result = comparePeriodToLogs(dailyEntries, logs);
    const day21 = result.find((d) => d.date === '2026-06-21');
    expect(day21?.status).toBe('missing-from-statement');
    expect(day21?.statementStops).toBeNull();
  });

  it('returns results sorted by date', () => {
    const logs = [{ date: '2026-06-19', stops: 176 }];
    const result = comparePeriodToLogs(dailyEntries, logs);
    expect(result.map((d) => d.date)).toEqual(['2026-06-19', '2026-06-20']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- payPeriodCalculations`
Expected: FAIL — `comparePeriodToLogs` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/features/payperiod/payPeriodCalculations.ts`:

```ts
export type ComparisonStatus = 'match' | 'mismatch' | 'missing-from-log' | 'missing-from-statement';

export interface DayComparison {
  date: string;
  loggedStops: number | null;
  statementStops: number | null;
  status: ComparisonStatus;
  difference: number;
}

export function comparePeriodToLogs(
  dailyEntries: DailyDpdEntry[],
  logs: Array<{ date: string; stops: number }>
): DayComparison[] {
  const dates = new Set<string>([
    ...dailyEntries.map((e) => e.date),
    ...logs.map((l) => l.date),
  ]);

  return Array.from(dates)
    .sort()
    .map((date) => {
      const statementEntry = dailyEntries.find((e) => e.date === date);
      const logEntry = logs.find((l) => l.date === date);

      const statementStops = statementEntry ? statementEntry.stops : null;
      const loggedStops = logEntry ? logEntry.stops : null;

      let status: ComparisonStatus;
      if (statementStops === null) {
        status = 'missing-from-statement';
      } else if (loggedStops === null) {
        status = 'missing-from-log';
      } else if (statementStops === loggedStops) {
        status = 'match';
      } else {
        status = 'mismatch';
      }

      return {
        date,
        loggedStops,
        statementStops,
        status,
        difference: (loggedStops ?? 0) - (statementStops ?? 0),
      };
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- payPeriodCalculations`
Expected: PASS (21 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/payperiod/payPeriodCalculations.ts src/__tests__/payPeriodCalculations.test.ts
git commit -m "feat: add day-by-day statement-vs-log comparison"
```

---

### Task 5: Fix payment config shape bug (DataContext + QuickEntry)

**Files:**
- Modify: `src/contexts/DataContext.jsx:25-29` and `:86-90`
- Modify: `src/components/QuickEntry.jsx:1-61`

**Interfaces:**
- Consumes: `calculateStopFee` from Task 1.
- Produces: `paymentConfig` shape everywhere in the app is now `{ thresholds: [{ stopCount, rate }, ..., { rate }], excessParcelRate: number }`. Task 6 (`PaymentConfig.jsx`) and Task 8 (`PayPeriodResults`, via `useData().paymentConfig`) rely on this shape.

**Why this is a bug fix, not new work:** `PaymentConfig.jsx` (the settings screen) already saves `{ thresholds: [...] }` to Firestore, but `DataContext.jsx` and `QuickEntry.jsx` only ever read `{ cutoffPoint, rateBeforeCutoff, rateAfterCutoff }` — a shape nothing writes. Rate changes made in Settings today silently do nothing. Since `thresholds` already supports N tiers (the richer, already-built UI), this task moves the readers to match it rather than dumbing down the settings screen.

- [ ] **Step 1: Update `DataContext.jsx`'s default `paymentConfig`**

In `src/contexts/DataContext.jsx`, replace lines 25-29:

```js
  const [paymentConfig, setPaymentConfig] = useState({
    cutoffPoint: 110,
    rateBeforeCutoff: 1.98,
    rateAfterCutoff: 1.48
  });
```

with:

```js
  const [paymentConfig, setPaymentConfig] = useState({
    thresholds: [
      { stopCount: 110, rate: 1.98 },
      { rate: 1.48 }
    ],
    excessParcelRate: 0.05
  });
```

- [ ] **Step 2: Update the guest-user default in the same file**

Replace lines 86-90:

```js
            setPaymentConfig(guestConfig ? JSON.parse(guestConfig) : {
              cutoffPoint: 110,
              rateBeforeCutoff: 1.98,
              rateAfterCutoff: 1.48
            });
```

with:

```js
            setPaymentConfig(guestConfig ? JSON.parse(guestConfig) : {
              thresholds: [
                { stopCount: 110, rate: 1.98 },
                { rate: 1.48 }
              ],
              excessParcelRate: 0.05
            });
```

- [ ] **Step 3: Update `QuickEntry.jsx` to use the shared calculation**

In `src/components/QuickEntry.jsx`, add the import at line 1-6 (after existing imports):

```js
import { calculateStopFee } from "../features/payperiod/payPeriodCalculations";
```

Replace the `calculateEarnings` function (lines 46-61):

```js
  const calculateEarnings = (stopCount, extraPay = 0) => {
    if (!stopCount) return 0;

    const config = paymentConfig || {
      thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
      excessParcelRate: 0.05
    };

    return calculateStopFee(stopCount, config.thresholds) + (parseFloat(extraPay) || 0);
  };
```

- [ ] **Step 4: Run the full test suite to confirm nothing broke**

Run: `npm run test`
Expected: PASS — all existing tests plus the 21 `payPeriodCalculations` tests still pass.

- [ ] **Step 5: Manually verify in the dev server**

Run: `npm start`, sign in as a guest, open the dashboard's Quick Entry widget, type `176` in Stops. Expected: "Estimated Earnings" shows **£315.48** (matches the real DPD figure verified in Task 1).

- [ ] **Step 6: Commit**

```bash
git add src/contexts/DataContext.jsx src/components/QuickEntry.jsx
git commit -m "fix: use the thresholds-based payment config shape everywhere (settings changes now actually apply)"
```

---

### Task 6: Migrate the real settings screen (PaymentSettings.jsx) to the new shape

> **Retargeted during execution (user-approved):** the plan originally named
> `PaymentConfig.jsx`, but Task 5's implementer discovered it is unreachable
> dead code (imported in `src/router/index.js:14` but never rendered on any
> route). The actual live settings screen, routed at `/app/settings` via
> `PaymentSettingsWrapper`, is `src/components/PaymentSettings.jsx` — and it
> still reads/writes the *old* flat shape (`cutoffPoint`, `rateBeforeCutoff`,
> `rateAfterCutoff`) directly to/from Firestore. This task migrates that
> component instead. `PaymentConfig.jsx` is left untouched (dead code cleanup
> is a separate, later concern, not part of this plan).

**Files:**
- Modify: `src/components/PaymentSettings.jsx`
- Modify: `src/contexts/DataContext.jsx` (defensive normalization so a pre-existing old-shape Firestore document doesn't crash `calculateStopFee` elsewhere in the app)

**Interfaces:**
- Consumes: nothing new — this task closes the loop on Task 5's shape change by fixing the one remaining writer of the old shape.
- Produces: `PaymentSettings.jsx` now persists `{ thresholds, excessParcelRate }` to Firestore, reading either shape (self-healing on next save if an old-shape document exists). `DataContext.jsx` gains a `normalizePaymentConfig(config)` helper so any code path that loads a raw Firestore/localStorage document — old shape or new — always yields `{ thresholds, excessParcelRate }` before it reaches `paymentConfig` in context, protecting `calculateStopFee` call sites in `QuickEntry.jsx` and `Layout.jsx` from crashing on `undefined thresholds`.

**Why the DataContext.jsx change belongs here:** Task 5 changed the *defaults* `DataContext.jsx` uses when no document/field exists, but a real user who saved custom rates through `PaymentSettings.jsx` *before* this fix would have an old-shape document already sitting in Firestore. Task 5's code loads that raw document as-is with no reshaping — `calculateStopFee(stops, config.thresholds)` would receive `undefined` and throw. Fixing the settings screen's shape without also defending the read path would leave that crash in place for exactly the users this whole fix is meant to help.

- [ ] **Step 1: Read the current file first**

Read `src/components/PaymentSettings.jsx` in full before editing — this task's line references may have drifted; match by the surrounding code shown below, not by line number alone.

- [ ] **Step 2: Add an `excessParcelRate` state field**

After the existing `paymentConfig` state declaration:

```js
  const [paymentConfig, setPaymentConfig] = useState({
    cutoffPoint: 110,
    rateBeforeCutoff: 1.98,
    rateAfterCutoff: 1.48,
  });
```

add:

```js
  const [excessParcelRate, setExcessParcelRate] = useState(0.05);
```

Keep `paymentConfig`'s three existing fields as the UI's working state (this screen only ever exposed one cutoff tier — that's unchanged; this task fixes what shape it persists to, not the UI's tier model).

- [ ] **Step 3: Normalize on load, accepting either shape**

Replace the body of `fetchPaymentConfig`'s Firestore branch:

```js
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const config = userDoc.data().paymentConfig || {};
          setPaymentConfig({
            cutoffPoint: config.cutoffPoint || 110,
            rateBeforeCutoff: config.rateBeforeCutoff || 1.98,
            rateAfterCutoff: config.rateAfterCutoff || 1.48,
          });
        }
```

with:

```js
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const config = userDoc.data().paymentConfig || {};

          if (config.thresholds && config.thresholds.length > 0) {
            const firstTier = config.thresholds[0];
            const lastTier = config.thresholds[config.thresholds.length - 1];
            setPaymentConfig({
              cutoffPoint: firstTier.stopCount ?? 110,
              rateBeforeCutoff: firstTier.rate ?? 1.98,
              rateAfterCutoff: lastTier.rate ?? 1.48,
            });
          } else {
            setPaymentConfig({
              cutoffPoint: config.cutoffPoint || 110,
              rateBeforeCutoff: config.rateBeforeCutoff || 1.98,
              rateAfterCutoff: config.rateAfterCutoff || 1.48,
            });
          }

          setExcessParcelRate(config.excessParcelRate ?? 0.05);
        }
```

- [ ] **Step 4: Save in the new shape**

Replace the Firestore write in `handleSave`:

```js
      await updateDoc(doc(db, "users", userId), {
        paymentConfig: paymentConfig,
        updatedAt: new Date().toISOString()
      });

      setSuccess("Payment settings saved successfully!");
      if (onSettingsSaved) onSettingsSaved(paymentConfig);
```

with:

```js
      const configToSave = {
        thresholds: [
          { stopCount: paymentConfig.cutoffPoint, rate: paymentConfig.rateBeforeCutoff },
          { rate: paymentConfig.rateAfterCutoff }
        ],
        excessParcelRate
      };

      await updateDoc(doc(db, "users", userId), {
        paymentConfig: configToSave,
        updatedAt: new Date().toISOString()
      });

      setSuccess("Payment settings saved successfully!");
      if (onSettingsSaved) onSettingsSaved(configToSave);
```

Also update the guest branch a few lines above it (`if (user?.isGuest) { ...; if (onSettingsSaved) onSettingsSaved(paymentConfig); ... }`) to build and pass the same `configToSave` shape, so guests and real users hand the same shape to `onSettingsSaved`.

- [ ] **Step 5: Check how `onSettingsSaved` is consumed**

Read `src/components/PaymentSettingsWrapper.jsx` (the component that renders `PaymentSettings` and supplies `onSettingsSaved`). If it writes the callback's argument to `localStorage` or passes it into `DataContext` in a way that assumes the old flat shape, update that one call site to expect `{ thresholds, excessParcelRate }` instead. If it just re-fetches from `DataContext` after saving and doesn't touch the shape itself, no change is needed there — note which case applies in your report.

- [ ] **Step 6: Add the excess-parcel-rate input to the UI**

After the "Rate After Cutoff" field block and before the "Example Calculation" block, add a field following this screen's existing `Label`/`Input` pattern (matching the styling already used for the two rate fields above it):

```jsx
            {/* Excess Parcel Rate */}
            <div className="space-y-2">
              <Label htmlFor="excessParcelRate" className="text-base font-semibold">
                Excess Parcel Fee
              </Label>
              <p className="text-sm text-muted-foreground">
                Payment per parcel beyond one per stop
              </p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-primary">£</span>
                <Input
                  id="excessParcelRate"
                  name="excessParcelRate"
                  type="number"
                  value={excessParcelRate}
                  onChange={(e) => setExcessParcelRate(parseFloat(e.target.value) || 0)}
                  className="bg-input border-border focus:ring-2 focus:ring-primary max-w-xs"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-muted-foreground">per excess parcel</span>
              </div>
            </div>
```

- [ ] **Step 7: Add a normalization helper to `DataContext.jsx`**

Read the current `src/contexts/DataContext.jsx` first (Task 5 already changed the default `useState` values and guest fallback; match by surrounding content). Above the `DataProvider` component definition, add:

```js
const normalizePaymentConfig = (config) => {
  if (!config) {
    return {
      thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
      excessParcelRate: 0.05
    };
  }
  if (config.thresholds) return config;

  // Legacy flat shape from before the thresholds migration — convert on the fly.
  return {
    thresholds: [
      { stopCount: config.cutoffPoint ?? 110, rate: config.rateBeforeCutoff ?? 1.98 },
      { rate: config.rateAfterCutoff ?? 1.48 }
    ],
    excessParcelRate: config.excessParcelRate ?? 0.05
  };
};
```

Then wrap every place that sets `paymentConfig` from a raw loaded value (not the two `useState` defaults Task 5 already fixed — those are already correct) with this helper. There are three such call sites: the real-user Firestore load (`if (mainUserDoc.exists() && mainUserDoc.data().paymentConfig) { setPaymentConfig(mainUserDoc.data().paymentConfig); }`), the guest localStorage load (`if (guestConfig) setPaymentConfig(JSON.parse(guestConfig));` inside `forceSync`), and the force-refresh path (`if (refreshedData && refreshedData.paymentConfig) { setPaymentConfig(refreshedData.paymentConfig); }`). In each case, wrap the value passed to `setPaymentConfig` with `normalizePaymentConfig(...)`.

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: PASS — 30 existing tests (payPeriodCalculations + periodUtils), no regressions. This task adds no new automated tests (no existing precedent for testing these Firestore-backed components in this codebase — matches the convention already established in Task 5).

- [ ] **Step 9: Manually verify in the dev server**

Run: `npm start`, sign in (a real account, not guest, so the Firestore path is exercised — use whatever test account is available, or guest if that's all that's available and note which you used), navigate to Settings (`/app/settings`), change "Excess Parcel Fee" to `0.06` and one of the rate fields, click Save, reload the page. Expected: all fields — including the new one — still show the changed values after reload. Then check the app doesn't crash on load (dashboard/Quick Entry still work) to confirm the normalization path is safe.

- [ ] **Step 10: Commit**

```bash
git add src/components/PaymentSettings.jsx src/contexts/DataContext.jsx
git commit -m "fix: migrate the live settings screen (PaymentSettings.jsx) to the thresholds shape, with backward-compat normalization"
```

If `PaymentSettingsWrapper.jsx` also needed a change per Step 5, include it in this same commit.

---

### Task 7: PayPeriodContext persistence

**Files:**
- Create: `src/features/payperiod/PayPeriodContext.jsx`
- Modify: `src/index.js`

**Interfaces:**
- Produces: `usePayPeriods(): { payPeriods: Array<PayPeriodRecord>, loading: boolean, addPayPeriod(data): Promise<PayPeriodRecord>, updatePayPeriod(id, updates): Promise<void>, deletePayPeriod(id): Promise<void> }` where `PayPeriodRecord = { id, fromDate, toDate, payDate, dailyEntries: DailyDpdEntry[], dpdCharge, adminFee, vatRate, invoiceId, createdAt }`. Task 8's `PayPeriodList`/`PayPeriodForm` import `usePayPeriods`.

- [ ] **Step 1: Create the context, mirroring `InvoiceContext.jsx`'s pattern**

```jsx
// src/features/payperiod/PayPeriodContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PayPeriodContext = createContext();

export const usePayPeriods = () => {
  const context = useContext(PayPeriodContext);
  if (!context) {
    throw new Error("usePayPeriods must be used within a PayPeriodProvider");
  }
  return context;
};

export const PayPeriodProvider = ({ children }) => {
  const { user } = useAuth();
  const [payPeriods, setPayPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        if (user.isGuest) {
          const saved = localStorage.getItem(`pay_periods_${user.uid}`);
          if (saved) setPayPeriods(JSON.parse(saved));
        } else {
          const payPeriodDoc = await getDoc(doc(db, "payPeriodData", user.uid));
          if (payPeriodDoc.exists()) {
            setPayPeriods(payPeriodDoc.data().payPeriods || []);
          }
        }
      } catch (error) {
        console.error("Error loading pay period data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const saveData = async (newPayPeriods) => {
    if (!user) return;

    try {
      if (user.isGuest) {
        localStorage.setItem(`pay_periods_${user.uid}`, JSON.stringify(newPayPeriods));
      } else {
        await setDoc(
          doc(db, "payPeriodData", user.uid),
          { payPeriods: newPayPeriods, updatedAt: new Date() },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("Error saving pay period data:", error);
      throw error;
    }
  };

  const addPayPeriod = async (periodData) => {
    const newPeriod = {
      ...periodData,
      id: periodData.id || Date.now().toString(),
      invoiceId: periodData.invoiceId || null,
      createdAt: new Date().toISOString(),
    };
    const newPayPeriods = [newPeriod, ...payPeriods];
    setPayPeriods(newPayPeriods);
    await saveData(newPayPeriods);
    return newPeriod;
  };

  const updatePayPeriod = async (periodId, updates) => {
    const newPayPeriods = payPeriods.map((p) => (p.id === periodId ? { ...p, ...updates } : p));
    setPayPeriods(newPayPeriods);
    await saveData(newPayPeriods);
  };

  const deletePayPeriod = async (periodId) => {
    const newPayPeriods = payPeriods.filter((p) => p.id !== periodId);
    setPayPeriods(newPayPeriods);
    await saveData(newPayPeriods);
  };

  const value = { payPeriods, loading, addPayPeriod, updatePayPeriod, deletePayPeriod };

  return <PayPeriodContext.Provider value={value}>{children}</PayPeriodContext.Provider>;
};
```

- [ ] **Step 2: Wire the provider into the app**

In `src/index.js`, add the import after line 9:

```js
import { PayPeriodProvider } from './features/payperiod/PayPeriodContext';
```

Replace lines 23-27:

```js
        <DataProvider>
          <InvoiceProvider>
            <RouterProvider router={router} />
          </InvoiceProvider>
        </DataProvider>
```

with:

```js
        <DataProvider>
          <PayPeriodProvider>
            <InvoiceProvider>
              <RouterProvider router={router} />
            </InvoiceProvider>
          </PayPeriodProvider>
        </DataProvider>
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: PASS — no existing tests touch this file, so the count is unchanged from Task 4 (21 `payPeriodCalculations` tests), and nothing else regresses.

- [ ] **Step 4: Manually verify the app still boots**

Run: `npm start`. Expected: app loads to the login/dashboard as before, no console errors about missing context providers.

- [ ] **Step 5: Commit**

```bash
git add src/features/payperiod/PayPeriodContext.jsx src/index.js
git commit -m "feat: add PayPeriodContext for persisting pay period reconciliation records"
```

---

### Task 8: Pay period UI (form, results, list) wired into the Invoice page

**Files:**
- Create: `src/features/payperiod/PayPeriodForm.jsx`
- Create: `src/features/payperiod/PayPeriodResults.jsx`
- Create: `src/features/payperiod/PayPeriodList.jsx`
- Modify: `src/components/InvoicePage.jsx`

**Interfaces:**
- Consumes: `usePayPeriods` (Task 7), `calculatePeriodTotals`/`comparePeriodToLogs` (Tasks 3-4), `useData` (existing `DataContext`, for `logs`/`paymentConfig`).
- Produces: `PayPeriodList` accepts a prop `onGenerateInvoice(prefill: { amount: number; startDate: string; endDate: string }): void`, called when the user clicks "Generate Invoice" in `PayPeriodResults`. Task 9 (`InvoiceGeneratorNew`) consumes that `prefill` shape.

This is a UI-wiring task with no existing precedent for component-level tests in this codebase (`InvoiceContext`/`DataContext`-backed components have zero test coverage today) — verification here is manual, via the dev server, matching how the rest of the Invoice page is verified. The calculation logic it displays is already fully covered by Tasks 1-4.

- [ ] **Step 1: Create `PayPeriodForm.jsx`**

```jsx
// src/features/payperiod/PayPeriodForm.jsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Plus, Trash2, Calculator } from "lucide-react";
import { usePayPeriods } from "./PayPeriodContext";

const emptyRow = () => ({ date: "", stops: "", totalParcels: "" });

const PayPeriodForm = ({ onSaved, onCancel }) => {
  const { addPayPeriod } = usePayPeriods();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [payDate, setPayDate] = useState("");
  const [dailyRows, setDailyRows] = useState([emptyRow()]);
  const [dpdCharge, setDpdCharge] = useState("");
  const [adminFee, setAdminFee] = useState("");
  const [vatRate, setVatRate] = useState("0.20");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const updateRow = (index, field, value) => {
    const newRows = [...dailyRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setDailyRows(newRows);
  };

  const addRow = () => setDailyRows([...dailyRows, emptyRow()]);

  const removeRow = (index) => setDailyRows(dailyRows.filter((_, i) => i !== index));

  const handleSave = async () => {
    setError("");

    if (!fromDate || !toDate || !payDate) {
      setError("Please fill in the period dates");
      return;
    }

    const validRows = dailyRows.filter((row) => row.date && row.stops !== "");
    if (validRows.length === 0) {
      setError("Add at least one daily entry");
      return;
    }

    setIsSaving(true);

    try {
      const dailyEntries = validRows.map((row) => ({
        date: row.date,
        stops: parseInt(row.stops, 10) || 0,
        totalParcels: parseInt(row.totalParcels, 10) || 0,
      }));

      const period = await addPayPeriod({
        fromDate,
        toDate,
        payDate,
        dailyEntries,
        dpdCharge: parseFloat(dpdCharge) || 0,
        adminFee: parseFloat(adminFee) || 0,
        vatRate: parseFloat(vatRate) || 0.2,
      });

      onSaved(period);
    } catch (err) {
      console.error("Error saving pay period:", err);
      setError("Error saving pay period. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          New Pay Period
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pp-from">From Date</Label>
            <Input id="pp-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-to">To Date</Label>
            <Input id="pp-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-pay">Pay Date</Label>
            <Input id="pp-pay" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Daily Entries (from your boss's statement)</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Day
            </Button>
          </div>

          {dailyRows.map((row, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={row.date} onChange={(e) => updateRow(index, "date", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stops</Label>
                <Input type="number" value={row.stops} onChange={(e) => updateRow(index, "stops", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Parcels</Label>
                <Input
                  type="number"
                  value={row.totalParcels}
                  onChange={(e) => updateRow(index, "totalParcels", e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => removeRow(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pp-charge">DPD Charge (£)</Label>
            <Input id="pp-charge" type="number" step="0.01" value={dpdCharge} onChange={(e) => setDpdCharge(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-admin">Admin Fee (£)</Label>
            <Input id="pp-admin" type="number" step="0.01" value={adminFee} onChange={(e) => setAdminFee(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pp-vat">VAT Rate</Label>
            <Input id="pp-vat" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? "Calculating..." : "Calculate & Save"}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PayPeriodForm;
```

- [ ] **Step 2: Create `PayPeriodResults.jsx`**

```jsx
// src/features/payperiod/PayPeriodResults.jsx
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { calculatePeriodTotals, comparePeriodToLogs } from "./payPeriodCalculations";
import { useData } from "../../contexts/DataContext";

const STATUS_LABEL = {
  match: "Match",
  mismatch: "Mismatch",
  "missing-from-log": "Missing from your log",
  "missing-from-statement": "Missing from statement",
};

const STATUS_COLOR = {
  match: "text-emerald-600",
  mismatch: "text-destructive",
  "missing-from-log": "text-amber-600",
  "missing-from-statement": "text-amber-600",
};

const PayPeriodResults = ({ period, onGenerateInvoice }) => {
  const { logs, paymentConfig } = useData();

  const totals = useMemo(
    () => calculatePeriodTotals(period.dailyEntries, period.dpdCharge, period.adminFee, period.vatRate, paymentConfig),
    [period, paymentConfig]
  );

  const comparison = useMemo(() => comparePeriodToLogs(period.dailyEntries, logs || []), [period, logs]);

  const hasDiscrepancy = comparison.some((day) => day.status !== "match");

  return (
    <div className="space-y-4">
      {hasDiscrepancy ? (
        <Alert className="bg-destructive/10 border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Discrepancy found — review the daily breakdown below.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-emerald-500/10 border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <AlertDescription className="text-emerald-500">Every day matches your logged stops.</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Daily Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {comparison.map((day) => (
              <div key={day.date} className="flex items-center justify-between p-2 bg-muted rounded border border-border/50">
                <span className="text-sm">{format(parseISO(day.date), "EEE, dd MMM yyyy")}</span>
                <span className="text-sm">Yours: {day.loggedStops ?? "—"}</span>
                <span className="text-sm">Statement: {day.statementStops ?? "—"}</span>
                <span className={`text-sm font-semibold ${STATUS_COLOR[day.status]}`}>{STATUS_LABEL[day.status]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Payment Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Gross Payment</span>
            <span>£{totals.grossPayment.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>DPD Charge</span>
            <span>-£{totals.dpdCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Admin Fee</span>
            <span>-£{totals.adminFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
            <span>Total</span>
            <span>£{totals.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT ({(period.vatRate * 100).toFixed(0)}%)</span>
            <span>£{totals.vat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
            <span>Total with VAT</span>
            <span>£{totals.totalWithVat.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() =>
          onGenerateInvoice({
            amount: totals.totalWithVat,
            startDate: period.fromDate,
            endDate: period.toDate,
          })
        }
        className="w-full gap-2"
      >
        <FileText className="h-4 w-4" />
        Generate Invoice for £{totals.totalWithVat.toFixed(2)}
      </Button>
    </div>
  );
};

export default PayPeriodResults;
```

- [ ] **Step 3: Create `PayPeriodList.jsx`**

```jsx
// src/features/payperiod/PayPeriodList.jsx
import React, { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Plus, ArrowLeft, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { usePayPeriods } from "./PayPeriodContext";
import PayPeriodForm from "./PayPeriodForm";
import PayPeriodResults from "./PayPeriodResults";

const PayPeriodList = ({ onGenerateInvoice }) => {
  const { payPeriods, loading } = usePayPeriods();
  const [view, setView] = useState("list"); // 'list' | 'form' | 'results'
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const handleSaved = (period) => {
    setSelectedPeriod(period);
    setView("results");
  };

  const handleSelectPeriod = (period) => {
    setSelectedPeriod(period);
    setView("results");
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading pay periods...</p>;
  }

  if (view === "form") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <PayPeriodForm onSaved={handleSaved} onCancel={() => setView("list")} />
      </div>
    );
  }

  if (view === "results" && selectedPeriod) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Pay Periods
        </Button>
        <PayPeriodResults period={selectedPeriod} onGenerateInvoice={onGenerateInvoice} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setView("form")} className="w-full gap-2">
        <Plus className="h-4 w-4" />
        New Pay Period
      </Button>

      {payPeriods.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No pay periods yet. Add one to compare your logged stops against your boss's statement.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payPeriods.map((period) => (
            <Card
              key={period.id}
              className="border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleSelectPeriod(period)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {format(parseISO(period.fromDate), "dd MMM")} - {format(parseISO(period.toDate), "dd MMM yyyy")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PayPeriodList;
```

- [ ] **Step 4: Wire `PayPeriodList` into `InvoicePage.jsx` in place of `InvoiceCompare`**

In `src/components/InvoicePage.jsx`, replace line 6:

```js
import InvoiceCompare from "./InvoiceCompare";
```

with:

```js
import PayPeriodList from "../features/payperiod/PayPeriodList";
```

Replace lines 82-91 (the `verify` `TabsContent` block):

```jsx
        <TabsContent value="verify" className="mt-6">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PayPeriodList onGenerateInvoice={handleGenerateInvoice} />
          </motion.div>
        </TabsContent>
```

Update the tab label at lines 49-53 from "Verify"/"Check" to "Reconcile"/"Check":

```jsx
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Reconcile</span>
            <span className="sm:hidden">Check</span>
          </TabsTrigger>
```

Add the `handleGenerateInvoice` handler and `prefillInvoice` state — after line 14 (`const isPro = ...`):

```js
  const [prefillInvoice, setPrefillInvoice] = useState(null);

  const handleGenerateInvoice = (prefill) => {
    setPrefillInvoice(prefill);
    setActiveTab("create");
  };
```

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS — 21 `payPeriodCalculations` tests, no regressions.

- [ ] **Step 6: Manually verify the end-to-end flow in the dev server**

Run: `npm start`, sign in as guest, go to Invoice → Reconcile tab. Click "New Pay Period", enter: From `2026-06-15`, To `2026-06-21`, Pay Date `2026-06-26`, one daily row (Date `2026-06-19`, Stops `176`, Total Parcels `214`), DPD Charge `39.14`, Admin Fee `0`, VAT Rate `0.20`. Click "Calculate & Save". Expected: results view shows Gross Payment **£317.38**, Total **£278.24**, Total with VAT **£333.89**, and the daily comparison row shows "Missing from your log" (since no log entry exists yet for that date in a fresh guest account).

- [ ] **Step 7: Commit**

```bash
git add src/features/payperiod/PayPeriodForm.jsx src/features/payperiod/PayPeriodResults.jsx src/features/payperiod/PayPeriodList.jsx src/components/InvoicePage.jsx
git commit -m "feat: add pay period reconciliation UI, replacing whole-period-only Verify tab"
```

---

### Task 9: Invoice handoff (prefill amount, avoid double-VAT)

**Files:**
- Modify: `src/components/InvoiceGeneratorNew.jsx`
- Modify: `src/components/InvoicePage.jsx`

**Interfaces:**
- Consumes: `prefillInvoice` state and `handleGenerateInvoice` from Task 8 (`InvoicePage.jsx`).
- Produces: `InvoiceGeneratorNew` now accepts `prefill?: { amount: number; startDate: string; endDate: string }`. When set, the invoice amount/dates are pre-filled and VAT is not recalculated on top of the (already VAT-inclusive) prefilled amount.

- [ ] **Step 1: Pass `prefillInvoice` into `InvoiceGeneratorNew` from `InvoicePage.jsx`**

In `src/components/InvoicePage.jsx`, replace line 64:

```jsx
              <InvoiceGeneratorNew />
```

with:

```jsx
              <InvoiceGeneratorNew prefill={prefillInvoice} />
```

- [ ] **Step 2: Accept the `prefill` prop in `InvoiceGeneratorNew.jsx`**

Replace line 34:

```js
const InvoiceGeneratorNew = () => {
```

with:

```js
const InvoiceGeneratorNew = ({ prefill }) => {
```

- [ ] **Step 3: Add a `skipVat` flag and an effect that applies the prefill**

After line 57 (`const [showClientForm, setShowClientForm] = useState(false);`), add:

```js
  const [skipVat, setSkipVat] = useState(false);
```

After the existing "Auto-populate next invoice number" `useEffect` (lines 87-91), add:

```js
  // Apply prefill from pay period reconciliation (amount is already VAT-inclusive)
  useEffect(() => {
    if (prefill) {
      setInvoiceAmount(prefill.amount.toFixed(2));
      setInvoiceStartDate(prefill.startDate);
      setInvoiceEndDate(prefill.endDate);
      setSkipVat(true);
    }
  }, [prefill]);
```

- [ ] **Step 4: Skip VAT recalculation when `skipVat` is true**

Replace lines 298-300:

```js
      const subtotal = parseFloat(invoiceAmount);
      const vat = vatNumber ? (subtotal * 0.2).toFixed(2) : 0;
      const total = (subtotal + parseFloat(vat)).toFixed(2);
```

with:

```js
      const subtotal = parseFloat(invoiceAmount);
      const vat = skipVat ? 0 : (vatNumber ? (subtotal * 0.2).toFixed(2) : 0);
      const total = skipVat ? subtotal.toFixed(2) : (subtotal + parseFloat(vat)).toFixed(2);
```

- [ ] **Step 5: Reset `skipVat` in `handleReset`**

In the `handleReset` function (lines 390-397), add:

```js
    setSkipVat(false);
```

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: PASS — no regressions.

- [ ] **Step 7: Manually verify the end-to-end handoff**

Run: `npm start`, repeat Task 8 Step 6's reconciliation flow, then click "Generate Invoice for £333.89". Expected: the Invoice page switches to the "Create" tab, with Invoice Amount pre-filled as `333.89` and the start/end dates matching the pay period. Fill in a client name and click "Download PDF". Expected: the generated PDF's total is exactly **£333.89** with no additional VAT line added on top.

- [ ] **Step 8: Commit**

```bash
git add src/components/InvoiceGeneratorNew.jsx src/components/InvoicePage.jsx
git commit -m "feat: hand off computed pay-period total straight into invoice creation"
```

---

## Self-Review Notes

- **Spec coverage:** Data model (Task 7), calculation engine + excess-parcel fix (Tasks 1-2, 5-6), comparison logic (Task 4), UI/screens (Task 8), invoice handoff incl. double-VAT guard (Task 9), edge cases — partial periods and missing-day flags are handled by `comparePeriodToLogs`'s three-way status (Task 4) and by `PayPeriodForm` allowing any number of rows (Task 8). All spec sections have a task.
- **Placeholder scan:** none found — every step has complete, runnable code.
- **Type/name consistency:** `DailyDpdEntry`, `PaymentConfig`, `PaymentTier`, `DayCalculation`, `PeriodTotals`, `DayComparison`/`ComparisonStatus` are defined once (Tasks 1-4) and referenced with identical names/shapes in Tasks 8-9. `usePayPeriods()`'s returned shape (Task 7) matches exactly what `PayPeriodForm`/`PayPeriodList` (Task 8) call (`addPayPeriod`, `payPeriods`, `loading`). `onGenerateInvoice`'s `{ amount, startDate, endDate }` shape is produced in Task 8 (`PayPeriodResults`) and consumed identically in Task 9 (`InvoicePage`/`InvoiceGeneratorNew`'s `prefill` prop).
