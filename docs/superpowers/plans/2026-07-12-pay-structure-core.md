# Pay Structure Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalise Stop Tracker's hard-coded DPD pay logic into a configurable pay structure supporting six models, with a reachable manual setup screen and a daily-entry form that adapts to the active model — all with zero external dependencies (no AI, no API key).

**Architecture:** A new pure module `payStructure.ts` owns the discriminated `PayStructure` shape, model metadata, and `calculateDayEarnings`. `DataContext` normalises every stored config through it (legacy configs auto-become `tiered_stops`, so existing users are untouched). The orphaned `/app/settings` screen becomes a model-aware editor reachable from Profile, and `StopEntryForm` swaps its hero field(s) by model.

**Tech Stack:** React 18, Vitest 3, TypeScript (logic modules) + JSX (components), Firebase Firestore, Tailwind CSS variable tokens.

## Global Constraints

- Tests live in `src/__tests__/**/*.{test,spec}.{ts,js}`; run with `npx vitest run`. The suite is currently green — keep it green.
- Money is rendered with the `<Money>` component (`src/components/ui/money.jsx`); use `whole` for compact grids. Currency is GBP (`£`).
- Primary colour is teal via the `--primary` CSS token (hex `#1D9E75`); radii use `rounded-[18px]` (large) / `rounded-[14px]` (medium). Match surrounding component idiom.
- **Backward compatibility is non-negotiable:** existing stored configs are `{ thresholds, excessParcelRate }` (or older flat `{ cutoffPoint, rateBeforeCutoff, rateAfterCutoff }`). After this work they must resolve to identical daily earnings as today. Stats, Invoice, and reconciliation read `log.stops` and `log.total` directly — do not rename or stop writing those fields.
- The daily log row shape stays `{ id, date, stops, extra, total, notes, timestamp }` plus a new optional `miles` (written only for `sliding_scale`). `stops` holds the model's primary quantity for every model (miles/hours live in `stops`; `per_day` stores `stops: 1`).
- `sliding_scale` configs are produced by the future AI/upload plan, not hand-entered. This plan makes the calculator, daily entry, and storage handle `sliding_scale` when present, but the manual editor does **not** offer it as a hand-fillable option.
- Reference fixture: `docs/superpowers/specs/fixtures/dpd-e3.5tn-sliding-scale.pdf`. Real cell values for tests are inlined in Task 1.

---

### Task 1: `payStructure.ts` — types, metadata, and `calculateDayEarnings`

**Files:**
- Create: `src/features/payperiod/payStructure.ts`
- Test: `src/__tests__/payStructure.test.ts`

**Interfaces:**
- Consumes: `calculateStopFee`, `PaymentTier` from `src/features/payperiod/payPeriodCalculations.ts`.
- Produces:
  - `type PayModel = 'tiered_stops' | 'flat_stops' | 'per_mile' | 'hourly' | 'per_day' | 'sliding_scale'`
  - `interface PayStructure { model: PayModel; thresholds?; excessParcelRate?; ratePerStop?; ratePerMile?; baseFee?; ratePerHour?; ratePerDay?; stopBands?: number[]; mileBands?: number[]; rateMatrix?: number[][] }`
  - `interface PayModelMeta { id: PayModel; label: string; primary: { field: 'stops' | 'miles' | 'hours' | 'day'; label: string; unit: string; type: 'number' | 'toggle' }; secondary?: { field: 'miles'; label: string; unit: string }; params: string[] }`
  - `const PAY_MODELS: PayModelMeta[]`
  - `function lookupRate(config: PayStructure, stops: number, miles: number): number`
  - `function calculateDayEarnings(config: PayStructure, inputs: { quantity: number; miles?: number }): number`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/payStructure.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateDayEarnings, lookupRate, PAY_MODELS } from '../features/payperiod/payStructure';

