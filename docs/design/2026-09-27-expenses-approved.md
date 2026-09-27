# Expenses overview — approved implementation

Approved in chat on 27 September 2026. Route: /app/money/expenses.

- Current pay period, recorded total and source split. With no configured period, explicitly label the calendar month and link to period setup.
- All / Contractor charges / My expenses filter the records only, leaving the period total unchanged.
- Money masking also covers details and expected-cost amounts. Safe areas, responsive columns, mobile Add dock, light/dark tokens and reduced motion.
- Details expose edit, confirmed deletion, explicit recurring setup and stopping future recurrence.
- Expected occurrences are generated deterministically from confirmed weekly, four-weekly or monthly rules. Calendar-month dates clamp without drifting after February. Expectations are excluded from all recorded totals.
- Rule and recorded-occurrence IDs distinguish expectations from actual expenses. Review and record opens the manual form; a stable occurrence ID makes retrying idempotent. No matching by amount/merchant alone.
- Expense sources are explicit. Percentage contractor fee is not automatically duplicated in expenses.
- Signed-in mutations use an atomic Firestore batch for expense changes and any affected checked-period status; guest writes are identity-scoped and roll back if persistence fails. The context reflects needs_review immediately. The next successful Check Pay comparison clears that flag.
- Loaded records stay available on refresh errors; totals become unavailable rather than falsely zero. Add is disabled while records cannot be verified. Signed-in changes currently require connectivity; guest saves are local.
- No receipt uploads, AI scan or invoice retention added. No personal or financial values in the added analytics events.

Validation: production build succeeds. 48 targeted tests across seven files pass, including the previously outstanding Quick Entry tests, source totals, unknown/error states, duplicate recurrence, monthly scheduling, delete confirmation, guest persistence and checked-period invalidation. Signed-in Firestore batch behaviour still needs emulator/device end-to-end verification. Browser rendering attempt fails because the browser daemon cannot start in this environment; do not claim iOS/Android visual verification. No production deployment performed.

Next: Add Expense redesign. Current minimal manual dialog remains functional for add/edit/recurring confirmation until that screen is approved. Proposed redesigned default is Manual (free), with contextual Scan with AI (Pro), explicit source, date, amount, category, description, optional notes/receipt. Receipt retention is opt-in, shown only after attachment. AI review always precedes saving. No receipt trial allocation is assumed from the three free statement checks.
