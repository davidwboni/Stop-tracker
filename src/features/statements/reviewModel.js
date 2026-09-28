export const reviewAmount = value => /^-?\d+(\.\d{1,2})?$/.test(String(value)) && Number.isSafeInteger(Math.round(Number(value)*100));
export const reviewPence = value => Math.round(Number(value)*100);
export function createStatementReview(data) {
 const cash=v=>data.currency==='GBP'&&typeof v==='number'?String(v):'';
 return {start:data.periodStart||'',end:data.periodEnd||'',currency:data.currency||'',taxBasis:data.taxBasis||'unknown',payout:cash(data.contractorPayout),gross:cash(data.statementAmount),fee:cash(data.contractorFee),charges:cash(data.contractorCharges),chargesReviewed:false,
 items:(data.charges||[]).map((item,i)=>({id:String(i),label:item.label||'Other charge',amount:cash(item.amount),reviewed:false})),reviewed:false};
}
export function reviewIssues(d,period) {
 const issues=[];
 if(d.start!==period.start||d.end!==period.end)issues.push({field:'start',message:'Match the statement dates to the selected pay period.'});
 if(d.currency!=='GBP')issues.push({field:'currency',message:'This comparison needs a GBP statement.'});
 if(!['excluded','not_applicable'].includes(d.taxBasis))issues.push({field:'taxBasis',message:'Confirm that the payout excludes VAT, or that VAT does not apply. VAT-inclusive payout needs a separate adjustment before comparison.'});
 if(!reviewAmount(d.payout))issues.push({field:'payout',message:'Enter the final contractor payout shown on the statement.'});
 for(const key of ['gross','fee','charges'])if(d[key]!==''&&!reviewAmount(d[key]))issues.push({field:key,message:'Check the amount in '+key+'.'});
 for(const item of d.items)if(!reviewAmount(item.amount)||!item.reviewed)issues.push({field:'item-'+item.id,message:'Check '+item.label+' against the source.'});
 const totals=['gross','fee','charges','payout'];
 if(totals.every(k=>reviewAmount(d[k]))&&reviewPence(d.gross)-reviewPence(d.fee)-reviewPence(d.charges)!==reviewPence(d.payout))issues.push({field:'payout',message:'Earnings minus fees and charges do not equal the printed payout. Correct the figures or clear an optional subtotal that cannot be verified.'});
 if(d.items.length&&d.items.every(i=>reviewAmount(i.amount))&&reviewAmount(d.charges)&&d.items.reduce((s,i)=>s+reviewPence(i.amount),0)!==reviewPence(d.charges))issues.push({field:'charges',message:'The charge items do not add up to the contractor charges total. Add missing items, correct the total, or clear an incomplete item list.'});
 if(!d.reviewed)issues.push({field:'reviewed',message:'Confirm that you checked these figures against your statement.'});
 return issues;
}
export function confirmedReview(d){
 return {start:d.start,end:d.end,currency:d.currency,taxBasis:d.taxBasis,payoutPence:reviewPence(d.payout),grossPence:reviewAmount(d.gross)?reviewPence(d.gross):null,feePence:reviewAmount(d.fee)?reviewPence(d.fee):null,chargesPence:reviewAmount(d.charges)?reviewPence(d.charges):null,charges:d.items.map(i=>({label:i.label,amountPence:reviewPence(i.amount),reviewed:true})),reviewed:true};
}
