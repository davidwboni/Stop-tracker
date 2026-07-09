# UI Redesign Phase 1: Dashboard + Entries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a real data-correctness bug in `StopEntryForm.jsx` (it computes earnings from a disconnected rate instead of the app's tiered payment config) and extend the Phase 0 visual foundation (warm teal tokens, `<Money>`, muted restrained cards) to the Dashboard tab and the Entries tab.

**Architecture:** `StopEntryForm.jsx` switches from its own `localStorage`-backed flat rate to the same `calculateStopFee` + `paymentConfig` pattern already used correctly by `Layout.jsx`'s floating-action-button handler — closing the gap where the same stop count produced two different saved totals depending on which entry point was used. The five touched files (`StopEntryForm.jsx`, `FloatingActionButton.jsx`, `SimpleDashboard.jsx`, `EntriesPage.jsx`, `EntriesList.jsx`) then get their hardcoded colors/gradients replaced with the Phase 0 CSS-variable tokens and `<Money>` component, following the same retheme pattern already proven across the Invoice tab.

**Tech Stack:** React 18, Tailwind CSS (CSS-variable tokens from Phase 0), `date-fns`, `lodash`, Framer Motion. No new dependencies.

## Global Constraints

- No automated test files exist for any UI component in this codebase — verification is the existing 30-test suite staying green (`npm run test`) plus manual dev-server verification in both light and dark mode, matching the established convention from Phase 0.
- `StopEntryForm.jsx`'s fix must reuse `calculateStopFee` from `src/features/payperiod/payPeriodCalculations.ts` (already tested, 20 tests covering it) — no new calculation logic.
- Verified real-data figure to check the fix against: 176 stops → £315.48 (110×£1.98 + 66×£1.48), the same figure verified in Phase 0's Task 1 and used throughout this codebase's test suite.
- Radius convention from Phase 0: `rounded-[18px]` for cards, `rounded-[14px]` for buttons/inputs.
- Color convention from Phase 0: `bg-primary`/`text-primary` (teal accent), `bg-muted`/`text-muted-foreground` (neutral), `bg-card`/`text-card-foreground` (surfaces), `border-border`. Semantic states follow the pattern already established in `InvoiceGeneratorNew.jsx`/`PayPeriodResults.jsx`: opacity-based backgrounds that work in both light and dark without separate `dark:` variants (e.g. `bg-emerald-500/10 text-emerald-500` for success, `bg-destructive/10 text-destructive` for error, `bg-amber-500/10 text-amber-600 dark:text-amber-400` for warning/offline).
- `FloatingActionButton.jsx` stays a separate entry point from `StopEntryForm.jsx` — not merged into one component, per the approved design.
- `EntriesPage.jsx` gains no new entry-creation capability — search/filter/export of existing entries only, unchanged.

---

## File Structure

**Modify (no new files):**
- `src/components/StopEntryForm.jsx` — Task 1 (correctness fix), Task 2 (retheme)
- `src/components/FloatingActionButton.jsx` — Task 3 (retheme)
- `src/components/SimpleDashboard.jsx` — Task 4 (Money + shared Button)
- `src/components/EntriesPage.jsx` — Task 5 (retheme)
- `src/components/EntriesList.jsx` — Task 6 (retheme, summary cards converted from gradient to muted style)

---

### Task 1: Fix StopEntryForm.jsx's rate calculation

**Files:**
- Modify: `src/components/StopEntryForm.jsx:1-19` (imports), `:54` (rate state), `:69-75` (rate-loading effect), `:244-253` (estimated earnings memo), `:271-273` (submit total calculation)

**Interfaces:**
- Consumes: `calculateStopFee` from `src/features/payperiod/payPeriodCalculations.ts` (signature: `calculateStopFee(stops: number, thresholds: Array<{stopCount?: number; rate: number}>): number`), `useData` from `src/contexts/DataContext.jsx` (returns `{ paymentConfig, ... }`, `paymentConfig` shape `{ thresholds, excessParcelRate }`).
- Produces: `estimatedEarnings` (a `useMemo`, returns a `number`, renamed from the old `calculateEstimatedEarnings` which returned a formatted string) — Task 2 consumes this exact name/type to wire up `<Money>`.

- [ ] **Step 1: Read the current file to confirm content matches**

Read `src/components/StopEntryForm.jsx` in full — line numbers below may have drifted slightly; match by surrounding code content.

- [ ] **Step 2: Add the new imports**

Add near the top of the file, after the existing `date-fns` import (line 18):

```js
import { useData } from "../contexts/DataContext";
import { calculateStopFee } from "../features/payperiod/payPeriodCalculations";
```

