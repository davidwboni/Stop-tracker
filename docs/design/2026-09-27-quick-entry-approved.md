# Quick Entry — approved implementation

The owner approved the Quick Entry mockup and behaviour in chat on 27 September 2026.

## Included
- Focused responsive sheet, 480px maximum width, scrolling body and persistent Save footer.
- Theme tokens for readable dark/light modes; 16px+ form inputs and 44px+ targets.
- Stops and total parcels, automatic excess display; unknown parcels remain unknown.
- Extras off by default with optional type, amount and notes. Blank extra amount explicitly contributes no payment.
- Date always visible; existing days load their records. Save changes preserves the entry ID.
- Day-rate worked choices; hours, miles and sliding mileage adapt to the configured pay model.
- Gross and after-percentage-fee preview labelled estimated, before expenses/personal tax.
- Missing historical fee stays unknown. Notes-only edits preserve legacy stored gross.
- Save lock, inline validation, retained failure inputs, stable retry ID, duplicate-date guard and concurrent-record-change guard.
- Close/Escape/outside tap asks to discard dirty input; changing date also asks first.
- Focus-trapped dialog, reduced-motion support and visual-viewport height handling.
- Native-shell Back handler dismisses keyboard first, then routes through the close guard.
- Page-unload warning for unsaved work. Browser-history Back behaviour still requires device verification.
- Success callback distinguishes local-only/guest saves from synced work.
- Allowlisted dismissal/validation analytics. No amounts, counts, dates or notes as event properties.

## Validation status
Workspace unavailable (exec-server connection failure). Ten direct checks of the pure validation/helper module passed in the orchestration runtime. Component regression tests were updated and extended, but were NOT executed. No React build, browser rendering, iOS/Android or Capacitor verification was possible for this commit. Prior Home test/build results do not validate this change. Keep on the feature branch until these gates pass.

Suggested test command after workspace recovery:
npm test -- --reporter=dot src/__tests__/homeEntry.test.jsx src/__tests__/quickEntryModel.test.js src/__tests__/homeModel.test.js src/__tests__/homeScreen.test.jsx src/__tests__/payStructure.test.ts

Then run the production build and inspect the existing isolated Home fixture's Quick Entry at 320px, 390px and desktop, light/dark, with keyboard and reduced motion.

## Next screen — Expenses overview (proposal, not implemented)
Money > Expenses, with Overview / Expenses / Insights section navigation.
Period selector; recorded-cost total and source split; All / Contractor charges / My expenses filters; recent rows with source/date and recurring status. Add expense is the single primary CTA.
Expected recurring occurrences appear in a separate compact upcoming summary and are excluded from recorded totals. Confirmed statement occurrences match/replace expected occurrences, never append another copy. No recurring rule created without consent.
Contractor percentage fees remain in Money's deduction calculation, not counted a second time as expense rows.
Manual expense entry remains free. AI receipt scan belongs to the next Add Expense screen and requires review before saving.