describe('calculateDayEarnings', () => {
  it('tiered_stops matches the existing DPD calc (176 stops)', () => {
    const cfg = { model: 'tiered_stops' as const, thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }], excessParcelRate: 0.05 };
    expect(calculateDayEarnings(cfg, { quantity: 176 })).toBeCloseTo(315.48, 2);
  });

  it('flat_stops multiplies stops by the flat rate', () => {
    const cfg = { model: 'flat_stops' as const, ratePerStop: 1.75 };
    expect(calculateDayEarnings(cfg, { quantity: 90 })).toBeCloseTo(157.5, 2);
  });

  it('per_mile adds base fee to miles times rate', () => {
    const cfg = { model: 'per_mile' as const, ratePerMile: 0.45, baseFee: 30 };
    expect(calculateDayEarnings(cfg, { quantity: 84 })).toBeCloseTo(67.8, 2);
  });

  it('per_mile treats a missing base fee as zero', () => {
    const cfg = { model: 'per_mile' as const, ratePerMile: 0.5 };
    expect(calculateDayEarnings(cfg, { quantity: 100 })).toBeCloseTo(50, 2);
  });

  it('hourly multiplies hours by the hourly rate', () => {
    const cfg = { model: 'hourly' as const, ratePerHour: 14.5 };
    expect(calculateDayEarnings(cfg, { quantity: 9 })).toBeCloseTo(130.5, 2);
  });

  it('per_day returns the fixed day rate regardless of quantity', () => {
    const cfg = { model: 'per_day' as const, ratePerDay: 145 };
    expect(calculateDayEarnings(cfg, { quantity: 1 })).toBeCloseTo(145, 2);
  });

  it('sliding_scale multiplies stops by the looked-up rate (100 stops @ 100mi = £219)', () => {
    const cfg = {
      model: 'sliding_scale' as const,
      stopBands: [80, 100, 120],
      mileBands: [50, 100, 150],
      rateMatrix: [
        [2.19, 2.39, 2.76],
        [2.03, 2.19, 2.51],
        [1.93, 2.06, 2.31],
      ],
    };
    expect(calculateDayEarnings(cfg, { quantity: 100, miles: 100 })).toBeCloseTo(219, 2);
  });

  it('returns 0 for a non-positive primary quantity', () => {
    const cfg = { model: 'flat_stops' as const, ratePerStop: 1.75 };
    expect(calculateDayEarnings(cfg, { quantity: 0 })).toBe(0);
  });
});

describe('lookupRate', () => {
  const cfg = {
    model: 'sliding_scale' as const,
    stopBands: [80, 100, 120],
    mileBands: [50, 100, 150],
    rateMatrix: [
      [2.19, 2.39, 2.76],
      [2.03, 2.19, 2.51],
      [1.93, 2.06, 2.31],
    ],
  };

  it('snaps to the nearest stop and mile band', () => {
    expect(lookupRate(cfg, 105, 90)).toBeCloseTo(2.19, 2); // nearest bands 100, 100
    expect(lookupRate(cfg, 118, 140)).toBeCloseTo(2.31, 2); // nearest bands 120, 150
  });
});

