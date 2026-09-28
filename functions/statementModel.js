const amount = v => typeof v==='number' && Number.isFinite(v) && Number.isSafeInteger(Math.round(v*100)) ? Math.round(v*100)/100 : null;
const count = v => Number.isSafeInteger(v) && v>=0 ? v : null;
const date = v => typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v ? v : null;
function normalizeStatement(data={}) {
 return {statementStops:count(data?.statementStops),statementAmount:amount(data?.statementAmount),contractorPayout:amount(data?.contractorPayout),contractorFee:amount(data?.contractorFee),contractorCharges:amount(data?.contractorCharges),taxBasis:['included','excluded','not_applicable'].includes(data?.taxBasis)?data.taxBasis:'unknown',charges:Array.isArray(data?.charges)?data.charges.slice(0,60).map(c=>({label:typeof c?.label==='string'&&['lease','insurance','fuel','mileage','claim','mobile','management','other'].includes(c.label.toLowerCase())?c.label.toLowerCase():'other',amount:amount(c?.amount)})):[],currency:typeof data?.currency==='string'&&/^[A-Z]{3}$/.test(data.currency)?data.currency:null,periodStart:date(data?.periodStart),periodEnd:date(data?.periodEnd),daily:Array.isArray(data?.daily)?data.daily.slice(0,366).map(d=>({date:date(d?.date),stops:count(d?.stops),amount:amount(d?.amount)})).filter(d=>d.date):[],needsReview:true};
}
module.exports={normalizeStatement};