- [ ] **Step 3: Get `paymentConfig` from context**

Replace line 54 (`const [rate, setRate] = useState(1.90); // Default rate per stop`) with:

```js
  const { paymentConfig } = useData();
```

- [ ] **Step 4: Remove the disconnected rate-loading effect**

Remove lines 69-75:

```js
  // Get user's rate from local storage or settings
  useEffect(() => {
    const savedRate = localStorage.getItem('rate-per-stop');
    if (savedRate) {
      setRate(parseFloat(savedRate));
    }
  }, []);
```

- [ ] **Step 5: Fix the estimated-earnings calculation**

Replace lines 244-253:

```js
  // Memoize expensive calculations to prevent unnecessary re-renders
  const calculateEstimatedEarnings = useMemo(() => {
    if (!entry.stops) return "£0.00";
    
    const stopsNum = parseInt(entry.stops, 10) || 0;
    const extraNum = entry.extra ? parseFloat(entry.extra) || 0 : 0;
    
    const earnings = (stopsNum * rate) + extraNum;
    return `£${earnings.toFixed(2)}`;
  }, [entry.stops, entry.extra, rate]);
```

with:

```js
  // Memoize expensive calculations to prevent unnecessary re-renders
  const estimatedEarnings = useMemo(() => {
    if (!entry.stops) return 0;

    const stopsNum = parseInt(entry.stops, 10) || 0;
    const extraNum = entry.extra ? parseFloat(entry.extra) || 0 : 0;
    const config = paymentConfig || {
      thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
      excessParcelRate: 0.05
    };

    return calculateStopFee(stopsNum, config.thresholds) + extraNum;
  }, [entry.stops, entry.extra, paymentConfig]);
```

Then find the JSX site that displays this value (search for `calculateEstimatedEarnings` — it appears once more, around line 540-541, inside the stops input block):

```jsx
                {entry.stops && (
                  <p className="text-center text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">
                    {calculateEstimatedEarnings} estimated
                  </p>
                )}
```

Replace with (this is a minimal fix to keep the display working with the new numeric return type — Task 2 will restyle this block and wire up `<Money>`):

```jsx
                {entry.stops && (
                  <p className="text-center text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">
                    £{estimatedEarnings.toFixed(2)} estimated
                  </p>
                )}
```

- [ ] **Step 6: Fix the submit-time total calculation**

Replace lines 271-273 (inside `handleFormSubmit`):

```js
      const stops = parseInt(entry.stops, 10);
      const extra = entry.extra ? parseFloat(entry.extra) : 0;
      const total = (stops * rate) + extra;
```

with:

```js
      const stops = parseInt(entry.stops, 10);
      const extra = entry.extra ? parseFloat(entry.extra) : 0;
      const config = paymentConfig || {
        thresholds: [{ stopCount: 110, rate: 1.98 }, { rate: 1.48 }],
        excessParcelRate: 0.05
      };
      const total = calculateStopFee(stops, config.thresholds) + extra;
```

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: PASS — 30/30 (this task touches no test files; `calculateStopFee` is already fully tested).

- [ ] **Step 8: Manually verify with real figures, via both entry points**

Run: `npm start`, sign in as guest. On the Dashboard's "Log Entry" form (`StopEntryForm`), type `176` into Number of Stops. Expected: "estimated" line shows **£315.48** (110×£1.98 + 66×£1.48 — the same real-DPD figure verified throughout this codebase). Then use the floating action button (the `+` button, visible on any screen) and also type `176` stops. Expected: after saving, both entries show **identical** totals — confirming the two entry points now agree.

- [ ] **Step 9: Commit**

```bash
git add src/components/StopEntryForm.jsx
git commit -m "fix: StopEntryForm now uses the shared tiered rate calculation instead of a disconnected localStorage rate"
```

---

### Task 2: Retheme StopEntryForm.jsx

