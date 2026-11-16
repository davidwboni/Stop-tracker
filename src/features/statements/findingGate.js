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
// Drivers may deliberately invoice the amount printed on the contractor
// statement while keeping discrepancies open for a later dispute. This is
// authorisation to invoice a particular figure, NOT verification of those
// disputed workdays and NOT confirmation that payment was received.
export function hasExplicitInvoiceApproval(record){
 const approval=record?.invoiceApproval,comparison=record?.payoutComparison;
 return !!approval&&approval.kind==='driver_accepted_contractor_amount'&&
   typeof approval.acceptedAt==='string'&&approval.acceptedAt.length>0&&
   Number.isSafeInteger(comparison?.statementPence)&&comparison.statementPence>=0&&
   approval.statementPence===comparison.statementPence&&
   typeof comparison.revision==='string'&&approval.revision===comparison.revision&&
   record?.reviewedStatement?.reviewed===true;
}
export function statementInvoiceReady(record){
 const findings=record?.statementFindings;
 return !!record?.payoutComparison &&
   (!findings || record?.reviewedStatement?.reviewed===true) &&
   (hasExplicitInvoiceApproval(record) || (
     unresolvedStatementFindings(record).length===0 &&
     (!requiresLimitedCoverageAcceptance(findings)||findings?.limitedCoverageAccepted===true)
   ));
}
export function mergeFindingDecisions(record){
 const flagged=record?.statementFindings?.flagged;
 if(!Array.isArray(flagged))return {};
 return Object.fromEntries(flagged.filter(item=>item?.date && typeof item.acceptedReason==='string'&&item.acceptedReason).map(item=>[item.date,item.acceptedReason]));
}
