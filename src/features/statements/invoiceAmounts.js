// Invoice amounts are derived only from a reviewed contractor statement.
// Any VAT-inclusive total must reconcile to the independently recorded VAT
// amount. Never apply a guessed rate or automatically charge VAT.
export function statementInvoiceAmounts(record){
 const p=record?.payoutComparison?.statementPence;
 if(!Number.isSafeInteger(p)||p<0)return null;
 const review=record.reviewedStatement;
 const incl=review?.vatIncludedPayoutPence,vat=review?.vatAmountPence;
 const vatShown=Number.isSafeInteger(incl)&&Number.isSafeInteger(vat)&&vat>0&&
   Number.isSafeInteger(p)&&incl===p+vat;
 return {
   netPence:p,
   vatPence:vatShown?vat:null,
   vatInclusivePence:vatShown?incl:null,
   vatEvidence:vatShown
 };
}
