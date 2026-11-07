// Independent arithmetic checks of amounts the contractor actually printed.
// No VAT percentage, contractor discount or missing line is ever inferred.
// The source document and raw AI response are not stored here.
const pennies=x=>typeof x==='number'&&Number.isFinite(x)&&
  Number.isSafeInteger(Math.round(x*100))?Math.round(x*100):null;
function auditStatementArithmetic(s){
 const checks=[];
 function check(key,label,printed,calculated){
   if(printed===null||calculated.some(v=>v===null))return;
   checks.push({key,label,matches:printed===calculated.reduce((a,b)=>a+b,0)});
 }
 const gross=pennies(s?.statementAmount);
 const delivery=pennies(s?.deliverySubtotal),extras=pennies(s?.extraPaymentsTotal);
 const fee=pennies(s?.contractorFee),charges=pennies(s?.contractorCharges);
 const net=pennies(s?.beforeVatPayout),vat=pennies(s?.vatAmount),final=pennies(s?.contractorPayout);
 check('gross','Delivery earnings plus extra payments',gross,[delivery,extras]);
 check('before_vat','Gross less contractor fees and charges',net,[gross,fee===null?null:-fee,charges===null?null:-charges]);
 if(s?.taxBasis==='included')
   check('after_vat','Before-VAT payout plus printed VAT',final,[net,vat]);
 const mismatches=checks.filter(c=>!c.matches);
 const status=mismatches.length?'mismatch':checks.length?'balanced':'not_checked';
 // Detailed rows are additional extraction evidence, not proof of the
 // printed statement totals when the scan omits one or more daily rows.
 let dailyCoverage=null;
 if(s?.statementStops!=null&&Array.isArray(s?.daily)&&s.daily.length&&s.daily.every(d=>Number.isSafeInteger(d?.stops)&&d.stops>=0)){
   dailyCoverage=s.daily.reduce((sum,d)=>sum+d.stops,0)===s.statementStops;
 }
 return {status,checks,mismatches,dailyCoverage};
}
module.exports={auditStatementArithmetic};
