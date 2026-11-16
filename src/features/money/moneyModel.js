import { pennies, summarizeDay } from '../home/homeModel';
import { expenseSummary, validDate } from '../expenses/expenseModel';
export const validRange = p => validDate(p?.start) && validDate(p?.end) && p.start <= p.end;
export function moneySummary(logs, expenses, period) {
  const rows=logs.filter(r=>r.date>=period.start&&r.date<=period.end);
  const days=rows.map(r=>summarizeDay(r));
  const known=days.every(d=>d&&!d.unavailable);
  const feeKnown=known&&days.every(d=>d.fee!=null);
  const gross=known?days.reduce((s,d)=>s+pennies(d.gross),0):null;
  const fee=feeKnown?days.reduce((s,d)=>s+pennies(d.fee),0):null;
  const costs=expenseSummary(expenses,period);
  const payout=gross!=null&&fee!=null?gross-fee-pennies(costs.contractor):null;
  const rates=[...new Set(days.map(d=>d?.feeRate).filter(r=>r!=null))];
  return {rows,days,gross,fee,costs,payout,takeHome:payout==null?null:payout-pennies(costs.own),feeRate:rates.length===1?rates[0]:null};
}
export async function moneyRevision(logs,expenses,period) {
  const ordered=rows=>rows.filter(r=>r.date>=period.start&&r.date<=period.end).map(r=>JSON.stringify(r)).sort();
  const bytes=new TextEncoder().encode(JSON.stringify([period.start,period.end,ordered(logs),ordered(expenses)]));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
export function payoutComparison(record,period,summary,revision,unavailable=false) {
  const c=record?.payoutComparison;
  if(!record || (!c && record.statementAmount==null && record.statementStops==null && !['statement_received','checked','reconciled','needs_review'].includes(record.status)))return {state:'none'};
  if(!c||c.scope!=='contractor_payout'||c.currency!=='GBP'||c.taxBasis!=='same_as_records'||!c.basisConfirmed||c.start!==period.start||c.end!==period.end||!Number.isSafeInteger(c.statementPence))return {state:'incomplete'};
  if(unavailable||summary.payout==null||!revision)return {state:'unavailable'};
  // An explicitly approved contractor amount can proceed to an invoice while
  // retaining the workday disagreements in statementFindings/needsReview.
  // The statement amount and immutable comparison revision must still match.
  const a=record.invoiceApproval;
  const explicitlyApproved=!!a&&a.kind==='driver_accepted_contractor_amount'&&
    a.statementPence===c.statementPence&&a.revision===c.revision&&
    record.reviewedStatement?.reviewed===true;
  if((record.needsReview&&!explicitlyApproved)||record.status==='needs_review'||c.revision!==revision||c.expectedPence!==summary.payout)return {state:'stale',statement:c.statementPence};
  const difference=c.statementPence-summary.payout;
  const reconciled=record.status==='reconciled'&&!!record.resolvedAt;
  return {state:reconciled?'reconciled':difference===0?'matched':'difference',statement:c.statementPence,difference};
}