**Files:**
- Modify: `src/components/StopEntryForm.jsx` (entire file — full replacement, incorporating Task 1's fix)

**Interfaces:**
- Consumes: `estimatedEarnings` (number, from Task 1), `Money` from `src/components/ui/money.jsx`.
- Produces: no change to the component's exported props (`{ logs, updateLogs, syncStatus }`) or behavior — display only.

- [ ] **Step 1: Read the current file (post-Task-1) to confirm content**

Read `src/components/StopEntryForm.jsx` in full to confirm Task 1's changes are present before replacing.

- [ ] **Step 2: Add the `Money` import**

Add alongside the other UI imports (after the `date-fns` import, near the `useData`/`calculateStopFee` imports from Task 1):

```js
import { Money } from "./ui/money";
```

- [ ] **Step 3: Replace the color/gradient classes throughout the file**

Apply these exact replacements (match by the surrounding unique content, since exact line numbers may have shifted since Task 1):

Replace:
```jsx
        <Card className="mx-0 rounded-none border-0 shadow-none bg-white dark:bg-gray-800">
```
with:
```jsx
        <Card className="mx-0 rounded-none border-0 shadow-none">
```

Replace:
```jsx
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Log Entry
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quick delivery logging</p>
```
with:
```jsx
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-[14px] mb-3 shadow-lg">
                <Truck className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-lg font-bold mb-1">
                Log Entry
              </CardTitle>
              <p className="text-sm text-muted-foreground">Quick delivery logging</p>
```

Replace:
```jsx
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-3xl border border-blue-100 dark:border-blue-800">
                <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 text-center">
                  📦 Number of Stops
                </label>
```
with:
```jsx
              <div className="bg-primary/5 p-6 rounded-[18px] border border-primary/20">
                <label className="block text-sm font-semibold text-primary mb-3 text-center">
                  📦 Number of Stops
                </label>
```

Replace:
```jsx
                  className="h-16 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-2xl font-bold touch-manipulation text-center shadow-lg"
```
with:
```jsx
                  className="h-16 border-2 border-primary/30 rounded-[18px] focus:border-primary focus:ring-4 focus:ring-primary/20 text-2xl font-bold touch-manipulation text-center shadow-lg tabular-nums"
```

Replace:
```jsx
                {entry.stops && (
                  <p className="text-center text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">
                    £{estimatedEarnings.toFixed(2)} estimated
                  </p>
                )}
```
with:
```jsx
                {entry.stops && (
                  <p className="text-center text-sm text-primary mt-2 font-medium">
                    <Money amount={estimatedEarnings} /> estimated
                  </p>
                )}
```

Replace:
```jsx
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      📅 Date
                    </label>
                    <Input
                      type="date"
                      name="date"
                      value={entry.date}
                      onChange={debouncedHandleChange}
                      onFocus={() => handleInputFocus({ current: null })}
                      onBlur={handleInputBlur}
                      required
                      className="h-12 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm touch-manipulation"
                    />
```
with:
```jsx
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      📅 Date
                    </label>
                    <Input
                      type="date"
                      name="date"
                      value={entry.date}
                      onChange={debouncedHandleChange}
                      onFocus={() => handleInputFocus({ current: null })}
                      onBlur={handleInputBlur}
                      required
                      className="h-12 rounded-[14px] focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm touch-manipulation"
                    />
```

Replace:
```jsx
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      💰 Extra Pay
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
                        <span className="text-gray-500 text-sm font-medium">£</span>
                      </div>
                      <Input
                        ref={extraInputRef}
                        type="number"
                        inputMode="decimal"
                        name="extra"
                        value={entry.extra}
                        onChange={debouncedHandleChange}
                        onFocus={() => handleInputFocus(extraInputRef)}
                        onBlur={handleInputBlur}
                        placeholder="0.00"
                        step="0.01"
                        className="pl-10 h-12 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm touch-manipulation text-center font-medium"
                      />
                    </div>
```
with:
```jsx
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      💰 Extra Pay
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
                        <span className="text-muted-foreground text-sm font-medium">£</span>
                      </div>
                      <Input
                        ref={extraInputRef}
                        type="number"
                        inputMode="decimal"
                        name="extra"
                        value={entry.extra}
                        onChange={debouncedHandleChange}
                        onFocus={() => handleInputFocus(extraInputRef)}
                        onBlur={handleInputBlur}
                        placeholder="0.00"
                        step="0.01"
                        className="pl-10 h-12 rounded-[14px] focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm touch-manipulation text-center font-medium tabular-nums"
                      />
                    </div>
```

Replace:
```jsx
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    📝 Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    name="notes"
                    value={entry.notes}
                    onChange={debouncedHandleChange}
                    onFocus={() => handleInputFocus({ current: null })}
                    onBlur={handleInputBlur}
                    placeholder="Additional notes..."
                    className="h-12 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-2xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm touch-manipulation"
                  />
```
with:
```jsx
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    📝 Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    name="notes"
                    value={entry.notes}
                    onChange={debouncedHandleChange}
                    onFocus={() => handleInputFocus({ current: null })}
                    onBlur={handleInputBlur}
                    placeholder="Additional notes..."
                    className="h-12 rounded-[14px] focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm touch-manipulation"
                  />
```

Replace:
```jsx
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !entry.stops}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 px-6 rounded-2xl font-semibold text-base shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed h-14 min-h-[56px] touch-manipulation active:scale-98 flex items-center justify-center"
                >
```
with:
```jsx
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !entry.stops}
                  className="w-full py-4 px-6 rounded-[18px] font-semibold text-base shadow-xl h-14 min-h-[56px] touch-manipulation active:scale-98 flex items-center justify-center"
                >
```

Replace (success message):
```jsx
                    className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl"
```
with:
```jsx
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-[14px]"
```

Replace (undo block):
```jsx
                    className="bg-amber-50 border border-amber-200 p-4 rounded-xl"
```
with:
```jsx
                    className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-[14px]"
```

Replace (error block):
```jsx
                  className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl"
```
with:
```jsx
                  className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-[14px]"
```

Replace (offline notification block):
```jsx
                  className="bg-amber-50 border border-amber-200 p-4 rounded-xl"
```
with (this is the second occurrence of this exact class string — the offline block; the undo block above is the first occurrence, already handled):
```jsx
                  className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-[14px]"
```

Replace:
```jsx
        <Card className="mx-0 rounded-2xl border-0 shadow-sm">
          <CardHeader className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Recent Entries
              </CardTitle>
```
with:
```jsx
        <Card className="mx-0 rounded-[18px] border-0 shadow-sm">
          <CardHeader className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recent Entries
              </CardTitle>
```

Replace:
```jsx
                <div key={log.id} className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(log.date), 'MMM d')}
                      </div>
                      <div className="text-xs font-medium">{log.stops} stops</div>
                      {log.extra > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400">+£{log.extra}</div>
                      )}
                    </div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      £{log.total?.toFixed(0) || '0'}
                    </div>
                  </div>
                </div>
```
with:
```jsx
                <div key={log.id} className="bg-muted p-3 rounded-[14px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.date), 'MMM d')}
                      </div>
                      <div className="text-xs font-medium">{log.stops} stops</div>
                      {log.extra > 0 && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">+£{log.extra}</div>
                      )}
                    </div>
                    <div className="text-sm font-bold text-primary">
                      <Money amount={log.total || 0} />
                    </div>
                  </div>
                </div>
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: PASS — 30/30.

- [ ] **Step 5: Manually verify in the dev server**

Run: `npm start`, sign in as guest, view the Dashboard's "Log Entry" card in both light and dark mode. Confirm: the icon badge is solid teal (not a blue gradient), the stops input has a teal focus ring, "estimated" earnings render via `<Money>`, the submit button is solid teal, and Recent Entries amounts render via `<Money>`.

- [ ] **Step 6: Commit**

```bash
git add src/components/StopEntryForm.jsx
git commit -m "feat: retheme StopEntryForm to the Phase 0 design tokens"
```

---

### Task 3: Retheme FloatingActionButton.jsx

**Files:**
- Modify: `src/components/FloatingActionButton.jsx` (entire file, 209 lines — full replacement)

**Interfaces:**
- Consumes: nothing new (no calculation logic in this file — confirmed during Phase 1 brainstorming that `Layout.jsx`'s `handleQuickEntry`, not this file, computes the total).
- Produces: no change to props (`{ onAddEntry, isVisible }`) or behavior — display only.

- [ ] **Step 1: Read the current file to confirm content**

Read `src/components/FloatingActionButton.jsx` in full.

- [ ] **Step 2: Replace the color/gradient classes**

Replace:
```jsx
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-80 max-w-[calc(100vw-2rem)]"
```
with:
```jsx
              className="bg-card rounded-[18px] shadow-2xl border border-border p-6 w-80 max-w-[calc(100vw-2rem)]"
```

Replace:
```jsx
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-blue-600" />
                  Quick Entry
                </h3>
                <button
                  onClick={handleToggle}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
```
with:
```jsx
                <h3 className="text-lg font-bold text-card-foreground flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-primary" />
                  Quick Entry
                </h3>
                <button
                  onClick={handleToggle}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
```

Replace:
```jsx
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Stops
                  </label>
                  <Input
                    type="number"
                    name="stops"
                    value={quickEntry.stops}
                    onChange={handleInputChange}
                    placeholder="How many deliveries?"
                    required
                    className="w-full h-10 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Extra Pay (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 text-sm">£</span>
                    </div>
                    <Input
                      type="number"
                      name="extra"
                      value={quickEntry.extra}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      className="pl-8 w-full h-10 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !quickEntry.stops}
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
```
with:
```jsx
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Number of Stops
                  </label>
                  <Input
                    type="number"
                    name="stops"
                    value={quickEntry.stops}
                    onChange={handleInputChange}
                    placeholder="How many deliveries?"
                    required
                    className="w-full h-10 rounded-[14px] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Extra Pay (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-muted-foreground text-sm">£</span>
                    </div>
                    <Input
                      type="number"
                      name="extra"
                      value={quickEntry.extra}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      className="pl-8 w-full h-10 rounded-[14px] focus:border-primary focus:ring-2 focus:ring-primary/20 tabular-nums"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !quickEntry.stops}
                  className="w-full h-11 font-semibold rounded-[14px] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
