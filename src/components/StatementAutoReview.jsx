import React,{useState} from 'react';
import {money} from '../features/home/homeModel';
import '../styles/statement-auto-review.css';

const cash=p=>p==null?'Not available':money(p/100);
const fmtDate=d=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
export default function StatementAutoReview({check,period,hidden=false,saving=false,error='',onCompare,onSaveDraft,onEdit,onBack,feeMissing=0,onFeeRepair}){
 const [showAll,setShowAll]=useState(false);
 const shown=showAll?check.flagged:check.flagged.slice(0,5);
 const label=p=>hidden?'••••':cash(p);
 const issueCount=check.flagged.length;
 const canArchive=check.periodOk&&check.currencyOk&&check.rawPayout!=null;
 return <main className="home-screen check-pay-page"><section className="statement-auto-review" aria-label="AI statement comparison">
   <button type="button" className="home-text-button" onClick={onBack}>← Back to Pay</button>
   <header className="auto-check-header"><span className="money-badge">AI scan · Not confirmed</span><h1>Your statement compared</h1>
     <p className="home-muted">Here is what AI found against your saved workdays. Check the figures before saving anything.</p></header>
   <section className="home-card auto-check-hero">
     <div className="auto-check-top"><span className={issueCount?'auto-check-dot auto-check-dot-warn':'auto-check-dot'} aria-hidden="true"/>
       <div><h2>{!check.currencyOk||!check.periodOk?'One detail needs checking':check.hasDaily?issueCount?issueCount+' workday'+(issueCount===1?'':'s')+' to review':'No differences in available daily figures':'Pay summary read'}</h2>
         <p className="home-muted text-sm">{check.hasDaily&&check.periodOk&&check.currencyOk?
           check.matched.length+' days match · '+check.unknown.length+' days missing comparable figures':
           check.summaryOnly?'AI read totals only; no daily figures were extracted.':'The AI could not compare individual days from this scan.'}</p></div></div>
     {!check.periodOk&&<p role="alert" className="home-banner">The statement dates differ from {period.start} – {period.end}. Select the correct period under Edit AI figures before comparing.</p>}
     {!check.currencyOk&&<p role="alert" className="home-banner">The statement currency wasn't confirmed as GBP. Verify the currency before comparing.</p>}
     <dl className="auto-check-totals">
       <div><dt>Contractor's payout</dt><dd>{label(check.rawPayout)}</dd></div>
       {check.rawPayout!=null&&check.vatSource!=='before_vat'&&<div><dt>Before VAT for comparison</dt><dd>{label(check.payoutBeforeVat)}</dd></div>}
       <div><dt>Your expected payout</dt><dd>{label(check.expectedPence)}</dd></div>
       {check.canCompare&&<div className="auto-check-difference"><dt>Difference</dt><dd>{hidden?'••••':check.difference===0?'No difference':cash(Math.abs(check.difference))+(check.difference<0?' less than expected':' more than expected')}</dd></div>}
     </dl>
     {check.rawPayout!=null&&check.vatSource==='printed_vat'&&<p className="home-muted text-xs">The statement shows VAT of {label(check.vat)}. AI subtracts exactly that figure from the VAT-inclusive payout for this preview; verify it against the original before confirming.</p>}
     {check.rawPayout!=null&&check.vatSource==='printed_net'&&<p className="home-muted text-xs">The before-VAT payout was read from the statement. Confirm it against the original before saving.</p>}
     {check.rawPayout!=null&&check.vatSource==='unknown'&&<p className="home-banner" role="status">The before-VAT payout isn't clear yet. You can still save the statement or open the details to check VAT.</p>}
     {check.expectedPence==null&&<p className="home-banner" role="status">Your expected total needs historical pay details. Daily stops can still be checked below; saving the statement won't change your logs.</p>}
   </section>
   <section className="home-card auto-check-dates">
     <h2>Day-by-day check</h2>
     {check.hasDaily&&check.periodOk&&check.currencyOk?<>
       <p className="home-muted text-sm">AI compares stops and gross earnings only where both sources have them. Differences are clues to investigate, not proof of underpayment.</p>
       {issueCount===0&&<p className="auto-check-good">No differences found in the supplied comparable daily figures.</p>}
       {shown.map(day=><div className="auto-check-day" key={day.date}>
         <div className="home-row"><strong>{fmtDate(day.date)} · {day.status==='review'?'Check this day':'—'}</strong></div>
         {day.reason&&<p className="home-muted text-xs">{day.reason}</p>}
         <dl className="auto-check-day-grid">
           <div><dt>Stops — yours / statement</dt><dd>{day.loggedStops??'—'} / {day.statementStops??'—'}</dd></div>
           <div><dt>Gross — yours / statement</dt><dd>{label(day.loggedGross)} / {label(day.statementGross)}</dd></div>
         </dl>
       </div>)}
       {issueCount>5&&<button type="button" className="home-secondary w-full" onClick={()=>setShowAll(v=>!v)}>{showAll?'Show fewer days':'See all '+issueCount+' flagged days'}</button>}
       {check.unknown.length>0&&<p className="home-muted text-xs">{check.unknown.length} day(s) had insufficient comparable figures. They are not counted as matching.</p>}
       {check.outsidePeriod>0&&<p className="home-muted text-xs">{check.outsidePeriod} extracted day(s) fall outside this selected period; verify the dates.</p>}
     </>:<p className="home-muted text-sm">No trustworthy daily comparison available yet. You can save the payout and return without rescanning. If needed, use a clearer original PDF to read individual dates.</p>}
   </section>
   <section className="home-card auto-check-finish">
     <h2>Next step</h2>
     <p className="home-muted text-sm">{check.canCompare?'Check the payout and VAT figures above against your original statement. One confirmation will open the comparison; individual charge ticks aren't required.':
       'You can save what AI found now. The app will not claim the figures match until any missing VAT, period or historical pay details are resolved.'}</p>
     {error&&<p className="home-error" role="alert">{error}</p>}
     {check.canCompare?<button type="button" className="home-primary w-full" disabled={saving} onClick={onCompare}>{saving?'Saving…':'I checked these figures — compare pay'}</button>:
       <button type="button" className="home-primary w-full" disabled={!canArchive||saving} onClick={onSaveDraft}>{saving?'Saving…':'Save statement — finish later'}</button>}
     {feeMissing>0&&check.expectedPence==null&&<button className="home-secondary w-full" type="button" onClick={onFeeRepair}>Confirm missing contractor fee</button>}
     <button type="button" className="home-secondary w-full" onClick={onEdit} disabled={saving}>Edit AI figures / VAT</button>
     <p className="home-muted text-xs">No work entries or contractor charges are changed by this preview. AI can make mistakes; the original statement is the source of truth.</p>
   </section>
 </section></main>;
}
