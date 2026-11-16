// Persist extracted, non-sensitive pay figures, never the uploaded document,
// driver name/address/bank details, or an unbounded provider response.
const numeric=['statementAmount','contractorPayout','beforeVatPayout','vatAmount','statementStops','contractorFee','contractorCharges','deliverySubtotal','extraPaymentsTotal'];
const permittedBasis=['included','excluded','not_applicable','unknown'];
const dateOk=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const moneyNumber=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e8?n:null;
export function compactStatementScan(input){
 if(!input||typeof input!=='object')return null;
 const data={currency:input.currency==='GBP'?'GBP':'unknown',taxBasis:permittedBasis.includes(input.taxBasis)?input.taxBasis:'unknown'};
 for(const key of ['periodStart','periodEnd'])data[key]=dateOk(input[key])?input[key]:null;
 for(const key of numeric)data[key]=moneyNumber(input[key]);
 data.extractionMode=input.extractionMode==='summary_only'?'summary_only':null;
 data.daily=(Array.isArray(input.daily)?input.daily:[]).slice(0,366).filter(row=>dateOk(row?.date)).map(row=>({
   date:row.date,stops:Number.isSafeInteger(row.stops)&&row.stops>=0?row.stops:null,
   amount:moneyNumber(row.amount),parcels:Number.isSafeInteger(row.parcels)&&row.parcels>=0?row.parcels:null
 }));
 data.charges=(Array.isArray(input.charges)?input.charges:[]).slice(0,40).map(row=>({
   label:typeof row?.label==='string'?row.label.slice(0,100):'Charge',amount:moneyNumber(row?.amount)
 }));
 data.extraPayments=(Array.isArray(input.extraPayments)?input.extraPayments:[]).slice(0,40).map(row=>({
   date:dateOk(row?.date)?row.date:null,amount:moneyNumber(row?.amount),
   category:typeof row?.category==='string'?row.category.slice(0,50):'other'
 }));
 return data;
}