```

Replace:
```jsx
              className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:shadow-blue-500/25 active:shadow-lg"
```
with:
```jsx
              className="w-14 h-14 bg-primary text-primary-foreground hover:opacity-90 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:shadow-primary/25 active:shadow-lg"
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: PASS — 30/30.

- [ ] **Step 4: Manually verify in the dev server**

Run: `npm start`, tap the floating `+` button on any screen. Confirm: the collapsed button and the expanded form both show teal accents (not blue/indigo gradients), in both light and dark mode.

- [ ] **Step 5: Commit**

```bash
git add src/components/FloatingActionButton.jsx
git commit -m "feat: retheme FloatingActionButton to the Phase 0 design tokens"
```

---

### Task 4: Update SimpleDashboard.jsx

**Files:**
- Modify: `src/components/SimpleDashboard.jsx:40-49` (weekStats memo), `:87-135` (summary cards), `:158-203` (recent activity), `:205-226` (quick action buttons)

**Interfaces:**
- Consumes: `Money` from `src/components/ui/money.jsx`.
- Produces: no change to props or behavior — display only, plus one internal shape change (`weekStats.avgPerDay` becomes a `number` instead of a pre-formatted string, for `<Money>` to consume).

- [ ] **Step 1: Read the current file to confirm content**

Read `src/components/SimpleDashboard.jsx` in full.

