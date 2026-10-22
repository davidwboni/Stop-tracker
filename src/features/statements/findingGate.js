// Invoice readiness is separate from recording a statement or a payout match.
// Even a matching total cannot confirm individual unexplained stop differences.
// Legacy comparisons with no itemised findings remain labelled as totals-only.
const settledReasons=new Set(['possible_duplicate_accepted','figures_verified']);
export function unresolvedStatementFindings(record){
 const flagged=record?.statementFindings?.flagged;
 if(!Array.isArray(flagged))return [];
 return flagged.filter(item=>!settledReasons.has(item?.acceptedReason));
}
export function statementInvoiceReady(record){
 return !!record?.payoutComparison &&
   (!record?.statementFindings || record?.reviewedStatement?.reviewed===true) &&
   unresolvedStatementFindings(record).length===0;
}
export function mergeFindingDecisions(record){
 const flagged=record?.statementFindings?.flagged;
 if(!Array.isArray(flagged))return {};
 return Object.fromEntries(flagged.filter(item=>item?.date && typeof item.acceptedReason==='string'&&item.acceptedReason).map(item=>[item.date,item.acceptedReason]));
}