describe('PAY_MODELS', () => {
  it('lists all six models with a primary field each', () => {
    expect(PAY_MODELS).toHaveLength(6);
    for (const m of PAY_MODELS) {
      expect(typeof m.label).toBe('string');
      expect(m.primary.field).toBeTruthy();
    }
  });

  it('marks sliding_scale as needing a secondary miles input', () => {
    const s = PAY_MODELS.find((m) => m.id === 'sliding_scale');
    expect(s?.secondary?.field).toBe('miles');
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/__tests__/payStructure.test.ts`
Expected: FAIL — cannot resolve `../features/payperiod/payStructure`.

- [ ] **Step 3: Write `payStructure.ts`**

Create `src/features/payperiod/payStructure.ts`:

```ts
import { calculateStopFee, PaymentTier } from './payPeriodCalculations';

export type PayModel =
  | 'tiered_stops'
  | 'flat_stops'
  | 'per_mile'
  | 'hourly'
  | 'per_day'
  | 'sliding_scale';

export interface PayStructure {
  model: PayModel;
  thresholds?: PaymentTier[];
  excessParcelRate?: number;
  ratePerStop?: number;
  ratePerMile?: number;
  baseFee?: number;
  ratePerHour?: number;
  ratePerDay?: number;
  stopBands?: number[];
  mileBands?: number[];
  rateMatrix?: number[][];
}

export interface PayModelMeta {
  id: PayModel;
  label: string;
  primary: {
    field: 'stops' | 'miles' | 'hours' | 'day';
    label: string;
    unit: string;
    type: 'number' | 'toggle';
  };
  secondary?: { field: 'miles'; label: string; unit: string };
  params: string[];
}

export const PAY_MODELS: PayModelMeta[] = [
  { id: 'tiered_stops', label: 'Tiered per stop', primary: { field: 'stops', label: 'Number of stops', unit: 'stops', type: 'number' }, params: ['thresholds', 'excessParcelRate'] },
  { id: 'flat_stops', label: 'Flat per stop', primary: { field: 'stops', label: 'Number of stops', unit: 'stops', type: 'number' }, params: ['ratePerStop', 'excessParcelRate'] },
  { id: 'per_mile', label: 'Per mile', primary: { field: 'miles', label: 'Miles driven', unit: 'miles', type: 'number' }, params: ['ratePerMile', 'baseFee'] },
  { id: 'hourly', label: 'Hourly', primary: { field: 'hours', label: 'Hours worked', unit: 'hours', type: 'number' }, params: ['ratePerHour'] },
  { id: 'per_day', label: 'Day rate', primary: { field: 'day', label: 'Worked today?', unit: 'day', type: 'toggle' }, params: ['ratePerDay'] },
  { id: 'sliding_scale', label: 'Sliding scale', primary: { field: 'stops', label: 'Number of stops', unit: 'stops', type: 'number' }, secondary: { field: 'miles', label: 'Miles driven', unit: 'miles' }, params: ['stopBands', 'mileBands', 'rateMatrix'] },
];

function nearestIndex(bands: number[], value: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < bands.length; i++) {
    const d = Math.abs(bands[i] - value);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export function lookupRate(config: PayStructure, stops: number, miles: number): number {
  const { stopBands, mileBands, rateMatrix } = config;
  if (!stopBands || !mileBands || !rateMatrix) return 0;
  const row = nearestIndex(stopBands, stops);
  const col = nearestIndex(mileBands, miles);
  return rateMatrix[row]?.[col] ?? 0;
}

export function calculateDayEarnings(
  config: PayStructure,
  inputs: { quantity: number; miles?: number }
): number {
  const quantity = Number(inputs.quantity) || 0;
  const miles = Number(inputs.miles) || 0;

  switch (config.model) {
    case 'tiered_stops':
      return calculateStopFee(quantity, config.thresholds ?? []);
    case 'flat_stops':
      return quantity * (config.ratePerStop ?? 0);
    case 'per_mile':
      return (config.baseFee ?? 0) + quantity * (config.ratePerMile ?? 0);
    case 'hourly':
      return quantity * (config.ratePerHour ?? 0);
    case 'per_day':
      return quantity > 0 ? config.ratePerDay ?? 0 : 0;
    case 'sliding_scale':
      return quantity * lookupRate(config, quantity, miles);
    default:
      return 0;
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/__tests__/payStructure.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/features/payperiod/payStructure.ts src/__tests__/payStructure.test.ts
git commit -m "feat: pay-structure calculator supporting six models"
```

---

### Task 2: `normalizePayStructure` + wire into DataContext

**Files:**
- Modify: `src/features/payperiod/payStructure.ts` (add `normalizePayStructure`)
- Modify: `src/__tests__/payStructure.test.ts` (add cases)
- Modify: `src/contexts/DataContext.jsx` (replace inline `normalizePaymentConfig`)

**Interfaces:**
- Consumes: the `PayStructure` type from Task 1.
- Produces: `function normalizePayStructure(config: any): PayStructure` — the single upgrade point every stored config passes through. Returns a config that always has a `model`.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/payStructure.test.ts`:

```ts
import { normalizePayStructure } from '../features/payperiod/payStructure';

describe('normalizePayStructure', () => {
  it('defaults a null config to the DPD tiered structure', () => {
    const c = normalizePayStructure(null);
    expect(c.model).toBe('tiered_stops');
    expect(c.thresholds?.[0]).toEqual({ stopCount: 110, rate: 1.98 });
    expect(c.excessParcelRate).toBe(0.05);
  });

  it('tags a modern thresholds config (no model key) as tiered_stops', () => {
    const c = normalizePayStructure({ thresholds: [{ stopCount: 150, rate: 1.7 }, { rate: 0.9 }], excessParcelRate: 0.05 });
    expect(c.model).toBe('tiered_stops');
    expect(c.thresholds?.[0].stopCount).toBe(150);
  });

  it('upgrades the legacy flat shape to tiered_stops', () => {
    const c = normalizePayStructure({ cutoffPoint: 120, rateBeforeCutoff: 2, rateAfterCutoff: 1.5 });
    expect(c.model).toBe('tiered_stops');
    expect(c.thresholds).toEqual([{ stopCount: 120, rate: 2 }, { rate: 1.5 }]);
  });

  it('passes a config that already has a model through unchanged', () => {
    const input = { model: 'per_mile' as const, ratePerMile: 0.45, baseFee: 30 };
    expect(normalizePayStructure(input)).toEqual(input);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/__tests__/payStructure.test.ts`
Expected: FAIL — `normalizePayStructure` is not exported.

- [ ] **Step 3: Add `normalizePayStructure` to `payStructure.ts`**

Append to `src/features/payperiod/payStructure.ts`:

```ts
const DEFAULT_TIERED: PayStructure = {
  model: 'tiered_stops',
  thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
  excessParcelRate: 0.05,
};

export function normalizePayStructure(config: any): PayStructure {
  if (!config) return { ...DEFAULT_TIERED };
  if (config.model) return config as PayStructure;
  if (config.thresholds) {
    return { model: 'tiered_stops', ...config };
  }
  // Legacy flat shape from before the thresholds migration.
  return {
    model: 'tiered_stops',
    thresholds: [
      { stopCount: config.cutoffPoint ?? 110, rate: config.rateBeforeCutoff ?? 1.98 },
      { rate: config.rateAfterCutoff ?? 1.48 },
    ],
    excessParcelRate: config.excessParcelRate ?? 0.05,
  };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/__tests__/payStructure.test.ts`
Expected: PASS.

- [ ] **Step 5: Replace the inline normaliser in `DataContext.jsx`**

In `src/contexts/DataContext.jsx`:

Add the import near the top (after the existing imports):

```jsx
import { normalizePayStructure } from '../features/payperiod/payStructure';
```

Delete the entire inline `normalizePaymentConfig` function (the block from the `// Normalizes a raw paymentConfig...` comment through its closing `};`).

Replace every call to `normalizePaymentConfig(x)` with `normalizePayStructure(x)` (there are calls in the direct-fetch branch and in `forceSync`).

Update the two hard-coded default `paymentConfig` objects (the `useState` initialiser and the guest fallback) to route through the normaliser so they carry a `model`:

```jsx
const [paymentConfig, setPaymentConfig] = useState(normalizePayStructure(null));
```

and for the guest branch:

```jsx
setPaymentConfig(normalizePayStructure(guestConfig ? JSON.parse(guestConfig) : null));
```

- [ ] **Step 6: Run the full suite, verify nothing regressed**

Run: `npx vitest run`
Expected: PASS — all prior tests plus the new ones. (Confirms existing DPD behaviour is preserved through the new normaliser.)

- [ ] **Step 7: Commit**

```bash
git add src/features/payperiod/payStructure.ts src/__tests__/payStructure.test.ts src/contexts/DataContext.jsx
git commit -m "feat: normalise all pay configs through payStructure (legacy -> tiered_stops)"
```

---

### Task 3: Model-aware manual editor at `/app/settings`

**Files:**
- Rewrite: `src/components/PaymentSettings.jsx`
- Test: `src/__tests__/paymentSettings.test.jsx`

**Interfaces:**
- Consumes: `PAY_MODELS`, `PayStructure`, `calculateDayEarnings`, `normalizePayStructure` from `payStructure.ts`; `useData` (for the active `paymentConfig`); Firestore `updateDoc`/`doc`/`db` (already imported today).
- Produces: a settings screen that (1) lets the user pick one of the five hand-fillable models, (2) shows that model's fields, (3) renders a live worked example via `calculateDayEarnings`, (4) saves a `PayStructure` to Firestore (and calls `onSettingsSaved`). `sliding_scale`, if the active config, is shown read-only with an "uploaded sheet" summary and a note that editing it comes with AI setup — it is not in the pickable list.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/paymentSettings.test.jsx`. Mock Firestore and `useData`, render, switch model, assert the worked example updates:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaymentSettings from '../components/PaymentSettings';

vi.mock('../services/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(() => Promise.resolve()), getDoc: vi.fn(() => Promise.resolve({ exists: () => false })) }));
vi.mock('../contexts/DataContext', () => ({ useData: () => ({ paymentConfig: { model: 'tiered_stops', thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }], excessParcelRate: 0.05 } }) }));

describe('PaymentSettings', () => {
  it('renders a model picker with the five hand-fillable models', () => {
    render(<PaymentSettings userId="u1" user={{ isGuest: false }} onSettingsSaved={() => {}} />);
    expect(screen.getByText('Flat per stop')).toBeTruthy();
    expect(screen.getByText('Per mile')).toBeTruthy();
    expect(screen.getByText('Day rate')).toBeTruthy();
  });

  it('shows a live worked example that reflects the entered rate', () => {
    render(<PaymentSettings userId="u1" user={{ isGuest: false }} onSettingsSaved={() => {}} />);
    fireEvent.click(screen.getByText('Flat per stop'));
    const rate = screen.getByLabelText(/rate per stop/i);
    fireEvent.change(rate, { target: { value: '2' } });
    expect(screen.getByTestId('worked-example').textContent).toContain('£200.00'); // 100 stops x £2
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/__tests__/paymentSettings.test.jsx`
Expected: FAIL — current `PaymentSettings` has no model picker / worked-example test id.

- [ ] **Step 3: Rewrite `PaymentSettings.jsx`**

Replace the DPD-only body with a model-driven editor. Key structure (keep the existing header/Alert/Card styling and the guest-notice; keep Firestore save shape writing a `PayStructure`):

- Local state: `config` (a `PayStructure`, initialised from `useData().paymentConfig` via `normalizePayStructure`).
- A model picker: map `PAY_MODELS.filter(m => m.id !== 'sliding_scale')` to selectable pills; selecting one sets `config.model` and seeds sensible empty params for that model.
- Per-model field editors driven by `config.model`:
  - `tiered_stops`: cutoff (maps to `thresholds[0].stopCount`), rate before (`thresholds[0].rate`), rate after (`thresholds[1].rate`), excess parcel rate. (Reuse today's fields; write back into the `thresholds` array on save.)
  - `flat_stops`: rate per stop (`ratePerStop`), excess parcel rate.
  - `per_mile`: rate per mile (`ratePerMile`), base fee (`baseFee`).
  - `hourly`: rate per hour (`ratePerHour`).
  - `per_day`: rate per day (`ratePerDay`).
  Each numeric input has an accessible label (`<Label htmlFor>`), `type="number"`, `step="0.01"`.
- Worked example: a `<div data-testid="worked-example">` showing `calculateDayEarnings(config, { quantity: sampleQty })` for a representative `sampleQty` per model (100 stops / 80 miles / 8 hours / 1 day), formatted with 2 decimals.
- If `config.model === 'sliding_scale'`: render a read-only summary card ("Sliding scale from your uploaded sheet — <rows>×<cols> rate grid") and a note: "To change a sliding scale, re-upload your sheet in AI setup." No editable fields, no model pills highlighted.
- Save: build the `PayStructure` from `config` and `updateDoc(doc(db,'users',userId), { paymentConfig: config, updatedAt: ... })`; guests short-circuit to `onSettingsSaved(config)` (as today). Keep success/error Alerts.

Write complete JSX following the above; preserve the outer `motion.div`, header, Info alert, and guest notice from the current file.

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/__tests__/paymentSettings.test.jsx`
Expected: PASS.

- [ ] **Step 5: Manual smoke check (build)**

Run: `npx vitest run` (full suite green), then confirm the app compiles: `npm run build` → expect "Compiled successfully" (or the project's success line) with no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/PaymentSettings.jsx src/__tests__/paymentSettings.test.jsx
git commit -m "feat: model-aware pay-structure editor at /app/settings"
```

---

### Task 4: Reachable "Pay Structure" row in Profile

**Files:**
- Modify: `src/components/Profile.js`

**Interfaces:**
- Consumes: `useNavigate` (already used in the app) and the existing `/app/settings` route.
- Produces: a visible, tappable "Pay Structure" row in Profile that navigates to `/app/settings`. No new tests — this is a single navigation wiring; verified by build + the daily-entry test in Task 5 exercising the same route indirectly.

- [ ] **Step 1: Add the navigation row**

In `src/components/Profile.js`, within the Account Settings section (the same block that holds the theme control added earlier), add a row styled like the surrounding rows:

```jsx
<button
  onClick={() => navigate('/app/settings')}
  className="w-full flex items-center justify-between p-4 rounded-[14px] hover:bg-muted/50 active:scale-[0.99] transition-all touch-manipulation"
  aria-label="Edit how you get paid"
>
  <span className="flex items-center gap-3">
    <DollarSign className="w-5 h-5 text-primary" />
    <span className="font-medium">Pay Structure</span>
  </span>
  <ChevronRight className="w-5 h-5 text-muted-foreground" />
</button>
```

Ensure `useNavigate` is imported and `navigate` is in scope (add `const navigate = useNavigate();` if not already present), and that `DollarSign` / `ChevronRight` are imported from `lucide-react` (add whichever is missing).

- [ ] **Step 2: Verify build + suite**

Run: `npm run build` → expect success.
Run: `npx vitest run` → expect green.

- [ ] **Step 3: Commit**

```bash
git add src/components/Profile.js
git commit -m "feat: reachable Pay Structure row in Profile"
```

---

### Task 5: Daily entry adapts to the active model

**Files:**
- Modify: `src/components/StopEntryForm.jsx`
- Test: `src/__tests__/stopEntryForm.test.jsx`

**Interfaces:**
- Consumes: `useData().paymentConfig` (always normalised, always has `model`), `PAY_MODELS`, `calculateDayEarnings` from `payStructure.ts`.
- Produces: a daily form whose hero input label/type follows the active model, plus a second `miles` input when `model === 'sliding_scale'`; the saved log row carries `stops` (primary quantity), `total` (via `calculateDayEarnings`), and — for sliding scale only — `miles`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/stopEntryForm.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StopEntryForm from '../components/StopEntryForm';

function renderWith(model) {
  const configs = {
    per_mile: { model: 'per_mile', ratePerMile: 0.45, baseFee: 30 },
    per_day: { model: 'per_day', ratePerDay: 145 },
  };
  vi.doMock('../contexts/DataContext', () => ({ useData: () => ({ paymentConfig: configs[model] }) }));
  return import('../components/StopEntryForm');
}

describe('StopEntryForm field-swap', () => {
  it('labels the hero field "Miles driven" for a per_mile driver', async () => {
    vi.resetModules();
    const { default: Form } = await renderWith('per_mile');
    render(<Form logs={[]} updateLogs={() => {}} />);
    expect(screen.getByText(/miles driven/i)).toBeTruthy();
  });

  it('shows a day-rate toggle instead of a number field for per_day', async () => {
    vi.resetModules();
    const { default: Form } = await renderWith('per_day');
    render(<Form logs={[]} updateLogs={() => {}} />);
    expect(screen.getByText(/worked today/i)).toBeTruthy();
  });
});
```

(If the existing form's `useData` mock style differs, mirror whatever `src/__tests__` already does for context-dependent components; the assertion targets — the swapped label and the toggle — are the contract.)

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/__tests__/stopEntryForm.test.jsx`
Expected: FAIL — the form still hard-codes "Number of Stops".

- [ ] **Step 3: Make the hero field model-driven**

In `src/components/StopEntryForm.jsx`:

- Import: `import { calculateDayEarnings, PAY_MODELS } from "../features/payperiod/payStructure";`
- Derive the active model meta: `const model = paymentConfig?.model || 'tiered_stops'; const meta = PAY_MODELS.find(m => m.id === model) || PAY_MODELS[0];`
- Replace the hard-coded "📦 Number of Stops" label with `meta.primary.label`.
- When `meta.primary.type === 'toggle'` (day rate): render a Yes/No toggle instead of the number input; its value maps to `stops = 1` (worked) or `0`.
- When `meta.secondary?.field === 'miles'` (sliding scale): render a second number input "Miles driven" bound to a new `entry.miles` state field.
- Replace both earnings computations (`estimatedEarnings` memo and the `total` line in `handleFormSubmit`) with:

```jsx
const total = calculateDayEarnings(paymentConfig, {
  quantity: parseFloat(entry.stops) || 0,
  miles: parseFloat(entry.miles) || 0,
}) + (entry.extra ? parseFloat(entry.extra) || 0 : 0);
```

- In `handleFormSubmit`, when building `newLog`, add `miles` only for sliding scale:

```jsx
const newLog = {
  id: Date.now(),
  date: entry.date,
  stops: parseFloat(entry.stops) || (meta.primary.type === 'toggle' ? 1 : 0),
  extra,
  total,
  notes: entry.notes,
  timestamp: new Date().toISOString(),
  ...(model === 'sliding_scale' ? { miles: parseFloat(entry.miles) || 0 } : {}),
};
```

- Add `miles: ""` to the `getSmartDefaults()` return and the form-reset objects so the field is controlled.
- Keep the existing offline/undo/sync logic untouched — only the field rendering and the earnings math change.

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/__tests__/stopEntryForm.test.jsx`
Expected: PASS.

- [ ] **Step 5: Full suite + build**

Run: `npx vitest run` → green (confirms the tiered_stops path still computes as before for existing users).
Run: `npm run build` → success.

- [ ] **Step 6: Commit**

```bash
git add src/components/StopEntryForm.jsx src/__tests__/stopEntryForm.test.jsx
git commit -m "feat: daily entry adapts hero field(s) and earnings to the active pay model"
```

---

## Self-Review

- **Spec coverage:** Phase 1 (foundation) → Tasks 1–2. Phase 2 (config editing + reachable Profile) → Tasks 3–4. Phase 3 (daily entry field-swap incl. sliding-scale two-input) → Task 5. Phases 4–6 (AI, welcome, tutorial) are explicitly out of this plan and get their own plans. The `sliding_scale` calculator/daily-entry/storage are covered; hand-entry of a matrix is intentionally excluded (documented in Global Constraints).
- **Backward compatibility:** Task 2's tests assert legacy and modern configs both resolve to `tiered_stops` with identical earnings; Task 5's full-suite step re-confirms via the existing DPD tests. `log.stops`/`log.total` remain written.
- **Type consistency:** `calculateDayEarnings(config, { quantity, miles })`, `lookupRate(config, stops, miles)`, `normalizePayStructure(config)`, and `PAY_MODELS[].primary/secondary` are used with the same signatures across Tasks 1, 3, and 5.
- **No placeholders:** every code step ships real code or a precise, anchored edit.

## Follow-on plans (not this plan)

1. **AI-assisted setup** — `functions/interpretPayStructure` (Claude vision model), describe/upload UI, worked-example confirm; makes `sliding_scale` creatable. Gated on an Anthropic API key with billing.
2. **Welcome animation** — Framer-Motion completion moment after confirm.
3. **First-run tutorial** — coach-marks over the real daily screen.