- [ ] **Step 2: Add the `Money` import**

Add after the existing imports (after the `lucide-react` import):

```js
import { Money } from "./ui/money";
```

- [ ] **Step 3: Make `avgPerDay` a number instead of a pre-formatted string**

Replace (inside the `weekStats` `useMemo`):
```js
    const avgPerDay = thisWeekLogs.length > 0 ? (weeklyEarnings / thisWeekLogs.length).toFixed(2) : 0;
```
with:
```js
    const avgPerDay = thisWeekLogs.length > 0 ? (weeklyEarnings / thisWeekLogs.length) : 0;
```

- [ ] **Step 4: Retheme the Today's Summary cards and swap in `<Money>`**

Replace:
```jsx
          <div className="text-3xl font-bold text-primary">£{todayData.earnings.toFixed(2)}</div>
```
with:
```jsx
          <div className="text-3xl font-bold text-primary"><Money amount={todayData.earnings} /></div>
```

- [ ] **Step 5: Retheme the This Week card and swap in `<Money>`**

Replace:
```jsx
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
```
with:
```jsx
          <Card className="bg-primary/5 border-primary/20">
```

Replace:
```jsx
                <div>
                  <div className="text-2xl font-bold text-primary">£{weekStats.earnings.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Earned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">£{weekStats.avgPerDay}</div>
                  <div className="text-xs text-muted-foreground mt-1">Per Day</div>
                </div>
```
with:
```jsx
                <div>
                  <div className="text-2xl font-bold text-primary"><Money amount={weekStats.earnings} /></div>
                  <div className="text-xs text-muted-foreground mt-1">Earned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold"><Money amount={weekStats.avgPerDay} /></div>
                  <div className="text-xs text-muted-foreground mt-1">Per Day</div>
                </div>
```

- [ ] **Step 6: Retheme the Recent Activity list and swap in `<Money>`**

Replace:
```jsx
                className="bg-card rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors"
```
with:
```jsx
                className="bg-card rounded-[14px] p-4 border border-border/50 hover:border-primary/30 transition-colors"
```

Replace:
```jsx
                  <div className="text-lg font-bold text-primary">
                    £{log.total?.toFixed(2) || '0.00'}
                  </div>
```
with:
```jsx
                  <div className="text-lg font-bold text-primary">
                    <Money amount={log.total || 0} />
                  </div>
```

- [ ] **Step 7: Replace the raw quick-action buttons with the shared `Button` component**

