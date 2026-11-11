import React from 'react';
import {money} from '../features/home/homeModel';
import {ArrowRight} from 'lucide-react';

const currency=p=>p==null?'Not available':money(p/100);
const showDate=s=>new Date(s+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});

export default function PayResultSummary({
  ai,view,step,period,rowSummary,showComparableWork,scopeNeedsConfirmation,
  audit,canCompare,readable,hidden,onShowStops,onShowEarnings,onShowCharges
}){
 const cash=p=>hidden?'••••':currency(p);
 const differences=view?.flagged?.length||0;
 const sameStops=view?.earningsVariations?.length||0;
 const charges=readable?.chargesCount||0;
 const raw=readable?.rawGap;
 const netVsAdjusted=readable?.remainingVariance;
 const headline=!ai?'No statement read':
  scopeNeedsConfirmation?'Confirm statement dates':
  !view?.currencyOk?'Confirm statement currency':
  audit?.status==='mismatch'?'Statement totals need checking':
  differences?differences+(differences===1?' workday needs a look':' workdays need a look'):
  view?.hasDaily?'Workdays checked':'Statement totals read';
 return <section className="home-card v5-result v5-simple-result" aria-label="Pay check summary">
   <div className="v5-topline">
     <span className="st-badge">{step==='saved'?'Check saved':'AI results · Not confirmed'}</span>
     <span className="home-muted text-xs">{showComparableWork?rowSummary.rows.length+' workdays':'Confirm dates first'}</span>
   </div>
   <h2>{headline}</h2>
   <p className="home-muted text-sm v5-period-label">{showDate(period.start)} – {showDate(period.end)}</p>

   <div className="v5-outcome" aria-label="Amount shown by contractor">
     <span>Contractor payout · before VAT</span>
     <strong>{view?.payoutBeforeVat!=null?cash(view.payoutBeforeVat):'VAT needs checking'}</strong>
     {view?.rawPayout!=null&&view.rawPayout!==view.payoutBeforeVat&&
       <small>{cash(view.rawPayout)} {view.vatSource==='unknown'?'as printed · VAT not confirmed':
         'including VAT '+(view.vat!=null?'· VAT '+cash(view.vat):'')}</small>}
   </div>
   <div className="v5-money-pair">
     <div><span>Your recorded estimate</span><strong>{showComparableWork?cash(readable.expected):'Dates need checking'}</strong></div>
     <div><span>Contractor's listed charges</span><strong>{cash(readable.itemizedConsistent?readable.listedCharges:readable.reportedCharges)}</strong></div>
   </div>

   {readable.bridgeAvailable&&<div className="v5-bridge" aria-label="Estimated result after listed contractor charges">
     <div><span>Estimate after those charges</span><strong>{cash(readable.adjustedEstimate)}</strong></div>
     <div className="v5-bridge-delta"><span>Statement vs adjusted estimate</span>
       <strong>{hidden?'••••':netVsAdjusted===0?'Same total':currency(Math.abs(netVsAdjusted))+(netVsAdjusted>0?' higher':' lower')}</strong>
     </div>
     <p>Illustration only: assumes these charges weren't already included. Rate differences and extras may still affect the result.</p>
   </div>}
   <div className="v5-findings" aria-label="Pay check findings">
     <button type="button" disabled={!showComparableWork||differences===0||!onShowStops} onClick={onShowStops}
       aria-label={`View ${differences} stop/date ${differences===1?'issue':'issues'} by date`}>
       <strong>{showComparableWork?differences:'—'}</strong><span>Stop/date issues <ArrowRight size={14} aria-hidden="true"/></span>
     </button>
     <button type="button" disabled={!showComparableWork||sameStops===0||!onShowEarnings} onClick={onShowEarnings}
       aria-label={`View ${sameStops} daily pay ${sameStops===1?'variation':'variations'} by date`}>
       <strong>{showComparableWork?sameStops:'—'}</strong><span>Pay variations <ArrowRight size={14} aria-hidden="true"/></span>
     </button>
     <button type="button" disabled={charges===0||!onShowCharges} onClick={onShowCharges}
       aria-label={`View ${charges} contractor charge ${charges===1?'item':'items'}`}>
       <strong>{charges}</strong><span>Charge items <ArrowRight size={14} aria-hidden="true"/></span>
     </button>
   </div>
   {canCompare?<p className="v5-result-hint" role="status">
     {readable.bridgeAvailable?
       'The large raw gap mostly reflects listed contractor deductions. The adjusted result is still an estimate, not confirmed missing pay.':
       'Your estimate and the statement may include different deductions. Check the charges before treating the gap as unpaid wages.'}
   </p>:<p className="v5-result-hint" role="status">
     {scopeNeedsConfirmation?'Confirm the statement dates above before comparing.':
       audit?.status==='mismatch'?'AI-read totals do not add up. Check the original statement.':
       view?.vatSource==='unknown'?'Check the VAT amount before comparing.':
       rowSummary.payout==null?'Some saved pay settings are missing. The stop-count check is still useful.':
       'Save the statement to finish reviewing later.'}
   </p>}
   <details className="v5-result-math">
     <summary>Understand the calculation</summary>
     <dl className="v5-totals">
       <div><dt>Contractor payout as printed</dt><dd>{cash(view?.rawPayout)}</dd></div>
       {view?.rawPayout!==view?.payoutBeforeVat&&<div><dt>Before-VAT payout used for comparison</dt><dd>{cash(view?.payoutBeforeVat)}</dd></div>}
       <div><dt>Your recorded estimate</dt><dd>{showComparableWork?cash(readable.expected):'Not compared'}</dd></div>
       <div><dt>Listed charge subtotal</dt><dd>{cash(readable.listedCharges)}</dd></div>
       <div><dt>Raw gap before accounting for new charges</dt><dd>{canCompare?cash(Math.abs(raw)):'Not comparable'}</dd></div>
     </dl>
     <p className="home-muted text-xs">The charge subtotal and the raw gap are different figures. Neither is proof of underpayment.</p>
     {readable.itemizedConsistent?
       <p className="home-muted text-xs">The charge items sum to the printed total. This confirms arithmetic, not that the deductions are correct.</p>:
       charges>0&&<p className="home-muted text-xs">The itemised charges don't fully match the reported total. Their difference has not been silently adjusted.</p>}
     {readable.alreadyIncludedCharges>0&&<p className="home-muted text-xs">Some charges are already deducted in your saved estimate. The app has not subtracted them twice.</p>}
   </details>
 </section>;
}
