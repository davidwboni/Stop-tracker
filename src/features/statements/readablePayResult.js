// Read-only presentation. Distinguish contractor DEDUCTIONS from the gap
// between two payouts. Never call unverified charges an underpayment.
const pence=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&
  Number.isSafeInteger(Math.round(value*100))?Math.round(value*100):null;

export function readablePayResult({check,statement,summary,audit,chargeEvidence=[]}={}){
  const expected=Number.isSafeInteger(check?.expectedPence)?check.expectedPence:null;
  const paid=Number.isSafeInteger(check?.payoutBeforeVat)?check.payoutBeforeVat:null;
  const beforeVatComparable=!!check?.canCompare&&expected!=null&&paid!=null;
  const rawGap=beforeVatComparable?paid-expected:null;
  const charges=Array.isArray(chargeEvidence)?chargeEvidence:[];
  const known=charges.length>0&&charges.every(c=>Number.isSafeInteger(c?.amountPence)&&c.amountPence>=0);
  const itemizedPence=known?charges.reduce((n,c)=>n+c.amountPence,0):null;
  const printedPence=pence(statement?.contractorCharges);
  const itemizedConsistent=itemizedPence!=null&&printedPence!=null&&itemizedPence===printedPence;
  const inEstimate=pence(summary?.costs?.contractor);
  // The stored work estimate already deducts logged contractor expenses and
  // per-day admin fees. An additional statement charge must never be blindly
  // subtracted twice. Offer a conditional bridge only where the statement's
  // own arithmetic agrees and NO contractor charges were already stored.
  const bridgeAvailable=beforeVatComparable&&audit?.status==='balanced'&&
    itemizedConsistent&&inEstimate===0&&printedPence>0&&expected>=printedPence;
  const adjustedEstimate=bridgeAvailable?expected-printedPence:null;
  const remainingVariance=bridgeAvailable?paid-adjustedEstimate:null;
  const independentConfirmed=charges.filter(c=>['matches_recorded_charge','fuel_discount_consistent'].includes(c.status)).length;
  const unmatched=charges.length-independentConfirmed;
  return {
    expected,paid,rawGap,
    listedCharges:itemizedPence,reportedCharges:printedPence,
    itemizedConsistent,
    chargesCount:charges.length,
    independentConfirmed,unmatched,
    alreadyIncludedCharges:inEstimate,
    bridgeAvailable,
    adjustedEstimate,
    remainingVariance
  };
}
