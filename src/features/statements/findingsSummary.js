// Rule-based explanation of observed evidence; suggestions are never
// presented as AI-confirmed causes or proven unpaid wages.
export function briefPayFindings({check,confirmedScope=true,auditStatus='not_checked',rows=[]}={}){
 if(!check)return [];
 if(!confirmedScope)return [
   'The statement dates need confirming before any workdays or expected pay can be compared.',
   'The original statement and the dated delivery rows should cover the same period.'
 ];
 const lines=[];
 if(check.flagged?.length){
   const count=check.flagged.length;
   const delta=check.flagged.filter(d=>d.reason==='Different stop counts');
   const missing=check.flagged.filter(d=>d.reason!=='Different stop counts');
   if(delta.length)lines.push(delta.length+' '+(delta.length===1?'day has':'days have')+' a different stop count. A duplicate or adjustment is possible, not confirmed.');
   if(missing.length)lines.push(missing.length+' '+(missing.length===1?'date needs':'dates need')+' checking for missing or duplicate entries.');
   if(!delta.length&&!missing.length)lines.push(count+' workdays need checking.');
 }
 if(check.earningsVariations?.length){
   const count=check.earningsVariations.length;
   const hasExcess=(rows||[]).some(r=>Number(r?.totalParcels)>Number(r?.stops)&&Number(r?.stops)>=0);
   lines.push(count+' '+(count===1?'day has':'days have')+' matching stops but different gross earnings; '+(hasExcess?'excess parcels, extra work or rate adjustments may explain this.':'extra work or rate adjustments may explain this.')+' Not confirmed underpayments.');
 }
 if(auditStatus==='mismatch')lines.push('Some AI-read statement totals do not add up; check the original before relying on the difference.');
 if(check.summaryOnly&&!check.hasDaily)lines.push('Only statement totals were read; no individual workdays were checked.');
 if(check.expectedPence===null)lines.push('Your expected pay is incomplete because some saved earnings or deductions are missing.');
 if(!lines.length&&check.canCompare){
   if(check.difference===0)lines.push('Your statement payout matches your expected payout on the available before-VAT figures.');
   else lines.push('Your statement is '+(check.difference<0?'below':'above')+' your saved estimate. This is a potential difference, not proof of underpayment.');
 }else if(check.canCompare&&check.difference!==0&&!lines.some(t=>t.includes('statement is'))){
   lines.push('The statement is '+(check.difference<0?'below':'above')+' your estimate; review the discrepancies before treating this as a confirmed difference.');
 }
 if(!lines.length)lines.push('Available figures were checked. Review any missing VAT or statement details before confirming.');
 return lines.slice(0,3);
}