Replace:
```jsx
        <button
          onClick={() => navigate('/app/stats')}
          className="bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 rounded-lg p-4 transition-colors active:scale-95 touch-manipulation"
        >
          <TrendingUp className="w-6 h-6 text-secondary mb-2" />
          <div className="font-medium text-sm">Weekly Stats</div>
        </button>
        <button
          onClick={() => navigate('/app/invoice')}
          className="bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg p-4 transition-colors active:scale-95 touch-manipulation"
        >
          <FileText className="w-6 h-6 text-primary mb-2" />
          <div className="font-medium text-sm">Manage Invoices</div>
        </button>
```
with:
```jsx
        <Button
          onClick={() => navigate('/app/stats')}
          variant="outline"
          className="flex-col h-auto py-4 gap-2 rounded-[14px] active:scale-95 touch-manipulation"
        >
          <TrendingUp className="w-6 h-6 text-secondary" />
          <span className="font-medium text-sm">Weekly Stats</span>
        </Button>
        <Button
          onClick={() => navigate('/app/invoice')}
          variant="outline"
          className="flex-col h-auto py-4 gap-2 rounded-[14px] active:scale-95 touch-manipulation"
        >
          <FileText className="w-6 h-6 text-primary" />
          <span className="font-medium text-sm">Manage Invoices</span>
        </Button>
```

This requires importing `Button`: add after the `Card`/`CardContent` import line:

```js
import { Button } from "./ui/button";
```

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: PASS — 30/30.

- [ ] **Step 9: Manually verify in the dev server**

Run: `npm start`, view the Dashboard in both light and dark mode. Confirm: all money figures render via `<Money>` (check computed `font-variant-numeric: tabular-nums` on at least one), the two quick-action buttons render as bordered outline buttons matching the shared `Button` style (not raw colored divs).

- [ ] **Step 10: Commit**

```bash
git add src/components/SimpleDashboard.jsx
git commit -m "feat: use Money and shared Button components in SimpleDashboard"
```

---

### Task 5: Retheme EntriesPage.jsx

**Files:**
- Modify: `src/components/EntriesPage.jsx:102-245` (header banner, filter card, filter pills), `:253-268` (empty state)

**Interfaces:**
- Consumes: nothing new.
- Produces: no change to props or behavior — display only.

- [ ] **Step 1: Read the current file to confirm content**

Read `src/components/EntriesPage.jsx` in full.

- [ ] **Step 2: Retheme the header banner**

Replace:
```jsx
        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl mr-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  All Entries
                </h1>
                <p className="text-white/80 text-sm mt-1">
                  {(logs || []).length} total deliveries tracked
                </p>
              </div>
            </div>
            {filteredLogs.length > 0 && (
              <Button
                onClick={exportEntries}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 transition-all duration-300 min-h-[48px] touch-manipulation rounded-xl px-6"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
```
with:
```jsx
        <div className="bg-card border border-border rounded-[18px] p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center">
              <div className="p-3 bg-primary/10 rounded-[14px] mr-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground">
                  All Entries
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {(logs || []).length} total deliveries tracked
                </p>
              </div>
            </div>
            {filteredLogs.length > 0 && (
              <Button
                onClick={exportEntries}
                variant="outline"
                className="min-h-[48px] touch-manipulation rounded-[14px] px-6"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
```

- [ ] **Step 3: Retheme the filter card**

Replace:
```jsx
        <Card className="border-2 border-blue-100 dark:border-blue-900 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center mb-4">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Search & Filter
              </h2>
            </div>
```
with:
```jsx
        <Card className="border-border/50 shadow-sm rounded-[18px] overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center mb-4">
              <Sparkles className="w-5 h-5 text-primary mr-2" />
              <h2 className="text-lg font-semibold text-card-foreground">
                Search & Filter
              </h2>
            </div>
```

- [ ] **Step 4: Retheme the three filter inputs (search, from date, to date)**

Replace all three occurrences of:
```
className="pl-11 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors touch-manipulation"
```
with:
```
className="pl-11 h-12 rounded-[14px] focus:border-primary transition-colors touch-manipulation"
```

(There are three `Input` elements with this exact className — search input, start date, end date — replace all three occurrences identically.)

- [ ] **Step 5: Retheme the Clear Filters button**

Replace:
```jsx
                className="h-12 rounded-xl border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
```
with:
```jsx
                className="h-12 rounded-[14px] border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200 hover:bg-primary/5"
```

- [ ] **Step 6: Retheme the active-filter pills**

Replace:
```jsx
                  {searchTerm && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {startDate && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      From: {format(new Date(startDate), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {endDate && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      To: {format(new Date(endDate), 'dd/MM/yyyy')}
                    </span>
                  )}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-medium">
                    {filteredLogs.length} results
                  </span>
```
with:
```jsx
                  {searchTerm && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {startDate && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                      From: {format(new Date(startDate), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {endDate && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                      To: {format(new Date(endDate), 'dd/MM/yyyy')}
                    </span>
                  )}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 font-medium">
                    {filteredLogs.length} results
                  </span>
```

- [ ] **Step 7: Retheme the empty state**

