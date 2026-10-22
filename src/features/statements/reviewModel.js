export const reviewAmount = value => /^-?\d+(\.\d{1,2})?$/.test(String(value)) && Number.isSafeInteger(Math.round(Number(value)*100));
export const reviewPence = value => Math.round(Number(value)*100);
export function createStatementReview(data) {
 const cash=v=>data.currency==='GBP'&&typeof v==='number'?String(v):'';
 return {start:data.periodStart||'',end:data.periodEnd||'',currency:data.currency||'',taxBasis:data.taxBasis||'unknown',payout:cash(data.contractorPayout),gross:cash(data.statementAmount),fee:cash(data.contractorFee),charges:cash(data.contractorCharges),chargesReviewed:false,
 items:(data.charges||[]).map((item,i)=>({id:String(i),label:item.label||'Other charge',amount:cash(item.amount),reviewed:false})),reviewed:false};
}
// Only factors required for a responsible *payout total* comparison block progress.
// Details of individual charges are optional evidence; missing or inconsistent
// line items must not trap the driver after the final payout has been reviewed.
export function reviewIssues(d,period) {
 const issues=[];
 if(d.start!==period.start||d.end!==period.end)issues.push({field:'start',message:'Match the statement dates to the selected pay period.'});
 if(d.currency!=='GBP')issues.push({field:'currency',message:'This comparison needs a GBP statement.'});
 if(!['excluded','not_applicable'].includes(d.taxBasis))issues.push({field:'taxBasis',message:'Confirm a payout before VAT (or that VAT does not apply). A VAT-inclusive payout cannot be compared without adjustment.'});
 if(!reviewAmount(d.payout))issues.push({field:'payout',message:'Enter the final contractor payout shown on the statement, before VAT.'});
 if(!d.reviewed)issues.push({field:'reviewed',message:'Tick the confirmation after checking the payout, period and VAT basis against the original statement.'});
 return issues;
}
// Present mismatched subtotals and skipped item evidence prominently, but do
// not call an optional charge breakdown a condition for checking final pay.
export function reviewWarnings(d) {
 const warnings=[];
 for(const key of ['gross','fee','charges'])if(d[key]!==''&&!reviewAmount(d[key]))
   warnings.push({field:key,message:'Optional '+key+' amount is incomplete and will not be used for line-by-line comparison.'});
 if(d.items.some(item=>!reviewAmount(item.amount)||!item.reviewed))
   warnings.push({field:'items',message:'Some individual charges have not been confirmed. Only the final payout can be checked; unconfirmed charge details will not be marked verified.'});
 if(['gross','fee','charges','payout'].every(k=>reviewAmount(d[k])) &&
    reviewPence(d.gross)-reviewPence(d.fee)-reviewPence(d.charges)!==reviewPence(d.payout))
   warnings.push({field:'payout',message:'Work earnings minus the listed fees and charges do not equal the final payout. Check VAT or missing adjustments before relying on the breakdown.'});
 if(d.items.length&&d.items.every(i=>reviewAmount(i.amount))&&reviewAmount(d.charges)&&d.items.reduce((sum,i)=>sum+reviewPence(i.amount),0)!==reviewPence(d.charges))
   warnings.push({field:'charges',message:'Individual charges do not add up to the statement’s charges total. Review that breakdown separately.'});
 return warnings;
}
export function confirmedReview(d){
 return {start:d.start,end:d.end,currency:d.currency,taxBasis:d.taxBasis,payoutPence:reviewPence(d.payout),
 grossPence:reviewAmount(d.gross)?reviewPence(d.gross):null,
 feePence:reviewAmount(d.fee)?reviewPence(d.fee):null,
 chargesPence:reviewAmount(d.charges)?reviewPence(d.charges):null,
 charges:d.items.filter(i=>reviewAmount(i.amount)).map(i=>({label:i.label,amountPence:reviewPence(i.amount),reviewed:!!i.reviewed})),reviewed:true};
}
