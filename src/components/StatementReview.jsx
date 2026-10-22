import React,{useEffect,useRef,useState} from 'react';
import {reviewIssues,reviewWarnings,captureIssues,calculatedBeforeVat,confirmBeforeVat} from '../features/statements/reviewModel';
import {trackProductEvent as track} from '../services/productAnalytics';
import '../styles/statement-review.css';

export default function StatementReview({draft,onChange,period,periods,onPeriodChange,file,onContinue,onSaveDraft,onBack,ready,captureOnly=false,saving=false,summaryOnly=false}){
 const [source,setSource]=useState(false),[url,setUrl]=useState('');
 const root=useRef(null);
 const fullyReviewed=reviewIssues(draft,period).length===0;
 const captureMode=captureOnly||!['excluded','not_applicable'].includes(draft.taxBasis);
 const issues=captureMode?captureIssues(draft,period):reviewIssues(draft,period);
 const warnings=reviewWarnings(draft);
 const beforeVat=calculatedBeforeVat(draft);
 useEffect(()=>{track('statement_review_opened');root.current?.focus();},[]);
 useEffect(()=>{if(!file)return;const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);
 function change(key,value){
  if(key!=='reviewed'&&draft[key]!==value)track('statement_field_corrected');
  onChange({...draft,[key]:value,...(['start','end','currency','taxBasis','payout'].includes(key)?{reviewed:false}:{})});
 }
 function focusIssue(){
  const target=document.getElementById('review-'+issues[0]?.field);
  const details=target?.closest('details');if(details)details.open=true;
  target?.focus();target?.scrollIntoView?.({block:'center',behavior:'auto'});
  track('statement_review_validation_failed');
 }
 const field=(key,label,type='text')=><label className="home-field" key={key} htmlFor={'review-'+key}>{label}<input id={'review-'+key} type={type} inputMode={type==='text'?'decimal':undefined} value={draft[key]} onChange={e=>change(key,e.target.value)}/></label>;
 const nextLabel=captureMode?'Save statement — compare later':'Compare with my workdays';
 const continueAction=()=>{if(captureMode&&!fullyReviewed){onSaveDraft?.();return;}onContinue();};
 return <section className="statement-review" ref={root} tabIndex={-1} aria-label="Review statement">
 <button type="button" className="home-text-button" onClick={onBack}>← Back to Check Pay</button>
 <header><h1>Review statement</h1><p className="home-muted">Confirm the final payout and dates. You don't need to tick every contractor charge. Save first and compare later if VAT or pay history needs attention.</p></header>
 {summaryOnly&&<p className="home-banner" role="status">AI could read the statement summary but not the individual workdays. Review the totals against your original. No amount is verified or saved automatically.</p>}
 <p className="review-steps">Upload <span>/</span> <strong>Review payout</strong> <span>/</span> {captureOnly?'Save, then compare':'Compare'}</p>
 {issues.length>0&&<button type="button" className="review-attention" onClick={focusIssue}>{issues.length} required {issues.length===1?'check':'checks'} left · {issues[0].message} →</button>}
 {captureMode&&draft.taxBasis==='included'&&<p className="home-banner" role="status">Your statement payout includes VAT. You can save it as received now, or enter the VAT amount below to compare the before-VAT payout. The app won't compare the VAT-inclusive amount with your workdays.</p>}
 <div className="review-layout"><div className="review-form">
 <section className="home-card review-payout"><span className="money-badge">AI estimate · Confirm with original</span>{field('payout',draft.taxBasis==='included'?'VAT-inclusive payout shown on statement (£)':'Final contractor payout shown on statement (£)')}<p className="home-muted text-sm">Copy the amount printed on your contractor statement. If it includes VAT, select that below; we'll help separate VAT before comparing.</p></section>
 <section className="home-card review-required"><h2>Check the statement period</h2>
  <label className="home-field" htmlFor="review-period">Compare with pay period
   <select id="review-period" value={period.id} onChange={e=>{onPeriodChange(periods.find(p=>p.id===e.target.value));change('reviewed',false);}}>{periods.map(p=><option key={p.id} value={p.id}>{p.start} – {p.end}</option>)}</select>
  </label>
  <div className="review-fields">{field('start','Statement period start','date')}{field('end','Statement period end','date')}</div>
  <label className="home-field" htmlFor="review-currency">Currency
   <select id="review-currency" value={draft.currency} onChange={e=>change('currency',e.target.value)}><option value="">Not found</option>{draft.currency&&draft.currency!=='GBP'&&<option value={draft.currency}>{draft.currency} · unsupported</option>}<option value="GBP">GBP (£)</option></select>
  </label>
  <label className="home-field mt-4" htmlFor="review-taxBasis">Final payout VAT treatment
   <select id="review-taxBasis" value={draft.taxBasis} onChange={e=>change('taxBasis',e.target.value)}><option value="unknown">Choose VAT treatment</option><option value="excluded">VAT excluded (before VAT)</option><option value="not_applicable">VAT does not apply</option><option value="included">VAT included · needs adjustment</option></select>
  </label>
  <p className="home-muted text-sm mt-3">The app compares payouts before VAT. VAT-inclusive statements can still be saved safely without comparison.</p>
  {draft.taxBasis==='included'&&<div className="review-vat-adjust" role="group" aria-label="Adjust VAT-inclusive payout">
    <p className="home-muted text-sm">Does your statement show VAT separately? Enter the exact VAT amount. Do not guess a VAT percentage.</p>
    <label className="home-field" htmlFor="review-vatAmount">VAT amount shown on statement (£)<input id="review-vatAmount" inputMode="decimal" value={draft.vatAmount||''} onChange={e=>change('vatAmount',e.target.value)} placeholder="e.g. 736.94"/></label>
    {beforeVat!=null?<><p className="review-net-preview">Before-VAT payout: <strong>£{beforeVat}</strong></p><button className="home-secondary w-full" type="button" onClick={()=>onChange(confirmBeforeVat(draft))}>Use £{beforeVat} before VAT for comparison</button></>:<p className="home-muted text-xs">If you don't know the VAT amount, save this statement as received and finish checking it later.</p>}
  </div>}
  {draft.vatIncludedPayout&&draft.taxBasis==='excluded'&&<p className="home-muted text-sm" role="status">VAT adjusted from the original £{draft.vatIncludedPayout} using the £{draft.vatAmount} amount you entered. Check both figures against the statement before confirming.</p>}
 </section>
 <section className="home-card"><details className="money-details review-optional">
  <summary>Optional breakdown · earnings and charges</summary>
  <p className="home-muted text-sm mt-3">These figures can help explain a difference, but are not required to compare final payout totals. Any unchecked charge is kept unverified.</p>
  <div className="review-fields">{field('gross','Gross work earnings (£)')}{field('fee','Contractor / admin fee (£)')}</div>
  {field('charges','Total contractor charges (£)')}
  {draft.items.map((item,index)=><div className="review-charge" key={item.id}>
   <label className="home-field">Charge description<input value={item.label} maxLength={80} onChange={e=>change('items',draft.items.map((r,i)=>i===index?{...r,label:e.target.value,reviewed:false}:r))}/></label>
   <label className="home-field" htmlFor={'review-item-'+item.id}>Amount (£)<input id={'review-item-'+item.id} inputMode="decimal" value={item.amount} onChange={e=>change('items',draft.items.map((r,i)=>i===index?{...r,amount:e.target.value,reviewed:false}:r))}/></label>
   <label className="check-basis"><input type="checkbox" checked={item.reviewed} onChange={e=>change('items',draft.items.map((r,i)=>i===index?{...r,reviewed:e.target.checked}:r))}/>I checked this optional charge</label>
   <button type="button" className="home-text-button" onClick={()=>change('items',draft.items.filter((_,i)=>i!==index))}>Remove this extracted item</button>
  </div>)}
  <button type="button" className="home-text-button" onClick={()=>change('items',[...draft.items,{id:crypto.randomUUID(),label:'Other charge',amount:'',reviewed:false}])}>+ Add missing charge</button>
  {warnings.length>0&&<div className="review-warning-list" role="status"><strong>Breakdown to review later</strong>{warnings.map((w,i)=><p className="home-muted text-sm" key={i}>{w.message}</p>)}</div>}
 </details></section>
 <section className="home-card review-confirm">
  <label className="check-basis" htmlFor="review-reviewed"><input id="review-reviewed" type="checkbox" checked={draft.reviewed} onChange={e=>change('reviewed',e.target.checked)}/><span>I've checked the final payout, statement dates and VAT basis against the original statement.</span></label>
  {issues.length>0&&<p className="home-muted text-sm" role="status">{issues[0].message}</p>}
  <button type="button" className="home-primary w-full" disabled={issues.length>0||!ready||saving} onClick={continueAction}>{saving?'Saving…':nextLabel}</button>
  {!captureMode&&issues.length>0&&<button type="button" className="home-secondary w-full" disabled={captureIssues(draft,period).length>0||!ready||saving} onClick={onSaveDraft}>Save as received — compare later</button>}
  <p className="home-muted text-sm">{issues.length?'Check the highlighted field above.':!ready?'Records unavailable — reconnect before saving.':captureMode?'Save the statement without claiming it matches your work. You can review VAT or restore historical pay details later without another scan.':'Next: see the difference between your reviewed payout and your logged workdays.'}</p>
 </section>
 </div>
 <aside className="review-source"><button type="button" className="home-secondary w-full" disabled={!url} onClick={()=>setSource(!source)}>{source?'Hide source':'View original statement'}</button>{!url&&<p className="home-muted">The original is no longer available. Check your own copy.</p>}{source&&url&&<div className="review-preview">{file.type==='application/pdf'||file.name?.toLowerCase().endsWith('.pdf')?<><object data={url} type="application/pdf" aria-label="Original statement"><p>PDF preview unavailable on this device.</p></object><a href={url} target="_blank" rel="noreferrer" className="home-text-button">Open original PDF</a></>:<img src={url} alt="Original statement for checking extracted figures"/>}</div>}<p className="home-muted text-sm">The original stays in this open draft. Nothing is saved until you confirm.</p></aside>
 </div>
 </section>;
}