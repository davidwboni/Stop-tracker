import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Dialog} from '@headlessui/react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {Keyboard, Sparkles, ArrowRight,ChevronDown,FileCheck2, CheckCircle2} from 'lucide-react';
import HeaderControls from './HeaderControls';
import {useData} from '../contexts/DataContext';
import useExpenses from '../hooks/useExpenses';
import {isoDate, listPeriods, getPeriodForDate} from '../features/payperiod/periods';
import {moneySummary, moneyRevision, payoutComparison, validRange} from '../features/money/moneyModel';
import {money, pennies} from '../features/home/homeModel';
import {extractStatement, getPremiumStatus} from '../services/premium';
import {trackProductEvent as track} from '../services/productAnalytics';
import StatementComparison from './StatementComparison';
import StatementReview from './StatementReview';
import {createStatementReview,reviewIssues,confirmedReview} from '../features/statements/reviewModel';
import StatementDraftGuard from './StatementDraftGuard';
import StatementWorkDetails,{emptyStatementDetails,validStatementDetails} from './StatementWorkDetails';
import '../styles/home.css';
import '../styles/money.css';
import '../styles/check-pay.css';
const fmt = d => new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const amountValid = s => /^-?\d+(\.\d{1,2})?$/.test(s) && Number.isSafeInteger(pennies(Number(s)));
export default function CheckPayV4() {
 const {logs=[],payPeriodAnchor,periodRecords={},updatePeriodRecord,loading,loadError,forceSync}=useData();
 const costs=useExpenses(), location=useLocation(), navigate=useNavigate();
 const [previewSnapshot,setPreviewSnapshot]=useState(null),[resolved,setResolved]=useState(false);
 const [review,setReview]=useState(null),[reviewedStatement,setReviewedStatement]=useState(null);
 const [details,setDetails]=useState(emptyStatementDetails);
 const [selected,setSelected]=useState(null),[mode,setMode]=useState('idle'),[periodPickerOpen,setPeriodPickerOpen]=useState(false),[showAnotherCheck,setShowAnotherCheck]=useState(false);
 const [amount,setAmount]=useState(''),[basis,setBasis]=useState(false),[error,setError]=useState('');
 const [file,setFile]=useState(null),[aiDraft,setAiDraft]=useState(null),[stage,setStage]=useState(''),[saving,setSaving]=useState(false);
 const [entitlement,setEntitlement]=useState(null),[entitlementError,setEntitlementError]=useState(false),[statusRequest,setStatusRequest]=useState(0);
 const [revision,setRevision]=useState(null),[offline,setOffline]=useState(!navigator.onLine);
 const [hidden,setHidden]=useState(()=>{try{return localStorage.getItem('home-hide-money')==='1';}catch(_){return false;}});
 const lock=useRef(false), mounted=useRef(true), draftRef=useRef(false);
 const today=isoDate(new Date());
 const periods=useMemo(()=>listPeriods(logs,payPeriodAnchor||today,13),[logs,payPeriodAnchor,today]);
 const requested=validRange(location.state)?{...location.state,id:location.state.start+'_'+location.state.end}:periods.find(p=>p.id===location.state?.periodId);
 const period=selected||requested||periods[0];
 const choices=periods.some(p=>p.id===period.id)?periods:[period,...periods];
 const summary=useMemo(()=>moneySummary(logs,costs.expenses,period),[logs,costs.expenses,period.start,period.end]);
 const busy=loading||costs.loading, unavailable=busy||!!loadError||!!costs.error;
 const fullPeriod=!!payPeriodAnchor&&getPeriodForDate(payPeriodAnchor,period.start).id===period.id;
 const ready=fullPeriod&&!unavailable&&summary.rows.length>0&&summary.payout!=null;
 const missingPayDays=summary.days.filter(d=>!d||d.unavailable||d.fee==null).length;
 const needsPayRepair=fullPeriod&&!unavailable&&summary.rows.length>0&&summary.payout==null;
 const recordsKey=JSON.stringify([logs,costs.expenses.filter(e=>e.source==='contractor_charge'),period.start,period.end]);
 const previewStale=!!previewSnapshot&&previewSnapshot.key!==recordsKey;
 const previewExpected=previewSnapshot?.payout??summary.payout;
 const comparison=payoutComparison(periodRecords[period.id],period,summary,revision,unavailable);
 const canInvoice=comparison.state==='matched'||comparison.state==='reconciled';
 const checkedAlready=['matched','difference','reconciled'].includes(comparison.state);
 const previousComplete=periods[1]?.end<today?periods[1]:null;
 const offerPrevious=mode==='idle'&&period.id===periods[0]?.id&&previousComplete&&(previousComplete.daysLogged>0||!!periodRecords[previousComplete.id]);
 const invoicePath={pathname:'/app/invoice',state:{fromPay:true,periodId:period.id}};
 const label={none:period.end<today?'Awaiting statement':'Tracking',incomplete:'Review statement',unavailable:'Comparison unavailable',stale:'Needs recheck',matched:'Checked · figures match',difference:'Difference found',reconciled:'Period reconciled'}[comparison.state];
 const cash=p=>hidden?'••••':money(p/100);
 const dirty=mode!=='idle'&&mode!=='saved'&&(!!amount||!!file||!!aiDraft||JSON.stringify(details)!==JSON.stringify(emptyStatementDetails()));
 draftRef.current=dirty;
 useEffect(()=>{mounted.current=true;track('check_pay_opened');return()=>{mounted.current=false;if(draftRef.current)track('statement_draft_abandoned');};},[]);
 useEffect(()=>{const changed=()=>setOffline(!navigator.onLine);window.addEventListener('online',changed);window.addEventListener('offline',changed);return()=>{window.removeEventListener('online',changed);window.removeEventListener('offline',changed);};},[]);
 useEffect(()=>{if(!dirty)return;const guard=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 useEffect(()=>{
  let active=true;
  setEntitlement(null);setEntitlementError(false);
  if(offline)return;
  getPremiumStatus().then(status=>{
    if(!active)return;
    if(typeof status?.isPro!=='boolean'||!Number.isSafeInteger(status.statementAiUses)||status.statementAiUses<0){
      const error=new Error('Unexpected AI entitlement response');error.code='invalid-response';throw error;
    }
    setEntitlement(status);
  }).catch(err=>{
    if(!active)return;
    const code=String(err?.code||'');
    setEntitlementError(code.includes('unauthenticated')?'auth':code.includes('permission-denied')?'permission':'connection');
    // No client-side fallback can reliably determine Free uses or Pro access.
    track('statement_ai_access_check_failed',{reason:code.includes('unauthenticated')?'auth':code.includes('permission-denied')?'permission':'other'});
  });
  return()=>{active=false;};
 },[statusRequest,offline]);
 useEffect(()=>{let active=true;setRevision(null);moneyRevision(logs,costs.expenses,period).then(r=>{if(active)setRevision(r);}).catch(()=>{});return()=>{active=false;};},[logs,costs.expenses,period.start,period.end]);
 function reset(){if(dirty&&!window.confirm('Discard this unsaved statement draft?'))return;setMode('idle');setResolved(false);setReview(null);setReviewedStatement(null);setDetails(emptyStatementDetails());setAmount('');setBasis(false);setFile(null);setAiDraft(null);setError('');setShowAnotherCheck(false);}
 function manual(saved=false){setResolved(false);const previous=periodRecords[period.id];if(saved&&previous?.reviewedStatement){const r=previous.reviewedStatement;const daily=previous.statementWorkDetails?.daily||{};setDetails(previous.statementWorkDetails||emptyStatementDetails());setReview({...createStatementReview({periodStart:r.start,periodEnd:r.end,currency:r.currency,taxBasis:r.taxBasis,contractorPayout:r.payoutPence/100,statementAmount:r.grossPence==null?null:r.grossPence/100,contractorFee:r.feePence==null?null:r.feePence/100,contractorCharges:r.chargesPence==null?null:r.chargesPence/100,charges:r.charges.map(i=>({label:i.label,amount:i.amountPence/100}))}),items:r.charges.map((i,index)=>({id:String(index),label:i.label,amount:String(i.amountPence/100),reviewed:true}))});setReviewedStatement(null);setAiDraft({currency:r.currency,daily:Object.entries(daily).map(([date,d])=>({date,stops:d.stops===''?null:Number(d.stops),amount:d.amount===''?null:Number(d.amount)}))});setFile(null);setBasis(false);setError('');setMode('review');return;}setReview(null);setReviewedStatement(null);setAiDraft(null);setDetails(saved?(periodRecords[period.id]?.statementWorkDetails||{...emptyStatementDetails(),stops:periodRecords[period.id]?.statementStops==null?'':String(periodRecords[period.id].statementStops),gross:periodRecords[period.id]?.statementAmount==null?'':String(periodRecords[period.id].statementAmount),extras:periodRecords[period.id]?.extraPayments==null?'':String(periodRecords[period.id].extraPayments),charges:periodRecords[period.id]?.charges==null?'':String(periodRecords[period.id].charges),vat:periodRecords[period.id]?.vat==null?'':String(periodRecords[period.id].vat)}):emptyStatementDetails());setAmount(saved&&comparison.statement!=null?String(comparison.statement/100):'');setBasis(false);setError('');setMode('manual');track('statement_manual_started');}
 function viewSaved(){const record=periodRecords[period.id];if(!record?.payoutComparison||!['matched','difference','reconciled'].includes(comparison.state)){manual(true);return;}setReview(null);setReviewedStatement(record.reviewedStatement||null);setDetails(record.statementWorkDetails||emptyStatementDetails());setAmount(String(record.payoutComparison.statementPence/100));setBasis(true);setPreviewSnapshot({key:recordsKey,payout:record.payoutComparison.expectedPence});setResolved(comparison.state==='reconciled');setError('');setMode('saved');}
 function chooseFile(f){if(!f)return;setError('');if(f.size>12*1024*1024){setError('Choose a file under 12 MB.');return;}if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(f.type)&&!f.name.toLowerCase().endsWith('.pdf')){setError('Choose a PDF, JPEG, PNG or WebP file. Export a spreadsheet as PDF first.');return;}setFile(f);setMode('upload');}
 async function readFile(){if(lock.current||offline)return;lock.current=true;setStage('Preparing file…');setError('');track('statement_ai_started');try{const data=await extractStatement(file,()=>{if(mounted.current)setStage('Reading statement…');});if(!mounted.current)return;setAiDraft(data);setReview(createStatementReview(data));setReviewedStatement(null);setDetails({...emptyStatementDetails(),stops:data.statementStops==null?'':String(data.statementStops),gross:data.currency!=='GBP'||data.statementAmount==null?'':String(data.statementAmount),daily:Object.fromEntries((data.daily||[]).filter(d=>d.date>=period.start&&d.date<=period.end).map(d=>[d.date,{stops:d.stops==null?'':String(d.stops),amount:data.currency!=='GBP'||d.amount==null?'':String(d.amount)}]))});setAmount(data.currency==='GBP'&&typeof data.contractorPayout==='number'?String(data.contractorPayout):'');setBasis(false);setMode('review');setStatusRequest(n=>n+1);track('statement_ai_completed');}catch(e){if(mounted.current){setError(e?.code?'Could not read this statement. Retry or enter the totals manually. Your file is still selected.':(e?.message||'Could not prepare this file. Your file is still selected.'));track('statement_ai_failed');}}finally{lock.current=false;if(mounted.current)setStage('');}}
 function preview(){if(!ready||!basis||!amountValid(amount)||!validStatementDetails(details)){setError('Check the payout and optional figures, then confirm the comparison basis.');return;}setError('');setPreviewSnapshot({key:recordsKey,payout:summary.payout});setMode('preview');track('statement_reviewed');}
 async function save(advanceToInvoice=false){if(previewStale){setError('Records changed. Review the comparison again before saving.');return;}if(lock.current||!ready||!basis||!amountValid(amount)||!validStatementDetails(details))return;lock.current=true;setSaving(true);setError('');try{const currentRevision=await moneyRevision(logs,costs.expenses,period);const statementPence=pennies(Number(amount));await updatePeriodRecord(period.id,{reviewedStatement:reviewedStatement||null,statementWorkDetails:details,status:'checked',needsReview:false,resolvedAt:null,resolutionReason:null,checkedAt:new Date().toISOString(),payoutComparison:{source:aiDraft?'ai':'manual',scope:'contractor_payout',currency:'GBP',taxBasis:'same_as_records',basisConfirmed:true,start:period.start,end:period.end,statementPence,expectedPence:previewExpected,revision:currentRevision}},true);setResolved(false);setMode('saved');setFile(null);track('statement_compared');if(statementPence!==summary.payout)track('discrepancy_found');else if(advanceToInvoice)navigate(invoicePath.pathname,{state:invoicePath.state});}catch(_){setError('Could not save this check. Your figures are still here; please retry.');}finally{lock.current=false;setSaving(false);}}
 function continueReview(){if(!ready||reviewIssues(review,period).length)return;const approved=confirmedReview(review);setReviewedStatement(approved);setAmount(review.payout);setDetails(d=>({...d,gross:review.gross,charges:review.charges,daily:Object.fromEntries((aiDraft?.daily||[]).filter(r=>r.date>=period.start&&r.date<=period.end).map(r=>[r.date,{stops:r.stops==null?'':String(r.stops),amount:aiDraft.currency!=='GBP'||r.amount==null?'':String(r.amount)}]))}));setBasis(true);setError('');setPreviewSnapshot({key:recordsKey,payout:summary.payout});setMode('preview');track('statement_reviewed');}
 async function resolveComparison(reason){if(lock.current||previewStale||!ready)return;const record=periodRecords[period.id];if(!record?.payoutComparison){setError('Reload this saved check before resolving it.');return;}lock.current=true;setSaving(true);setError('');try{const latest=await moneyRevision(logs,costs.expenses,period);if(latest!==record.payoutComparison.revision)throw new Error('stale');await updatePeriodRecord(period.id,{...record,status:'reconciled',resolvedAt:new Date().toISOString(),resolutionReason:reason,needsReview:false},true);setResolved(true);track('reconciliation_completed');}catch(_){setError('Could not resolve this check. Verify your records and retry.');}finally{lock.current=false;setSaving(false);}}
 const hasSaved=!!periodRecords[period.id];
 const blocked=!ready;
 if(mode==='review'&&review)return <main className="home-screen check-pay-page"><StatementDraftGuard dirty={dirty}/>{offline&&<p className="home-banner">Offline · Edits stay in this open draft. Connect before saving to your account.</p>}<StatementReview draft={review} onChange={setReview} period={period} periods={choices} onPeriodChange={setSelected} file={file} onContinue={continueReview} onBack={reset} ready={ready}/></main>;
 return <main className="home-screen check-pay-page"><StatementDraftGuard dirty={dirty}/>
 <header className="home-row check-page-header">
  <div><h1>Your pay</h1><p className="home-muted">Know what you're owed. Check what you're paid.</p></div>
  <HeaderControls hidden={hidden} onToggleMoney={()=>{setHidden(!hidden);try{localStorage.setItem('home-hide-money',hidden?'0':'1');}catch(_){}}}/>
 </header>
 <section className="home-card check-period" aria-label="Current pay period">
   <div className="check-period-top">
     <label className="check-period-picker">
       <span>Pay period</span>
       <span className="check-period-control">
          <button className="check-period-mobile" type="button" disabled={mode!=='idle'} onClick={()=>setPeriodPickerOpen(true)} aria-label="Choose four-week pay period">{fmt(period.start)} – {fmt(period.end)} <ChevronDown size={17} aria-hidden="true"/></button>
          <select aria-label="Check Pay period" value={period.id} disabled={mode!=='idle'} onChange={e=>{setSelected(choices.find(p=>p.id===e.target.value));setShowAnotherCheck(false);setError('');track('check_pay_period_changed');}}>{choices.map(p=><option key={p.id} value={p.id}>{fmt(p.start)} – {fmt(p.end)}</option>)}</select>
          <ChevronDown size={17} aria-hidden="true" className="check-period-desktop-chevron"/>
         </span>
     </label>
     <span className="money-badge check-status">{needsPayRepair?'Needs pay details':label}</span>
   </div>
   {!fullPeriod&&<p className="home-banner">Choose a full pay period. <Link to="/app/periods" className="home-text-button">Set pay-period dates</Link></p>}
   {busy?<div className="home-skeleton check-skeleton" role="status" aria-label="Loading expected payout"/>:!summary.rows.length&&!unavailable?
     <div className="check-empty">
       <p className="home-muted">Expected contractor payout</p><strong className="check-empty-value">No work logged yet</strong>
       <p className="home-muted text-sm">Log a day's work to start checking your pay.</p>
       <Link className="home-text-button" to="/app/dashboard">Log your day <ArrowRight size={16}/></Link>
     </div>:
     <div className="check-expected">
       <p className="home-muted">Expected contractor payout</p>
       <strong className={unavailable||summary.payout==null?'check-value-incomplete':''}>{unavailable?'Unavailable':summary.payout==null?'Pay details needed':cash(summary.payout)}</strong>
       <p className="home-muted text-xs">After contractor fees and charges · Before personal expenses and tax</p>
       {summary.rows.length>0&&<p className="home-muted text-xs check-period-days">{summary.rows.length} {summary.rows.length===1?'day':'days'} recorded</p>}
     </div>
   }
   {needsPayRepair&&<p className="home-banner">Your expected payout is unavailable because {missingPayDays} work {missingPayDays===1?'entry needs':'entries need'} historical pay details. Your saved stops are still here.</p>}
 </section>
 {offerPrevious&&<button type="button" className="home-card check-completed-period" onClick={()=>{setSelected(previousComplete);setShowAnotherCheck(false);setError('');track('check_pay_period_changed');}}>
   <span><strong>Last completed period</strong><small>{fmt(previousComplete.start)} – {fmt(previousComplete.end)} · {previousComplete.daysLogged} days logged</small></span>
   <span className="check-completed-action">Open <ArrowRight size={17} aria-hidden="true"/></span>
 </button>}
 <Dialog open={periodPickerOpen} onClose={()=>setPeriodPickerOpen(false)} className="relative z-[90]">
   <div className="fixed inset-0 bg-black/65" aria-hidden="true"/>
   <div className="check-period-sheet-position">
    <Dialog.Panel className="check-period-sheet home-screen">
      <Dialog.Title className="text-lg font-bold">Choose a pay period</Dialog.Title>
      <p className="home-muted text-xs">Each period covers four weeks.</p>
      <div className="check-period-sheet-options">
        {choices.map((p,i)=><button type="button" key={p.id} className="check-period-sheet-row" aria-current={p.id===period.id?'true':undefined} onClick={()=>{setSelected(p);setPeriodPickerOpen(false);setShowAnotherCheck(false);setError('');track('check_pay_period_changed');}}>
          <span>{fmt(p.start)} – {fmt(p.end)}{i===0?' · Current':''}</span>
          {p.id===period.id&&<CheckCircle2 size={18} aria-hidden="true"/>}
        </button>)}
      </div>
      <button type="button" className="home-secondary w-full" onClick={()=>setPeriodPickerOpen(false)}>Close</button>
    </Dialog.Panel>
   </div>
 </Dialog>
 {(offline||costs.cached)&&<p className="home-banner" role="status">Showing cached records. {offline?'AI requires a connection. Unsaved drafts stay here while this screen is open.':'Refresh before relying on the comparison.'}</p>}
 {(loadError||costs.error)&&<div className="home-banner" role="alert">Records could not be loaded. <button className="home-text-button" onClick={()=>{costs.retry?.();forceSync?.();}}>Retry records</button></div>}
  {mode==='idle'&&<>
   {needsPayRepair&&<section className="home-card check-repair-path" aria-label="Continue with incomplete pay records">
     <h2>Finish your pay period</h2>
     <p className="home-muted text-sm">You can fix recorded pay details or prepare an invoice directly from your contractor's statement. An unchecked invoice is not a verified comparison.</p>
     <Link className="home-primary w-full" to="/app/records?payReview=1" state={{periodId:period.id}}>Review {missingPayDays} {missingPayDays===1?'workday':'workdays'} <ArrowRight size={18} aria-hidden="true"/></Link>
     <Link className="home-secondary w-full" to="/app/invoice" state={{periodId:period.id,startInvoice:true}}>Create invoice from statement <ArrowRight size={18} aria-hidden="true"/></Link>
     <p className="home-muted text-xs">Enter and confirm the invoice amount yourself. Stop Tracker will not mark this period as checked or paid.</p>
   </section>}
   {canInvoice&&<section className="home-card check-next-step" aria-label="Next step after checking">
     <div className="home-row"><h2><CheckCircle2 size={20} aria-hidden="true"/> Statement checked</h2><span className="money-badge">Ready</span></div>
     <p className="home-muted text-sm">Your checked statement is saved. Review the invoice amount and recipient before sending.</p>
     <Link to={invoicePath.pathname} state={invoicePath.state} className="home-primary w-full">Looks good — prepare invoice <ArrowRight size={18}/></Link>
   </section>}
   {comparison.state==='difference'&&<section className="home-card check-next-step" aria-label="Next step after checking">
     <h2>Review the payout difference</h2>
     <strong className="check-difference-amount">{cash(Math.abs(comparison.difference))} {comparison.difference<0?'less':'more'} than expected</strong>
     <p className="home-muted text-sm">You already checked this statement. Review the difference and accept the agreed figures before preparing an invoice.</p>
     <button type="button" className="home-primary w-full" onClick={viewSaved}>Review saved comparison <ArrowRight size={18}/></button>
   </section>}
   {checkedAlready&&<button type="button" className="home-text-button check-again-toggle" aria-expanded={showAnotherCheck} onClick={()=>setShowAnotherCheck(v=>!v)}>{showAnotherCheck?'Hide new comparison options':'Check a different statement'} <ChevronDown size={16} aria-hidden="true"/></button>}
   {(!checkedAlready||showAnotherCheck)&&(ready||!summary.rows.length)&&<section className="check-start" aria-label="Check your statement">
     <h2 className="check-question">{canInvoice?"Check again":"Check your statement"}</h2>
     <p className="home-muted text-sm">Choose how you'd like to compare your contractor's statement with your work.</p>
     <div className="check-actions">
       <section className="home-card check-action check-action-manual">
         <div className="check-action-top"><Keyboard aria-hidden="true" size={23}/><span className="money-badge">Free</span></div>
         <h3>Enter manually</h3>
         <p className="home-muted">Type in the payout shown on your statement.</p>
         <button data-tour="check-manual" className="home-primary" disabled={blocked} onClick={()=>manual()}>Enter manually <ArrowRight size={18}/></button>
       </section>
       <section className="home-card check-action check-action-ai">
         <div className="check-action-top"><Sparkles aria-hidden="true" size={23}/><span className="money-badge">{entitlement?.isPro?'Pro':entitlement?'AI':'Verification'}</span></div>
         <h3>Upload with AI</h3>
         <p className="home-muted" role="status">{offline?'Connect to check AI access':entitlement?entitlement.isPro?'Included with Pro':entitlement.statementAiUses<3?`${3-entitlement.statementAiUses} free AI checks left`:'Free checks used · Pro required':entitlementError?'AI access could not be verified':'Checking AI access…'}</p>
         {entitlementError&&<p className="check-ai-error home-muted text-xs" role="alert">{entitlementError==='auth'?'Your session needs refreshing. Please sign in again if retrying does not work.':entitlementError==='permission'?'This account could not access the AI status service. You can still enter figures manually.':'We could not reach the secure AI status service. You can still enter figures manually.'}</p>}
         {entitlementError?<button className="home-secondary" onClick={()=>setStatusRequest(n=>n+1)}>Retry AI availability</button>:
          entitlement&&!entitlement.isPro&&entitlement.statementAiUses>=3?<button className="home-secondary" onClick={()=>navigate('/app/upgrade')}>View Pro</button>:
          <label className={'home-secondary check-file '+(blocked||offline||!entitlement?'check-disabled':'')}>Choose a file<input aria-label="Choose statement file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf" disabled={blocked||offline||!entitlement} onChange={e=>{chooseFile(e.target.files?.[0]);e.target.value='';}}/></label>}
       </section>
     </div>
     <p className="home-muted check-privacy">AI supports PDF or photos, up to 12 MB. Review the figures before comparing. Files aren't saved to your account.</p>
   </section>}
   {hasSaved&&!checkedAlready&&<section className="check-previous" aria-label="Previous comparison">
     <button className="check-previous-button" aria-label="Review saved check" onClick={viewSaved} disabled={blocked}>
       <span className="check-previous-icon"><FileCheck2 size={20}/></span>
       <span><strong>{comparison.state==='stale'?'Previous check needs reviewing':'Previous comparison'}</strong><small>{comparison.state==='stale'?'Your records changed since the last check.':comparison.state==='difference'?'Difference recorded · Tap to review':comparison.state==='matched'?'Figures matched · Tap to review':'Review your saved comparison'}</small></span>
       <ArrowRight size={19} aria-hidden="true"/>
     </button>
   </section>}
   <Link className="home-text-button check-history-link" to="/app/periods">See previous pay periods <ArrowRight size={16}/></Link>
 </>}
 {mode==='upload'&&<section className="home-card check-draft"><h2>Ready to read your statement?</h2><p className="check-filename">{file?.name}</p><p className="home-muted">DeepSeek processes this file to extract figures. You will review them before comparing. A successful extraction uses one free check unless you have Pro.</p><button className="home-primary" disabled={!!stage||offline} onClick={readFile}>{stage||'Read statement with AI'}</button>{stage&&<p role="status">{stage} Please keep this screen open.</p>}<button className="home-secondary" disabled={!!stage} onClick={()=>{setFile(null);manual();}}>Enter manually instead</button><button className="home-text-button" disabled={!!stage} onClick={reset}>Discard file</button></section>}
 {mode==='manual'&&<section className="home-card check-draft"><h2>{aiDraft?'Review extracted payout':'Statement totals'}</h2><p className="home-muted">Enter the contractor payout after contractor fees and charges, before your own business expenses.</p>{aiDraft&&<p className="home-banner">AI figures are unverified. {aiDraft.contractorPayout==null?'No clear final payout was found. Enter it from your statement.':'Check the amount against your statement.'} {aiDraft.currency!=='GBP'?'GBP could not be verified; do not compare a foreign-currency amount.':''} {(aiDraft.periodStart!==period.start||aiDraft.periodEnd!==period.end)?'The extracted period does not match or is missing. Verify both dates before continuing.':''} Nothing has been saved.</p>}<label className="home-field">Statement contractor payout (£)<input inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setError('');}} placeholder="0.00"/></label><StatementWorkDetails value={details} onChange={setDetails} rows={summary.rows}/><label className="check-basis"><input type="checkbox" checked={basis} onChange={e=>setBasis(e.target.checked)}/><span>I checked that this is the same pay period, in GBP, after contractor charges and before my own expenses, with the same VAT/tax treatment as my records.</span></label><button className="home-primary" disabled={!ready||!basis||!amountValid(amount)} onClick={preview}>Compare with my records</button><button className="home-text-button" onClick={reset}>Cancel</button></section>}
 {mode==='saved'&&(canInvoice||resolved)&&!previewStale&&ready&&<section className="home-card check-next-step">
   <h2><CheckCircle2 size={20} aria-hidden="true"/> Ready to invoice</h2>
   <p className="home-muted text-sm">Your check is saved. Review the recipient, checked amount and VAT before sending.</p>
   <Link to={invoicePath.pathname} state={invoicePath.state} className="home-primary w-full mt-3">Looks good — prepare invoice <ArrowRight size={18}/></Link>
  </section>}
 {['preview','saved'].includes(mode)&&<StatementComparison period={period} expected={previewExpected} statement={pennies(Number(amount))} summary={summary} review={reviewedStatement} workDetails={details} saved={mode==='saved'} resolved={resolved} stale={previewStale} unavailable={!ready} hidden={hidden} saving={saving} error={error} onSave={()=>save(false)} onSaveAndInvoice={()=>save(true)} onEdit={()=>{if(mode==='saved'){manual(true);return;}setBasis(false);setMode(review?'review':'manual');}} onBack={reset} onResolve={resolveComparison}/>}

 {error&&!['preview','saved'].includes(mode)&&<p role="alert" className="home-banner home-error">{error}</p>}
 </main>;
}
