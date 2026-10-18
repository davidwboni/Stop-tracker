import { getPeriodForDate } from '../payperiod/periods';
import { validDate } from './expenseModel';
import { moneyRevision, moneySummary, payoutComparison } from '../money/moneyModel';

// A driver's personal spending changes take-home, not the contractor payout.
// Preserve an already-verified statement check by rolling its existing
// full-ledger revision forward only when the OLD revision is still valid,
// work is unchanged and every contractor-charge record is unchanged.
// Legacy comparisons stay valid without forcing a one-time migration.
export async function expenseReviewPatches({
  logs, before, after, dates, anchor, periodRecords, updatedAt
}) {
  const patches = {};
  if (!anchor) return patches;
  const periods = new Map();
  for (const date of dates.filter(validDate)) {
    const period = getPeriodForDate(anchor, date);
    periods.set(period.id, period);
  }
  for (const [id, period] of periods) {
    const record = periodRecords[id];
    if (!record || !['checked','reconciled','needs_review'].includes(record.status)) continue;
    if (record.needsReview || record.status==='needs_review') continue; // Never silently clear a pre-existing recheck.

    const contractorRecords = rows=>rows
      .filter(r=>r.source==='contractor_charge' && r.date>=period.start && r.date<=period.end)
      .map(r=>JSON.stringify(r)).sort();
    const contractorChanged =
      JSON.stringify(contractorRecords(before))!==JSON.stringify(contractorRecords(after));
    if (!contractorChanged && record.payoutComparison) {
      const priorSummary = moneySummary(logs, before, period);
      const nextSummary = moneySummary(logs, after, period);
      const oldRevision = await moneyRevision(logs, before, period);
      const check = payoutComparison(record, period, priorSummary, oldRevision);
      if (['matched','difference','reconciled'].includes(check.state)
          && priorSummary.payout === nextSummary.payout) {
        const nextRevision = await moneyRevision(logs, after, period);
        if (nextRevision!==oldRevision) patches[id] = {
          ...record,
          payoutComparison:{...record.payoutComparison,revision:nextRevision},
          updatedAt
        };
        continue;
      }
    }
    // Any genuine contractor change or already-invalid revision must be reviewed.
    patches[id] = {...record,status:'needs_review',needsReview:true,updatedAt};
  }
  return patches;
}
