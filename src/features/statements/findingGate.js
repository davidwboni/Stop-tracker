// Invoice readiness is separate from recording a statement or a payout match.
// Even a matching total cannot confirm individual unexplained stop differences.
// Legacy comparisons with no itemised findings remain labelled as totals-only.
const settledReasons=new Set(['possible_duplicate_accepted','figures_verified']);
export function unresolvedStatementFindings(record){
 const flagged=record?.statementFindings?.flagged;
 if(!Array.isArray(flagged))return [];
 return flagged.filter(item=>!settledReasons.has(item?.acceptedReason));
}
// Partial or summary-only scans are not fully reconciled simply because the
// visible totals match. The driver may explicitly accept that limitation.
export function requiresLimitedCoverageAcceptance(findings){
 if(!findings || typeof findings!=='object')return false; // legacy checked records
 return findings.summaryOnly===true || findings.hasDaily===false ||
   Number(findings.incompleteDays||0)>0 || Number(findings.outsidePeriod||0)>0 ||
   Number(findings.earningsDifferences||0)>0;
}
export function statementInvoiceReady(record){
 const findings=record?.statementFindings;
 return !!record?.payoutComparison &&
   (!findings || record?.reviewedStatement?.reviewed===true) &&
   unresolvedStatementFindings(record).length===0 &&
   (!requiresLimitedCoverageAcceptance(findings)||findings?.limitedCoverageAccepted===true);
}
export function mergeFindingDecisions(record){
 const flagged=record?.statementFindings?.flagged;
 if(!Array.isArray(flagged))return {};
 return Object.fromEntries(flagged.filter(item=>item?.date && typeof item.acceptedReason==='string'&&item.acceptedReason).map(item=>[item.date,item.acceptedReason]));
}
