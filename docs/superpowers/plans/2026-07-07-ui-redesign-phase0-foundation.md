# UI Redesign Phase 0: Design Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one consistent, warm/restrained visual foundation (color tokens, two shared display components, retheming of the shared UI primitives) and apply it to the Invoice tab — the newest and most money-critical part of the app.

**Architecture:** The app already has a CSS-variable theming system (`--background`, `--card`, `--primary`, etc., defined in `src/index.css`) wired into shared `src/components/ui/*` primitives — but those primitives currently hardcode raw Tailwind colors (`bg-white`, `bg-blue-500`, `border-gray-300`, etc.) instead of reading the variables, so the variables have never actually controlled the app's look. This plan (1) gives the variables new values matching the approved direction, (2) rewires the primitives to actually read them, and (3) adds two new shared components (`<Money>`, `<StatusBadge>`) for consistent money/status display, then wires those into the three Invoice-tab screens.

**Tech Stack:** React 18, Tailwind CSS (CSS-variable-driven theming, dark mode via `.dark` class), no new dependencies.

## Global Constraints

- No automated test files exist for any UI component in this codebase (confirmed during the pay-period reconciliation work) — verification for every task in this plan is the existing 30-test suite staying green (`npm run test`, from `docs/superpowers/plans/2026-07-06-pay-structure-reconciliation.md`'s prior work) plus manual dev-server verification in both light and dark mode.
- Color values (exact, from the approved design): light mode `--background: #FAFAFA`, `--card: #FFFFFF`, `--primary`/`--accent: #0D9488`, `--muted: #F3F4F6`, `--muted-foreground: #9CA3AF`, `--border`/`--input: #EEEEEE`, `--ring: #0D9488`. Dark mode `--background: #111113`, `--card: #1C1C1F`, `--primary`/`--accent: #2DD4BF`, `--primary-foreground`/`--accent-foreground: #0A0A0A`, `--muted: #2A2A2E`, `--muted-foreground: #6B7280`, `--border`/`--input: #2A2A2E`, `--ring: #2DD4BF`. `--destructive`/`--secondary` and their `-foreground` pairs are unchanged in both modes.
- Radius: `rounded-[18px]` for cards, `rounded-[14px]` for buttons/inputs (Tailwind arbitrary-value syntax — no `tailwind.config.js` changes needed for this).
- Do not touch `.shadow-apple-button`, `.shadow-apple-card`, `.shadow-apple-card-hover` in `src/index.css`, or any component using them (`AppNavigation.jsx`, `AppFooter.jsx`, `TermsOfService.js`, `PrivacyPolicy.js`, `ContactUs.js`, `Profile.js`) — these are a *different*, actively-used set of utility classes, unrelated to the `apple-*` color/radius/shadow *config* keys this plan removes. Confirmed via repo-wide search: `apple-blue`/`apple-indigo`/`apple-purple`/`apple-green`/`apple-yellow`/`apple-orange`/`apple-red`/`apple-gray` (colors), `rounded-apple`/`rounded-apple-lg`/`rounded-apple-full`, and `shadow-apple-sm`/`shadow-apple-md`/`shadow-apple-lg`/`shadow-apple-xl` have zero usages anywhere in `src/`.
- Out of scope: Dashboard, Entries, Routes, Stats, Profile/Settings screens (later phases per the design spec); navigation restructuring; `InvoiceComparison.jsx` (confirmed dead code, separate from this work).

---

## File Structure

**Create:**
- `src/components/ui/money.jsx` — `<Money amount />` display component
- `src/components/ui/status-badge.jsx` — `<StatusBadge status />` display component

**Modify:**
- `src/index.css` — color token values (light + dark), remove the dead `.card-apple` rule
- `src/tailwind.config.js` (repo root: `tailwind.config.js`) — remove unused `apple-*` color families, radius tokens, box-shadow tokens
- `src/components/ui/card.jsx` — read CSS variables instead of hardcoded colors, new radius
- `src/components/ui/button.jsx` — read CSS variables instead of hardcoded colors, new radius, add missing `destructive` variant
- `src/components/ui/input.jsx` — read CSS variables instead of hardcoded colors, new radius
- `src/features/payperiod/PayPeriodResults.jsx` — use `<Money>` and `<StatusBadge>`
- `src/components/InvoiceGeneratorNew.jsx` — use `<Money>` for the one on-screen amount display
- `src/components/InvoiceHistory.jsx` — use `<Money>` for its three amount displays

---

### Task 1: Design tokens (colors + config cleanup)

**Files:**
- Modify: `src/index.css:9-63` (color variables), `src/index.css:168-170` (`.card-apple` rule)
- Modify: `tailwind.config.js:9-114` (color families), `tailwind.config.js:146-157` (radius/shadow)

**Interfaces:**
- Produces: the CSS variables `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--border`, `--input`, `--ring` now resolve to the new palette, in both `:root` (light) and `.dark`. Tasks 2-4 (retheming the primitives) depend on these being correct first.

- [ ] **Step 1: Update light-mode color variables**

In `src/index.css`, replace the `:root` block (lines 9-35):

```css
  :root {
    /* Light mode color theme */
    --background: #FAFAFA;
    --foreground: #000000;
    
    --card: #FFFFFF;
    --card-foreground: #000000;
    
    --primary: #0D9488;
    --primary-foreground: #FFFFFF;
    
    --secondary: #5856D6;
    --secondary-foreground: #FFFFFF;
    
    --muted: #F3F4F6;
    --muted-foreground: #9CA3AF;
    
    --accent: #0D9488;
    --accent-foreground: #FFFFFF;
    
    --destructive: #FF3B30;
    --destructive-foreground: #FFFFFF;
    
    --border: #EEEEEE;
    --input: #EEEEEE;
    --ring: #0D9488;
  }
```

- [ ] **Step 2: Update dark-mode color variables**

Replace the `.dark` block (lines 37-63):

```css
  .dark {
    /* Dark mode color theme */
    --background: #111113;
    --foreground: #FFFFFF;

    --card: #1C1C1F;
    --card-foreground: #FFFFFF;

    --primary: #2DD4BF;
    --primary-foreground: #0A0A0A;

    --secondary: #5E5CE6;
    --secondary-foreground: #FFFFFF;

    --muted: #2A2A2E;
    --muted-foreground: #6B7280;

    --accent: #2DD4BF;
    --accent-foreground: #0A0A0A;

    --destructive: #FF453A;
    --destructive-foreground: #FFFFFF;

    --border: #2A2A2E;
    --input: #2A2A2E;
    --ring: #2DD4BF;
  }
```

- [ ] **Step 3: Remove the dead `.card-apple` rule**

`.card-apple` (lines 168-170) is unused anywhere in `src/` and depends on the `shadow-apple` box-shadow token being removed in Step 5. Remove it entirely:

```css
  .card-apple {
    @apply bg-card rounded-xl overflow-hidden shadow-apple border border-border/50;
  }
```

Leave `.input-apple`, `.button-apple-primary`, `.button-apple-secondary` (the other rules in that same `@layer components` block) untouched — they use only standard Tailwind utilities (`rounded-lg`, `rounded-full`, `shadow-sm`), not the tokens being removed, and are out of scope for this cleanup.

- [ ] **Step 4: Remove unused `apple-*` color families from `tailwind.config.js`**

In `tailwind.config.js`, remove the `apple-blue` through `apple-gray` color family definitions (lines 10-114, everything between `colors: {` and the `// Default Tailwind colors are kept as fallback` comment), keeping the CSS-variable-driven colors that follow. The `colors` block should read:

```js
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
```

- [ ] **Step 5: Remove unused radius and box-shadow tokens from `tailwind.config.js`**

Remove the `borderRadius` block entirely (lines 146-150):

```js
      borderRadius: {
        'apple': '10px',
        'apple-lg': '20px',
        'apple-full': '9999px',
      },
```

Remove the `boxShadow` block entirely (lines 151-157):

```js
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'apple': '0 2px 10px rgba(0, 0, 0, 0.05)',
        'apple-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'apple-lg': '0 10px 20px rgba(0, 0, 0, 0.1)',
        'apple-xl': '0 20px 30px rgba(0, 0, 0, 0.12)',
      },
```

Leave `fontFamily` and `opacity` untouched — out of scope for this phase.

- [ ] **Step 6: Verify the app still builds and boots**

Run: `npm run test` — expect all 30 tests to still pass (this task touches no logic).
Run: `npm start`, confirm the app loads with no console errors about missing Tailwind classes or malformed config.

- [ ] **Step 7: Commit**

```bash
git add src/index.css tailwind.config.js
git commit -m "feat: update design tokens to the approved warm/restrained palette"
```

---

### Task 2: Retheme `ui/card.jsx`

**Files:**
- Modify: `src/components/ui/card.jsx` (entire file, 66 lines)

**Interfaces:**
- Consumes: the CSS variables from Task 1.
- Produces: `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` now render using `bg-card`/`text-card-foreground`/`text-muted-foreground`/`border-border` instead of hardcoded `gray-*`/`white` classes, with `rounded-[18px]` instead of `rounded-xl`. No prop/export signature changes — every existing caller across the app keeps working unchanged.

- [ ] **Step 1: Replace the file's color/radius classes**

Replace the full contents of `src/components/ui/card.jsx`:

```jsx
import React from "react";

const Card = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`bg-card text-card-foreground rounded-[18px] shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`p-6 border-b border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardTitle = ({ className = "", children, ...props }) => {
  return (
    <h3
      className={`text-xl font-bold text-card-foreground ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

const CardDescription = ({ className = "", children, ...props }) => {
  return (
    <p
      className={`mt-1 text-sm text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

const CardContent = ({ className = "", children, ...props }) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`p-6 border-t border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

- [ ] **Step 2: Verify the test suite still passes**

Run: `npm run test` — expect 30/30 passing (no logic touched).

- [ ] **Step 3: Manually verify in the dev server**

Run: `npm start`, navigate to the Invoice tab's Reconcile sub-tab (or any screen using `Card`, e.g. `InvoiceGeneratorNew`). Confirm cards now show rounded 18px corners and the new background/border colors, in both light and dark mode (toggle via the app's existing theme switch).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/card.jsx
git commit -m "feat: retheme Card to use CSS-variable tokens and new radius"
```

---

### Task 3: Retheme `ui/button.jsx`

**Files:**
- Modify: `src/components/ui/button.jsx` (entire file, 57 lines)

**Interfaces:**
- Consumes: the CSS variables from Task 1.
- Produces: `Button`'s `primary`/`secondary`/`outline`/`ghost`/`link` variants now use CSS-variable-driven colors; adds a `destructive` variant (previously referenced by callers, e.g. `InvoiceHistory.jsx`'s delete-confirm button, but not defined in this component — a pre-existing gap, fixed here since this task already rewrites the same object). `rounded-lg` becomes `rounded-[14px]`. No prop/export signature changes.

- [ ] **Step 1: Replace the file's variant classes and radius**

Replace the full contents of `src/components/ui/button.jsx`:

```jsx
import React from "react";

// Enhanced button component with different variants
const Button = ({ 
  children, 
  className = "", 
  variant = "primary", 
  size = "default", 
  loading = false,
  disabled = false,
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-[14px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:opacity-90 focus:ring-ring",
    secondary: "bg-muted text-muted-foreground hover:opacity-80 focus:ring-ring",
    outline: "bg-transparent border border-border hover:bg-muted focus:ring-ring",
    ghost: "bg-transparent hover:bg-muted focus:ring-ring",
    link: "bg-transparent underline-offset-4 hover:underline text-primary hover:bg-transparent focus:ring-0",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90 focus:ring-destructive"
  };
  
  const sizeClasses = {
    sm: "text-xs px-3 py-1.5",
    default: "text-sm px-4 py-2",
    lg: "text-base px-5 py-2.5",
    icon: "p-2"
  };
  
  const disabledClasses = "opacity-50 cursor-not-allowed";
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled || loading ? disabledClasses : "",
    className
  ].join(" ");
  
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export { Button };
```

- [ ] **Step 2: Verify the test suite still passes**

Run: `npm run test` — expect 30/30 passing.

- [ ] **Step 3: Manually verify in the dev server**

Run: `npm start`. Confirm primary buttons (e.g. "Calculate & Save" in the Reconcile tab's New Pay Period form) show the new teal color and 14px rounded corners. Navigate to Invoice → History, click the delete (trash) icon on an invoice to reveal the "Confirm Delete" button, and confirm it now renders with a visible red `destructive` style (previously this variant had no defined styling).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/button.jsx
git commit -m "feat: retheme Button to use CSS-variable tokens, new radius, add missing destructive variant"
```

---

### Task 4: Retheme `ui/input.jsx`

**Files:**
- Modify: `src/components/ui/input.jsx` (entire file, 33 lines)

**Interfaces:**
- Consumes: the CSS variables from Task 1.
- Produces: `Input` now uses `bg-input`/`border-border`/`focus:ring-ring`/`placeholder:text-muted-foreground` (matching the convention already assumed by callers like `InvoiceGeneratorNew.jsx`, which pass `className="bg-input border-border"` explicitly today) instead of hardcoded colors, with `rounded-[14px]` instead of `rounded-md`. No prop/export signature changes.

- [ ] **Step 1: Replace the file's color/radius classes**

Replace the full contents of `src/components/ui/input.jsx`:

```jsx
import React from "react";

// The Input component now properly supports TypeScript
const Input = React.forwardRef(({ 
  className = "", 
  type = "text", 
  error = false, 
  ...props 
}, ref) => {
  return (
    <input
      type={type}
      className={`
        flex h-10 w-full rounded-[14px] border px-3 py-2 text-sm 
        bg-input
        focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
        disabled:cursor-not-allowed disabled:opacity-50
        placeholder:text-muted-foreground
        ${error 
          ? "border-destructive focus:ring-destructive" 
          : "border-border"
        }
        ${className}
      `}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
```

- [ ] **Step 2: Verify the test suite still passes**

Run: `npm run test` — expect 30/30 passing.

- [ ] **Step 3: Manually verify in the dev server**

Run: `npm start`, navigate to the Invoice → Create tab, confirm the text inputs render with 14px rounded corners and the new border/focus-ring color in both light and dark mode.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/input.jsx
git commit -m "feat: retheme Input to use CSS-variable tokens and new radius"
```

---

### Task 5: Create the `<Money>` component

**Files:**
- Create: `src/components/ui/money.jsx`

**Interfaces:**
- Produces: `Money({ amount: number, className?: string })` — a `<span>` rendering `£{amount.toFixed(2)}` with tabular-numeral alignment. Tasks 7-8 import this.

- [ ] **Step 1: Create the component**

```jsx
// src/components/ui/money.jsx
import React from "react";

const Money = ({ amount, className = "" }) => {
  return (
    <span className={`tabular-nums ${className}`}>
      £{amount.toFixed(2)}
    </span>
  );
};

export { Money };
```

- [ ] **Step 2: Verify the test suite still passes**

Run: `npm run test` — expect 30/30 passing (new file, no existing test touches it, no automated test is added for it per this codebase's established convention for UI components).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/money.jsx
git commit -m "feat: add shared Money display component with tabular numerals"
```

---

### Task 6: Create the `<StatusBadge>` component

**Files:**
- Create: `src/components/ui/status-badge.jsx`

**Interfaces:**
- Consumes: the exact status strings `comparePeriodToLogs` produces (`'match' | 'mismatch' | 'missing-from-log' | 'missing-from-statement'`, from `src/features/payperiod/payPeriodCalculations.ts`).
- Produces: `StatusBadge({ status: string })` — a pill-shaped `<span>` with a label and color pairing per status. Task 7 imports this.

- [ ] **Step 1: Create the component**

```jsx
// src/components/ui/status-badge.jsx
import React from "react";

const STATUS_CONFIG = {
  match: {
    label: "Match",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400",
  },
  mismatch: {
    label: "Mismatch",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400",
  },
  "missing-from-log": {
    label: "Missing from your log",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400",
  },
  "missing-from-statement": {
    label: "Missing from statement",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400",
  },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.mismatch;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
};

export { StatusBadge };
```

- [ ] **Step 2: Verify the test suite still passes**

Run: `npm run test` — expect 30/30 passing.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/status-badge.jsx
git commit -m "feat: add shared StatusBadge display component"
```

---

### Task 7: Wire `<Money>` and `<StatusBadge>` into `PayPeriodResults.jsx`

**Files:**
- Modify: `src/features/payperiod/PayPeriodResults.jsx` (entire file, 121 lines)

**Interfaces:**
- Consumes: `Money` from Task 5, `StatusBadge` from Task 6.
- Produces: no change to `PayPeriodResults`'s own props (`{ period, onGenerateInvoice }`) or behavior — display only.

- [ ] **Step 1: Replace manual money formatting and status text with the shared components**

Replace the full contents of `src/features/payperiod/PayPeriodResults.jsx`:

```jsx
// src/features/payperiod/PayPeriodResults.jsx
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Money } from "../../components/ui/money";
import { StatusBadge } from "../../components/ui/status-badge";
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { calculatePeriodTotals, comparePeriodToLogs } from "./payPeriodCalculations";
import { useData } from "../../contexts/DataContext";

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
              <div key={day.date} className="flex items-center justify-between p-2 bg-muted rounded-[14px] border border-border/50">
                <span className="text-sm">{format(parseISO(day.date), "EEE, dd MMM yyyy")}</span>
                <span className="text-sm tabular-nums">Yours: {day.loggedStops ?? "—"}</span>
                <span className="text-sm tabular-nums">Statement: {day.statementStops ?? "—"}</span>
                <StatusBadge status={day.status} />
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
            <Money amount={totals.grossPayment} />
          </div>
          <div className="flex justify-between text-sm">
            <span>DPD Charge</span>
            <span>-<Money amount={totals.dpdCharge} /></span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Admin Fee</span>
            <span>-<Money amount={totals.adminFee} /></span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
            <span>Total</span>
            <Money amount={totals.total} />
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT ({(period.vatRate * 100).toFixed(0)}%)</span>
            <Money amount={totals.vat} />
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
            <span>Total with VAT</span>
            <Money amount={totals.totalWithVat} />
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

(The button's own label keeps plain string interpolation — `<Money>` renders a `<span>`, which is fine inside button text but adds no value over the plain string here since there's no alignment/tabular-numeral benefit inside a single inline label.)

- [ ] **Step 2: Verify the test suite still passes**

Run: `npm run test` — expect 30/30 passing (no logic touched, `calculatePeriodTotals`/`comparePeriodToLogs` calls are unchanged).

- [ ] **Step 3: Manually verify in the dev server**

Run: `npm start`, repeat the pay-period reconciliation flow from the prior work (Invoice → Reconcile → New Pay Period → 19 June 2026, 176 stops, 214 parcels, DPD charge £39.14, admin fee £0, VAT 20%). Confirm: the Daily Comparison row shows a pill-style status badge (not plain colored text) reading "Missing from your log", and the Payment Breakdown section's amounts are rendered via `<Money>` (visually: `£317.38`, `£278.24`, `£333.89`, matching the exact same figures as before — this task changes presentation only, not values).

- [ ] **Step 4: Commit**

```bash
git add src/features/payperiod/PayPeriodResults.jsx
git commit -m "feat: use Money and StatusBadge components in PayPeriodResults"
```

---

### Task 8: Wire `<Money>` into `InvoiceGeneratorNew.jsx` and `InvoiceHistory.jsx`

**Files:**
- Modify: `src/components/InvoiceGeneratorNew.jsx:595`
- Modify: `src/components/InvoiceHistory.jsx:106,176,182`

**Interfaces:**
- Consumes: `Money` from Task 5.
- Produces: no behavior change — display only.

- [ ] **Step 1: Add the import and use `<Money>` in `InvoiceGeneratorNew.jsx`**

Read the file first to confirm current line numbers (they may have drifted slightly). Add the import near the top, alongside the other UI imports (after the `Alert`/`AlertDescription` import):

```js
import { Money } from "./ui/money";
```

Replace line 595:

```jsx
                    <p className="text-lg font-semibold">£{loggedData.amount.toFixed(2)}</p>
```

with:

```jsx
                    <p className="text-lg font-semibold"><Money amount={loggedData.amount} /></p>
```

- [ ] **Step 2: Add the import and use `<Money>` in `InvoiceHistory.jsx`**

Read the file first to confirm current line numbers. Add the import alongside the other UI imports (after the `Alert`/`AlertDescription` import):

```js
import { Money } from "./ui/money";
```

Replace line 106:

```jsx
                          <span className="font-semibold text-primary">£{parseFloat(invoice.invoiceAmount).toFixed(2)}</span>
```

with:

```jsx
                          <span className="font-semibold text-primary"><Money amount={parseFloat(invoice.invoiceAmount)} /></span>
```

Replace line 176:

```jsx
                  £{invoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0).toFixed(2)}
```

with:

```jsx
                  <Money amount={invoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0)} />
```

Replace line 182:

```jsx
                  £{(invoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0) / invoices.length).toFixed(2)}
```

with:

```jsx
                  <Money amount={invoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0) / invoices.length} />
```

- [ ] **Step 3: Verify the test suite still passes**

Run: `npm run test` — expect 30/30 passing.

- [ ] **Step 4: Manually verify in the dev server**

Run: `npm start`. In Invoice → Create, fill in a start/end date range covering some logged entries and confirm the "Tracked Amount" figure in the Logged Data Summary still shows the correct value via `<Money>`. In Invoice → History (create an invoice first if the list is empty), confirm each invoice's amount and the Total/Average Value summary figures render correctly via `<Money>`.

- [ ] **Step 5: Commit**

```bash
git add src/components/InvoiceGeneratorNew.jsx src/components/InvoiceHistory.jsx
git commit -m "feat: use Money component for amount display in invoice creation and history"
```

---

## Self-Review Notes

- **Spec coverage:** Design tokens (Task 1), retheming all five named shared primitives — card/button/input covered explicitly (Tasks 2-4); `alert.jsx` and `tabs.jsx` were named in the spec's "Retheming the shared primitives" section but on inspection already read `text-foreground`/apply only structural (non-color) classes with no hardcoded colors to replace, so no task is needed for them — confirmed by reading both files during planning. `<Money>`/`<StatusBadge>` components (Tasks 5-6) and their wiring into all three Invoice-tab screens (Tasks 7-8) are covered. The `apple-*` config cleanup is covered (Task 1) with confirmed-safe removal boundaries (Global Constraints).
- **Placeholder scan:** none found — every step has complete, copy-pasteable code.
- **Type/name consistency:** `Money`'s prop (`amount`) and `StatusBadge`'s prop (`status`) are defined once (Tasks 5-6) and used identically in Tasks 7-8. The `destructive` Button variant added in Task 3 is verified against its one real caller (`InvoiceHistory.jsx`'s delete-confirm button) rather than assumed.
