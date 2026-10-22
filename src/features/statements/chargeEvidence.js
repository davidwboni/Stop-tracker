// Match statement charges only against independent evidence. A fuel pump
// receipt is NOT the same amount as a discounted fleet-card settlement.
// Results are advisory; no ledger entries or fee snapshots are modified.
const pence=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&Number.isSafeInteger(Math.round(x*100))?Math.round(x*100):null;
const type=label=>{
 const x=String(label||'').toLowerCase();
 if(/fuel|diesel|petrol/.test(x))return 'fuel';
 if(/lease|rental|van hire/.test(x))return 'lease';
 if(/insurance/.test(x))return 'insurance';
 if(/management|admin/.test(x))return 'management';
 if(/mileage/.test(x))return 'mileage';
 if(/mobile|phone/.test(x))return 'mobile';
 if(/claim/.test(x))return 'claim';
 return 'other';
};
export function statementChargeEvidence(statement,expenses=[],period){
 const charges=Array.isArray(statement?.charges)?statement.charges:[];
 const inPeriod=(expenses||[]).filter(x=>x.date>=period.start&&x.date<=period.end);
 return charges.map((charge,index)=>{
   const kind=type(charge.label),amount=pence(charge.amount);
   const evidence=inPeriod.filter(e=>type(e.category||e.description)===kind);
   const billed=evidence.filter(e=>e.source==='contractor_charge');
   const own=evidence.filter(e=>e.source==='my_expense');
   const billedTotal=billed.reduce((sum,e)=>sum+(pence(e.amount)||0),0);
   let status='unverified',explanation='No independent charge record matched this category. Check the agreement or statement.';
   if(amount!=null&&billed.length){
     status=amount===billedTotal?'matches_recorded_charge':'different_from_recorded_charge';
     explanation=status==='matches_recorded_charge'?'Matches the contractor charges you separately recorded; confirm the original statement.':'Differs from contractor charges recorded for these dates; check for multiple or discounted transactions.';
   }else if(kind==='fuel'&&own.length){
     const haveDiscount=own.every(e=>pence(e.fuelCardDiscount)!=null&&pence(e.fuelCardDiscount)<=pence(e.amount));
     const expected=haveDiscount?own.reduce((sum,e)=>sum+pence(e.amount)-pence(e.fuelCardDiscount),0):null;
     if(expected!=null&&amount!=null){
       status=expected===amount?'fuel_discount_consistent':'fuel_discount_difference';
       explanation=status==='fuel_discount_consistent'?'Matches the recorded fuel-card discount; confirm what was actually billed.':'Differs after the fuel-card discounts you entered; check the transactions.';
     }else{
       status='fuel_discount_unknown';
       explanation='Pump receipts can differ from the contractor fuel charge because of fuel-card discounts. No discount is assumed.';
     }
   }
   return {id:index,label:String(charge.label||'Unlabelled charge'),amountPence:amount,kind,status,explanation,referenceCount:billed.length+own.length};
 });
}
