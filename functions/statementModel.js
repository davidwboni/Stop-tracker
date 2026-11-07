// Normalise untrusted AI output. The client gets amounts and generic labels,
// never driver names, bank numbers, emails, free-text notes or source images.
const amount = v => typeof v==='number' && Number.isFinite(v) &&
  Number.isSafeInteger(Math.round(v*100)) ? Math.round(v*100)/100 : null;
const count = v => Number.isSafeInteger(v) && v>=0 ? v : null;
const date = v => typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v ? v : null;
const chargeLabel = v => typeof v==='string' &&
  ['lease','insurance','fuel','mileage','claim','mobile','management','other'].includes(v.toLowerCase()) ? v.toLowerCase() : 'other';
const paymentCategory = value => {
  const v=typeof value==='string'?value.toLowerCase():'';
  if(/cover/.test(v))return 'route_cover';
  if(/collection|collect/.test(v))return 'collection';
  if(/fuel.*supplement|fuel.*top.?up/.test(v))return 'fuel_supplement';
  return ['route_cover','collection','fuel_supplement'].includes(v)?v:'other';
};
function normalizeStatement(data={}) {
  return {
    statementStops:count(data?.statementStops),
    deliverySubtotal:amount(data?.deliverySubtotal),
    extraPaymentsTotal:amount(data?.extraPaymentsTotal),
    extraPayments:Array.isArray(data?.extraPayments)?data.extraPayments.slice(0,60).map(p=>({
      date:date(p?.date),category:paymentCategory(p?.category||p?.reason||p?.label),
      amount:amount(p?.amount)
    })).filter(p=>p.amount!==null):[],
    statementAmount:amount(data?.statementAmount),
    contractorPayout:amount(data?.contractorPayout),
    contractorFee:amount(data?.contractorFee),
    contractorCharges:amount(data?.contractorCharges),
    vatAmount:amount(data?.vatAmount),
    beforeVatPayout:amount(data?.beforeVatPayout),
    taxBasis:['included','excluded','not_applicable'].includes(data?.taxBasis)?data.taxBasis:'unknown',
    charges:Array.isArray(data?.charges)?data.charges.slice(0,60).map(c=>({
      label:chargeLabel(c?.label),amount:amount(c?.amount)
    })):[],
    currency:typeof data?.currency==='string'&&/^[A-Z]{3}$/.test(data.currency)?data.currency:null,
    periodStart:date(data?.periodStart),periodEnd:date(data?.periodEnd),
    daily:Array.isArray(data?.daily)?data.daily.slice(0,366).map(d=>({
      date:date(d?.date),stops:count(d?.stops),amount:amount(d?.amount)
    })).filter(d=>d.date):[],
    needsReview:true
  };
}
module.exports={normalizeStatement};