Replace:
```jsx
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl overflow-hidden">
            <CardContent className="py-20 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  No entries yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
```
with:
```jsx
          <Card className="border-2 border-dashed border-border rounded-[18px] overflow-hidden">
            <CardContent className="py-20 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-card-foreground mb-3">
                  No entries yet
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
```

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: PASS — 30/30.

- [ ] **Step 9: Manually verify in the dev server**

Run: `npm start`, navigate to Entries in both light and dark mode. Confirm: the header banner is a muted card (not a blue/indigo/purple gradient), filter pills use the teal accent consistently, empty state (if no entries) uses teal, not blue/purple gradient.

- [ ] **Step 10: Commit**

```bash
git add src/components/EntriesPage.jsx
git commit -m "feat: retheme EntriesPage to the Phase 0 design tokens"
```

---

### Task 6: Retheme EntriesList.jsx

**Files:**
- Modify: `src/components/EntriesList.jsx:1-16` (imports), `:99-157` (summary cards), `:160-176` (main card header), `:76-95` (sort buttons), `:191-230` (per-entry rows), `:238-291` (pagination)

**Interfaces:**
- Consumes: `Money` from `src/components/ui/money.jsx`.
- Produces: no change to props (`{ logs, onDeleteEntry }`) or behavior — display only. Sorting, pagination, and CSV export logic (owned by `EntriesPage.jsx`, unchanged) are untouched.

- [ ] **Step 1: Read the current file to confirm content**

Read `src/components/EntriesList.jsx` in full.

- [ ] **Step 2: Add the `Money` import**

Add after the `lodash` import (line 16):

```js
import { Money } from "./ui/money";
```

- [ ] **Step 3: Convert the three summary cards from vivid gradients to the muted Card style**

Replace the entire summary-cards block:
```jsx
      {/* Stats Summary - 2.0 Style */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Last 7 Days */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-xl text-white touch-manipulation"
        >
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">7 Days</span>
          </div>
          <div className="text-3xl font-bold mb-1">{last7Days.stops}</div>
          <div className="text-white/80 text-sm mb-3">Stops Delivered</div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">£{last7Days.total.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Last 4 Weeks */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl text-white touch-manipulation"
        >
          <div className="flex items-center justify-between mb-4">
            <Package className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">28 Days</span>
          </div>
          <div className="text-3xl font-bold mb-1">{last4Weeks.stops}</div>
          <div className="text-white/80 text-sm mb-3">Stops Delivered</div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">£{last4Weeks.total.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Last Month */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl p-6 shadow-xl text-white touch-manipulation sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 opacity-80" />
            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">30 Days</span>
          </div>
          <div className="text-3xl font-bold mb-1">{lastMonth.stops}</div>
          <div className="text-white/80 text-sm mb-3">Stops Delivered</div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">£{lastMonth.total.toFixed(2)}</span>
          </div>
        </motion.div>
      </div>
```
with:
```jsx
      {/* Stats Summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Last 7 Days */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-border/50 touch-manipulation">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-primary" />
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">7 Days</span>
              </div>
              <div className="text-3xl font-bold mb-1 tabular-nums">{last7Days.stops}</div>
              <div className="text-muted-foreground text-sm mb-3">Stops Delivered</div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-primary"><Money amount={last7Days.total} /></span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Last 4 Weeks */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="border-border/50 touch-manipulation">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Package className="w-8 h-8 text-primary" />
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">28 Days</span>
              </div>
              <div className="text-3xl font-bold mb-1 tabular-nums">{last4Weeks.stops}</div>
              <div className="text-muted-foreground text-sm mb-3">Stops Delivered</div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-primary"><Money amount={last4Weeks.total} /></span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Last Month */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="sm:col-span-2 lg:col-span-1"
        >
          <Card className="border-border/50 touch-manipulation h-full">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-primary" />
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">30 Days</span>
              </div>
              <div className="text-3xl font-bold mb-1 tabular-nums">{lastMonth.stops}</div>
              <div className="text-muted-foreground text-sm mb-3">Stops Delivered</div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-primary"><Money amount={lastMonth.total} /></span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
```

- [ ] **Step 4: Retheme the main entries card header**

Replace:
```jsx
      <Card className="border-2 border-gray-100 dark:border-gray-800 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
              All Deliveries
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                ({logs.length} total)
              </span>
            </CardTitle>
```
with:
```jsx
      <Card className="border-border/50 shadow-sm rounded-[18px] overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-bold flex items-center">
              <Zap className="w-6 h-6 text-primary mr-2" />
              All Deliveries
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({logs.length} total)
              </span>
            </CardTitle>
```

- [ ] **Step 5: Retheme the sort buttons**

Replace:
```jsx
      className="flex items-center gap-2 h-10 rounded-xl transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 touch-manipulation min-h-[44px]"
```
with:
```jsx
      className="flex items-center gap-2 h-10 rounded-[14px] transition-all duration-200 hover:bg-primary/5 touch-manipulation min-h-[44px]"
```

Replace:
```jsx
        sortOrder === "asc" ? (
          <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )
```
with:
```jsx
        sortOrder === "asc" ? (
          <ChevronUp className="w-4 h-4 text-primary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-primary" />
        )
```

- [ ] **Step 6: Retheme the per-entry rows**

Replace:
```jsx
                  <div className="flex justify-between items-center p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 border-2 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-sm hover:shadow-lg touch-manipulation">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-bold text-gray-900 dark:text-white text-lg">
                          {formatDate(log.date)}
                        </div>
                        {log.extra > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            +£{log.extra}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Package className="w-4 h-4" />
                        <span className="font-medium">{log.stops} stops</span>
                      </div>
                      {log.notes && (
                        <div className="text-sm text-gray-500 dark:text-gray-500 mt-2 italic">
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          £{log.total?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                          onDeleteEntry(log.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
```
with:
```jsx
                  <div className="flex justify-between items-center p-4 sm:p-5 rounded-[14px] bg-card hover:bg-primary/5 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md touch-manipulation">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-bold text-foreground text-lg">
                          {formatDate(log.date)}
                        </div>
                        {log.extra > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400">
                            +£{log.extra}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span className="font-medium">{log.stops} stops</span>
                      </div>
                      {log.notes && (
                        <div className="text-sm text-muted-foreground mt-2 italic">
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          <Money amount={log.total || 0} />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                          onDeleteEntry(log.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive rounded-[14px] transition-all duration-200 min-h-[44px] min-w-[44px] touch-manipulation"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
```

- [ ] **Step 7: Retheme the pagination controls**

Replace:
```jsx
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
```
with:
```jsx
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-border">
```

Replace both occurrences of:
```
className="h-11 px-6 rounded-xl border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200"
```
with:
```
className="h-11 px-6 rounded-[14px] border-2 font-medium touch-manipulation min-h-[48px] transition-all duration-200"
```

Replace:
```jsx
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  Page {page} of {totalPages}
                </span>
```
with:
```jsx
                <span className="text-sm font-medium px-4 py-2 bg-muted rounded-[14px]">
                  Page {page} of {totalPages}
                </span>
```

Replace:
```jsx
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Items per page:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setPage(1);
                    if (navigator.vibrate) navigator.vibrate(5);
                  }}
                  className="h-11 px-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-xl font-medium focus:border-blue-500 dark:focus:border-blue-400 transition-colors touch-manipulation"
                >
```
with:
```jsx
                <label className="text-sm font-medium">
                  Items per page:
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setPage(1);
                    if (navigator.vibrate) navigator.vibrate(5);
                  }}
                  className="h-11 px-4 bg-input border border-border rounded-[14px] font-medium focus:border-primary transition-colors touch-manipulation"
                >
```

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: PASS — 30/30.

- [ ] **Step 9: Manually verify in the dev server**

Run: `npm start`, navigate to Entries with some logged data (log a few entries first if the account is fresh), view in both light and dark mode. Confirm: the three summary cards are now muted cards with a teal icon accent (not full vivid gradients), per-entry rows have a single consistent hover state (not a two-tone gradient), all money figures render via `<Money>` with tabular alignment.

- [ ] **Step 10: Commit**

```bash
git add src/components/EntriesList.jsx
git commit -m "feat: retheme EntriesList, converting summary cards from vivid gradients to muted style"
```

---

## Self-Review Notes

- **Spec coverage:** The correctness fix (Task 1), the retheme of all five named files (Tasks 2-6), the `EntriesList.jsx` gradient-cards decision (Task 6), and the `EntriesPage.jsx` header/filter treatment (Task 5) are all covered. `FloatingActionButton.jsx` staying a separate, calculation-consistent entry point (non-goal) is satisfied by Task 3 doing presentation-only changes.
- **Placeholder scan:** none found — every step has complete, copy-pasteable code or exact before/after snippets.
- **Type/name consistency:** `estimatedEarnings` (Task 1, now a number) is consumed correctly in Task 2's `<Money amount={estimatedEarnings} />`. `Money`'s `amount` prop is used consistently as a raw number (not a pre-formatted string) at every call site across Tasks 2, 4, and 6 — including `weekStats.avgPerDay`, which Task 4 explicitly converts from a string (`.toFixed(2)` in the memo) to a number before passing it to `<Money>`.
