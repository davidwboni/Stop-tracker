import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Dialog} from '@headlessui/react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {Keyboard, Sparkles, ArrowRight,ChevronDown,FileCheck2, CheckCircle2} from 'lucide-react';
import HeaderControls from './HeaderControls';
import {useData} from '../contexts/DataContext';
import useExpenses from '../hooks/useExpenses';
import {isoDate, listPeriods, getPeriodForDate} from '../features/payperiod/periods';
import {moneySummary, moneyRevision, payoutComparison, validRange} from '../features/money/moneyModel';
import {historicalFeeIssue,applyConfirmedHistoricalFee,validHistoricalFee} from '../features/money/historicalFeeRepair';
import {money, pennies} from '../features/home/homeModel';
import {extractStatement, getPremiumStatus} from '../services/premium';
import {describeStatementExtractionError} from '../features/statements/extractionError';
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
 const {logs=[],payPeriodAnchor,periodRecords={},updatePeriodRecord,updateLogs,paymentConfig,loading,loadError,forceSync}=useData();
 const costs=useExpenses(), location=useLocation(), navigate=useNavigate();
 const [previewSnapshot,setPreviewSnapshot]=useState(null),[resolved,setResolved]=useState(false);
 const [review,setReview]=useState(null),[reviewedStatement,setReviewedStatement]=useState(null);
 const [details,setDetails]=useState(emptyStatementDetails);
 const [selected,setSelected]=useState(null),[mode,setMode]=useState('idle'),[periodPickerOpen,setPeriodPickerOpen]=useState(false),[showAnotherCheck,setShowAnotherCheck]=useState(false);
 const [amount,setAmount]=useState(''),[basis,setBasis]=useState(false),[error,setError]=useState('');
 const [feeRepairOpen,setFeeRepairOpen]=useState(false),[feeRateInput,setFeeRateInput]=useState(''),[feeConfirmed,setFeeConfirmed]=useState(false),[feeRepairBusy,setFeeRepairBusy]=useState(false),[feeRepairError,setFeeRepairError]=useState('');
 const [file,setFile]=useState(null),[aiDraft,setAiDraft]=useState(null),[stage,setStage]=useState(''),[saving,setSaving]=useState(false);
 const [entitlement,setEntitlement]=useState(null),[entitlementError,setEntitlementError]=useState(false),[entitlementCode,setEntitlementCode]=useState(''),[statusRequest,setStatusRequest]=useState(0);
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
 const issues=historicalFeeIssue(logs,period);
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
 const label={none:'Not checked yet',incomplete:'Statement saved · Not compared',unavailable:'Not compared',stale:'Check again after changes',matched:'Checked · Matches',difference:'Payout differs',reconciled:'Difference resolved'}[comparison.state];
 const cash=p=>hidden?'••••':money(p/100);
 const dirty=mode!=='idle'&&mode!=='saved'&&mode!=='savedPending'&&(!!amount||!!file||!!aiDraft||JSON.stringify(details)!==JSON.stringify(emptyStatementDetails()));
 draftRef.current=dirty;
 useEffect(()=>{mounted.current=true;track('check_pay_opened');return()=>{mounted.current=false;if(draftRef.current)track('statement_draft_abandoned');};},[]);
 useEffect(()=>{const changed=()=>setOffline(!navigator.onLine);window.addEventListener('online',changed);window.addEventListener('offline',changed);return()=>{window.removeEventListener('online',changed);window.removeEventListener('offline',changed);};},[]);
 useEffect(()=>{if(!dirty)return;const guard=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 useEffect(()=>{
  let active=true;
  setEntitlement(null);setEntitlementError(false);setEntitlementCode('');
  if(offline)return;
  getPremiumStatus().then(status=>{
    if(!active)return;
    if(typeof status?.isPro!=='boolean'||!Number.isSafeInteger(status.statementAiUses)||status.statementAiUses<0){
      const error=new Error('Unexpected AI entitlement response');error.code='invalid-response';throw error;
    }
    setEntitlementCode('');setEntitlement(status);
  }).catch(err=>{
    if(!active)return;
    const code=String(err?.code||'');
    setEntitlementError(code.includes('unauthenticated')?'auth':code.includes('permission-denied')?'permission':'connection');
    const safeCode=/^(?:functions\/[a-z-]{1,35}|invalid-response)$/.test(code)?code:'unknown';
    setEntitlementCode(safeCode);
    // No client-side fallback can reliably determine Free uses or Pro access.
    track('statement_ai_access_check_failed',{reason:code.includes('unauthenticated')?'auth':code.includes('permission-denied')?'permission':'other'});
  });
  return()=>{active=false;};
 },[statusRequest,offline]);
 useEffect(()=>{let active=true;setRevision(null);moneyRevision(logs,costs.expenses,period).then(r=>{if(active)setRevision(r);}).catch(()=>{});return()=>{active=false;};},[logs,costs.expenses,period.start,period.end]);
 function openFeeRepair(){setFeeRateInput(validHistoricalFee(paymentConfig?.contractorFeePercent)?String(paymentConfig.contractorFeePercent):'');setFeeConfirmed(false);setFeeRepairError('');setFeeRepairOpen(true);}
 async function saveHistoricalFee(){if(feeRepairBusy||!feeConfirmed||unavailable||offline||!fullPeriod)return;setFeeRepairBusy(true);setFeeRepairError('');try{const revised=applyConfirmedHistoricalFee(logs,period,feeRateInput);await updateLogs(revised);setFeeRepairOpen(false);setFeeConfirmed(false);track('historical_fee_confirmed',{days:issues.missingFee.length});}catch(err){setFeeRepairError(err?.message?.startsWith('Enter a contractor fee')?err.message:'Could not save the historical fee. Your records were not changed. Please try again.');}finally{setFeeRepairBusy(false);}}
 function reset(){if(dirty&&!window.confirm('Discard this unsaved statement draft?'))return;setMode('idle');setResolved(false);setReview(null);setReviewedStatement(null);setDetails(emptyStatementDetails());setAmount('');setBasis(false);setFile(null);setAiDraft(null);setError('');setShowAnotherCheck(false);}
 function manual(saved=false){setResolved(false);const previous=periodRecords[period.id];if(saved&&previous?.reviewedStatement){const r=previous.reviewedStatement;const daily=previous.statementWorkDetails?.daily||{};setDetails(previous.statementWorkDetails||emptyStatementDetails());setReview({...createStatementReview({periodStart:r.start,periodEnd:r.end,currency:r.currency,taxBasis:r.taxBasis,contractorPayout:r.payoutPence/100,statementAmount:r.grossPence==null?null:r.grossPence/100,contractorFee:r.feePence==null?null:r.feePence/100,contractorCharges:r.chargesPence==null?null:r.chargesPence/100,charges:r.charges.map(i=>({label:i.label,amount:i.amountPence/100}))}),items:r.charges.map((i,index)=>({id:String(index),label:i.label,amount:String(i.amountPence/100),reviewed:true}))});setReviewedStatement(null);setAiDraft({currency:r.currency,daily:Object.entries(daily).map(([date,d])=>({date,stops:d.stops===''?null:Number(d.stops),amount:d.amount===''?null:Number(d.amount)}))});setFile(null);setBasis(false);setError('');setMode('review');return;}setReview(null);setReviewedStatement(null);setAiDraft(null);setDetails(saved?(periodRecords[period.id]?.statementWorkDetails||{...emptyStatementDetails(),stops:periodRecords[period.id]?.statementStops==null?'':String(periodRecords[period.id].statementStops),gross:periodRecords[period.id]?.statementAmount==null?'':String(periodRecords[period.id].statementAmount),extras:periodRecords[period.id]?.extraPayments==null?'':String(periodRecords[period.id].extraPayments),charges:periodRecords[period.id]?.charges==null?'':String(periodRecords[period.id].charges),vat:periodRecords[period.id]?.vat==null?'':String(periodRecords[period.id].vat)}):emptyStatementDetails());setAmount(saved&&comparison.statement!=null?String(comparison.statement/100):previous?.statementAmount!=null?String(previous.statementAmount):'');setBasis(false);setError('');setMode('manual');track('statement_manual_started');}
 function viewSaved(){const record=periodRecords[period.id];if(!record?.payoutComparison||!['matched','difference','reconciled'].includes(comparison.state)){manual(true);return;}setReview(null);setReviewedStatement(record.reviewedStatement||null);setDetails(record.statementWorkDetails||emptyStatementDetails());setAmount(String(record.payoutComparison.statementPence/100));setBasis(true);setPreviewSnapshot({key:recordsKey,payout:record.payoutComparison.expectedPence});setResolved(comparison.state==='reconciled');setError('');setMode('saved');}
 function compareSavedStatement(){
  const saved=periodRecords[period.id];
  const accepted=saved?.reviewedStatement;
  if(!ready||!accepted?.reviewed||!Number.isSafeInteger(accepted.payoutPence)||
    accepted.start!==period.start||accepted.end!==period.end||
    accepted.currency!=='GBP'||!['excluded','not_applicable'].includes(accepted.taxBasis))return;
  setReviewedStatement(saved.reviewedStatement);
  setDetails(saved.statementWorkDetails||emptyStatementDetails());
  setAmount(String(saved.reviewedStatement.payoutPence/100));
  setBasis(true);
  setPreviewSnapshot({key:recordsKey,payout:summary.payout});
  setError('');
  setMode('preview');
  track('statement_comparison_resumed');
 }
 function chooseFile(f){if(!f)return;setError('');if(f.size>12*1024*1024){setError('Choose a file under 12 MB.');return;}if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(f.type)&&!f.name.toLowerCase().endsWith('.pdf')){setError('Choose a PDF, JPEG, PNG or WebP file. Export a spreadsheet as PDF first.');return;}setFile(f);setMode('upload');}
 async function readFile(){if(lock.current||offline)return;lock.current=true;setStage('Preparing file…');setError('');track('statement_ai_started');try{const data=await extractStatement(file,()=>{if(mounted.current)setStage('Reading statement…');});if(!mounted.current)return;setAiDraft(data);setReview(createStatementReview(data));setReviewedStatement(null);setDetails({...emptyStatementDetails(),stops:data.statementStops==null?'':String(data.statementStops),gross:data.currency!=='GBP'||data.statementAmount==null?'':String(data.statementAmount),daily:Object.fromEntries((data.daily||[]).filter(d=>d.date>=period.start&&d.date<=period.end).map(d=>[d.date,{stops:d.stops==null?'':String(d.stops),amount:data.currency!=='GBP'||d.amount==null?'':String(d.amount)}]))});setAmount(data.currency==='GBP'&&typeof data.contractorPayout==='number'?String(data.contractorPayout):'');setBasis(false);setMode('review');setStatusRequest(n=>n+1);track('statement_ai_completed');}catch(e){if(mounted.current){setError(describeStatementExtractionError(e));track('statement_ai_failed');}}finally{lock.current=false;if(mounted.current)setStage('');}}
 function preview(){if(!ready||!basis||!amountValid(amount)||!validStatementDetails(details)){setError('Check the payout and optional figures, then confirm the comparison basis.');return;}setError('');setPreviewSnapshot({key:recordsKey,payout:summary.payout});setMode('preview');track('statement_reviewed');}
 async function save(advanceToInvoice=false){if(previewStale){setError('Records changed. Review the comparison again before saving.');return;}if(lock.current||!ready||!basis||!amountValid(amount)||!validStatementDetails(details))return;lock.current=true;setSaving(true);setError('');try{const currentRevision=await moneyRevision(logs,costs.expenses,period);const statementPence=pennies(Number(amount));await updatePeriodRecord(period.id,{reviewedStatement:reviewedStatement||null,statementWorkDetails:details,status:'checked',needsReview:false,resolvedAt:null,resolutionReason:null,checkedAt:new Date().toISOString(),payoutComparison:{source:aiDraft?'ai':'manual',scope:'contractor_payout',currency:'GBP',taxBasis:'same_as_records',basisConfirmed:true,start:period.start,end:period.end,statementPence,expectedPence:previewExpected,revision:currentRevision}},true);setResolved(false);setMode('saved');setFile(null);track('statement_compared');if(statementPence!==summary.payout)track('discrepancy_found');else if(advanceToInvoice)navigate(invoicePath.pathname,{state:invoicePath.state});}catch(_){setError('Could not save this check. Your figures are still here; please retry.');}finally{lock.current=false;setSaving(false);}}
 async function saveUncompared(approved=null){
  if(lock.current||unavailable||!fullPeriod||(!approved&&(!basis||!validStatementDetails(details)))||!amountValid(approved?String(approved.payoutPence/100):amount))return;
  lock.current=true;setSaving(true);setError('');
  try{
   const previous=periodRecords[period.id]||{};
   await updatePeriodRecord(period.id,{status:'statement_received',needsReview:!!previous.payoutComparison,statementAmount:approved?approved.payoutPence/100:Number(amount),reviewedStatement:approved||null,statementWorkDetails:details,statementReceivedAt:new Date().toISOString()},true);
   setFile(null);setMode('savedPending');track('statement_reviewed');
  }catch(_){setError('Could not save the statement. Your figures are still here; please retry.');}
  finally{lock.current=false;setSaving(false);}
 }
 async function continueReview(){if(unavailable||!fullPeriod||reviewIssues(review,period).length)return;const approved=confirmedReview(review);if(!ready){await saveUncompared(approved);return;}setReviewedStatement(approved);setAmount(review.payout);setDetails(d=>({...d,gross:review.gross,charges:review.charges,daily:Object.fromEntries((aiDraft?.daily||[]).filter(r=>r.date>=period.start&&r.date<=period.end).map(r=>[r.date,{stops:r.stops==null?'':String(r.stops),amount:aiDraft.currency!=='GBP'||r.amount==null?'':String(r.amount)}]))}));setBasis(true);setError('');setPreviewSnapshot({key:recordsKey,payout:summary.payout});setMode('preview');track('statement_reviewed');}
 async function resolveComparison(reason){if(lock.current||previewStale||!ready)return;const record=periodRecords[period.id];if(!record?.payoutComparison){setError('Reload this saved check before resolving it.');return;}lock.current=true;setSaving(true);setError('');try{const latest=await moneyRevision(logs,costs.expenses,period);if(latest!==record.payoutComparison.revision)throw new Error('stale');await updatePeriodRecord(period.id,{...record,status:'reconciled',resolvedAt:new Date().toISOString(),resolutionReason:reason,needsReview:false},true);setResolved(true);track('reconciliation_completed');}catch(_){setError('Could not resolve this check. Verify your records and retry.');}finally{lock.current=false;setSaving(false);}}
 const hasSaved=!!periodRecords[period.id];
 const blocked=!ready;
 if(mode==='review'&&review)return <main className="home-screen check-pay-page"><StatementDraftGuard dirty={dirty}/>{offline&&<p className="home-banner">Offline · Edits stay in this open draft. Connect before saving to your account.</p>}<StatementReview draft={review} onChange={setReview} period={period} periods={choices} onPeriodChange={setSelected} file={file} onContinue={continueReview} onBack={reset} ready={fullPeriod&&!unavailable} captureOnly={!ready} saving={saving} summaryOnly={aiDraft?.extractionMode==='summary_only'}/></main>;
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
     <span className="money-badge check-status">{needsPayRepair?'Estimate unavailable':label}</span>
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
       <strong className={unavailable||summary.payout==null?'check-value-incomplete':''}>{unavailable?'Unavailable':summary.payout==null?'Not available yet':cash(summary.payout)}</strong>
       <p className="home-muted text-xs">After contractor fees and charges · Before personal expenses and tax</p>
       {summary.rows.length>0&&<p className="home-muted text-xs check-period-days">{summary.rows.length} {summary.rows.length===1?'day':'days'} recorded</p>}
     </div>
   }
   {needsPayRepair&&<p className="home-muted text-xs check-period-note">Your workdays are saved. {issues.missingFee.length>0?'Confirm the missing contractor deduction to calculate your estimate.':'Some workdays are missing a saved gross amount.'}</p>}
 </section>
 {['idle','choose'].includes(mode)&&needsPayRepair&&issues.missingFee.length>0&&<section className="home-card check-fee-repair" aria-label="Finish your pay estimate">
     <h2>One thing left to check</h2>
     <p className="home-muted text-sm">{issues.missingFee.length} of your {summary.rows.length} saved {summary.rows.length===1?'workday needs':'workdays need'} the contractor deduction confirmed. Your original stops, parcels and gross earnings will not change.</p>
     <button type="button" className="home-primary w-full" onClick={openFeeRepair} disabled={unavailable||offline}>Confirm historical fee <ArrowRight size={17}/></button>
   </section>}
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
  <section className="check-simple-actions" aria-label="Your pay actions">
   {ready&&periodRecords[period.id]?.reviewedStatement?.reviewed&&!periodRecords[period.id]?.payoutComparison?
       <button type="button" className="home-primary w-full" onClick={compareSavedStatement}>Compare saved statement <ArrowRight size={18}/></button>:
       canInvoice?<Link className="home-primary w-full" to="/app/invoice" state={invoicePath.state}>Prepare invoice <ArrowRight size={18}/></Link>:
       <Link className="home-primary w-full" to="/app/invoice" state={{periodId:period.id,startInvoice:true}}>Create invoice <ArrowRight size={18}/></Link>}
   {comparison.state==='difference'?<button className="home-secondary w-full" type="button" onClick={viewSaved}>Review payout difference <ArrowRight size={18}/></button>:<button className="home-secondary w-full" type="button" disabled={unavailable||!fullPeriod} onClick={()=>{setMode('choose');setStatusRequest(n=>n+1);}}>Check statement <ArrowRight size={18}/></button>}
   <p className="home-muted text-xs">Only create an invoice if your contractor needs one. This doesn't confirm payment.</p>
  </section>
  {comparison.state==='stale'&&<p className="home-banner" role="status">Your work or charges changed after your last check. Check the statement again before relying on the previous comparison.</p>}
  
    {needsPayRepair&&<details className="check-help-details"><summary>Why is the estimate unavailable? <ChevronDown size={17}/></summary>
    <p className="home-muted text-sm">{summary.rows.length} workdays are saved. {issues.missingFee.length} {issues.missingFee.length===1?'day lacks':'days lack'} a confirmed contractor deduction; {issues.missingGross.length} {issues.missingGross.length===1?'day lacks':'days lack'} a saved gross amount. Days you didn't work don't need an entry.</p>
    <p className="home-muted text-sm">You can still check a statement or invoice your contractor without fixing these first.</p>
    <Link className="home-text-button" to="/app/records?payReview=1" state={{periodId:period.id}}>Review those days <ArrowRight size={16}/></Link>
  </details>}
  {hasSaved&&!checkedAlready&&<button className="home-text-button check-again-toggle" onClick={viewSaved}>Review previous statement <ArrowRight size={16}/></button>}
  {checkedAlready&&<button className="home-text-button check-again-toggle" onClick={viewSaved}>View saved statement <ArrowRight size={16}/></button>}
  <Link className="home-text-button check-history-link" to="/app/periods">Previous pay periods <ArrowRight size={16}/></Link>
 </>}
 <Dialog open={feeRepairOpen} onClose={()=>{if(!feeRepairBusy)setFeeRepairOpen(false);}} className="relative z-[100]"><div className="fixed inset-0 bg-black/70" aria-hidden="true"/><div className="check-fee-dialog-position"><Dialog.Panel className="home-card check-fee-dialog home-screen"><Dialog.Title as="h2">Confirm contractor fee</Dialog.Title><p className="home-muted text-sm">For {fmt(period.start)} – {fmt(period.end)}, {issues.missingFee.length} saved workdays are missing a contractor-fee percentage. We will not change their gross earnings, stops, parcels, extras or dates.</p><label className="home-field">Contractor deduction for those days (%)<input inputMode="decimal" autoComplete="off" value={feeRateInput} onChange={e=>{setFeeRateInput(e.target.value);setFeeRepairError('');}} placeholder="e.g. 6" aria-label="Historical contractor fee percentage"/></label>{issues.missingGross.length>0&&<p className="home-muted text-sm">{issues.missingGross.length} workdays also have missing gross earnings. Those will still need reviewing separately.</p>}<label className="check-basis"><input type="checkbox" checked={feeConfirmed} onChange={e=>setFeeConfirmed(e.target.checked)}/><span>I confirm this percentage applied to these historical workdays. This restores only the missing fee, not the original pay rate.</span></label>{feeRepairError&&<p role="alert" className="home-error">{feeRepairError}</p>}<button type="button" className="home-primary w-full" disabled={feeRepairBusy||!feeConfirmed||!validHistoricalFee(feeRateInput)||offline} onClick={saveHistoricalFee}>{feeRepairBusy?'Saving…':`Apply to ${issues.missingFee.length} saved ${issues.missingFee.length===1?'day':'days'}`}</button><button type="button" className="home-secondary w-full" disabled={feeRepairBusy} onClick={()=>setFeeRepairOpen(false)}>Cancel — keep records unchanged</button></Dialog.Panel></div></Dialog>
  {mode==='choose'&&<section className="check-start" aria-label="Check your statement">
   <button className="home-text-button" onClick={reset}>← Back to Pay</button>
   <h2>Check your statement</h2><p className="home-muted text-sm">Choose how to read the contractor's statement.</p>
   <div className="check-actions">
     <section className="home-card check-action"><div className="check-action-top"><Keyboard size={23}/><span className="money-badge">Free</span></div>
       <h3>Enter manually</h3><p className="home-muted">Type the statement payout.</p>
       <button className="home-primary" data-tour="check-manual" onClick={()=>manual()}>Enter manually <ArrowRight size={16}/></button>
     </section>
     <section className="home-card check-action"><div className="check-action-top"><Sparkles size={23}/><span className="money-badge">{entitlement?.isPro?'Pro':entitlement?.betaAccess?'Beta':entitlement?'AI':entitlementError?'Unavailable':'Checking'}</span></div>
       <h3>Upload with AI</h3><p className="home-muted" role="status">{offline?'Connect to use AI':entitlement?entitlement.isPro?'Included with Pro':entitlement.betaAccess?'Free during testing · up to 8 a day':entitlement.statementAiUses<3?`${3-entitlement.statementAiUses} free AI checks left`:'Free checks used · Pro required':entitlementError==='auth'?'Sign in again to check AI access':entitlementError==='permission'?'AI access was rejected':entitlementError?'AI service check failed':'Checking AI access…'}</p>
       {entitlementError&&<p className="home-muted text-xs" role="alert">The AI service did not confirm access. Retry, or enter the totals manually. No statement was uploaded. {entitlementCode&&<span className="block text-xs">Support code: {entitlementCode}</span>}</p>}
       {entitlementError?<button className="home-secondary" onClick={()=>setStatusRequest(n=>n+1)}>Retry AI availability</button>:entitlement&&!entitlement.isPro&&!entitlement.betaAccess&&entitlement.statementAiUses>=3?<button className="home-secondary" onClick={()=>navigate('/app/upgrade')}>View Pro</button>:<label className={'home-secondary check-file '+(offline||!entitlement?'check-disabled':'')}>Choose a file<input aria-label="Choose statement file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf" disabled={offline||!entitlement} onChange={e=>{chooseFile(e.target.files?.[0]);e.target.value='';}}/></label>}
     </section>
   </div>
   {!ready&&<p className="home-muted text-xs">You can save your statement now. Confirm the missing contractor deduction above to compare it with your saved workdays.</p>}
   <p className="home-muted check-privacy">PDF or photo, up to 12 MB. Check AI figures before saving.</p>
 </section>}
 {mode==='savedPending'&&<section className="home-card check-next-step" role="status"><h2>Statement saved</h2>
   <p className="home-muted text-sm">Your contractor's payout is saved. Your workday records have not changed. This is not yet a completed pay check.</p>
   {ready&&periodRecords[period.id]?.reviewedStatement?
     <button className="home-primary w-full" onClick={compareSavedStatement}>Compare saved statement with my workdays <ArrowRight size={18}/></button>:
     issues.missingFee.length>0?
       <><p className="home-muted text-sm">Confirm the missing contractor deduction on {issues.missingFee.length} saved workdays, then compare. No second AI scan is needed.</p>
       <button className="home-primary w-full" onClick={openFeeRepair} disabled={offline||unavailable}>Confirm historical fee <ArrowRight size={18}/></button></>:
       <><p className="home-muted text-sm">Your saved workdays need reviewing before the payout can be compared. You will not need to scan the statement again.</p>
       <Link className="home-secondary w-full" to="/app/records?payReview=1" state={{periodId:period.id}}>Review missing workday earnings</Link></>}
   <button className="home-secondary w-full" onClick={reset}>Back to Pay</button>
 </section>}
 {mode==='upload'&&<section className="home-card check-draft"><h2>Ready to read your statement?</h2><p className="check-filename">{file?.name}</p><p className="home-muted">DeepSeek processes this file to extract figures. You will review them before comparing. {entitlement?.betaAccess?'AI scanning is included during the temporary beta, subject to daily usage limits. For screenshots, empty dark borders are trimmed when possible; your original is kept for review.':'A successful extraction uses one free check unless you have Pro.'}</p><button className="home-primary" disabled={!!stage||offline} onClick={readFile}>{stage||'Read statement with AI'}</button>{stage&&<p role="status">{stage} Please keep this screen open.</p>}<button className="home-secondary" disabled={!!stage} onClick={()=>{setFile(null);manual();}}>Enter manually instead</button><button className="home-text-button" disabled={!!stage} onClick={reset}>Discard file</button></section>}
 {mode==='manual'&&<section className="home-card check-draft"><h2>{aiDraft?'Review extracted payout':'Statement totals'}</h2><p className="home-muted">Enter the contractor payout after contractor fees and charges, before your own business expenses.</p>{aiDraft&&<p className="home-banner">AI figures are unverified. {aiDraft.contractorPayout==null?'No clear final payout was found. Enter it from your statement.':'Check the amount against your statement.'} {aiDraft.currency!=='GBP'?'GBP could not be verified; do not compare a foreign-currency amount.':''} {(aiDraft.periodStart!==period.start||aiDraft.periodEnd!==period.end)?'The extracted period does not match or is missing. Verify both dates before continuing.':''} Nothing has been saved.</p>}<label className="home-field">Statement contractor payout (£)<input inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setError('');}} placeholder="0.00"/></label><details className="check-help-details"><summary>Optional statement breakdown <ChevronDown size={17}/></summary><StatementWorkDetails value={details} onChange={setDetails} rows={summary.rows}/></details><label className="check-basis"><input type="checkbox" checked={basis} onChange={e=>setBasis(e.target.checked)}/><span>I checked that this is the same pay period, in GBP, after contractor charges and before my own expenses, with the same VAT/tax treatment as my records.</span></label><button className="home-primary" disabled={unavailable||!fullPeriod||saving||!basis||!amountValid(amount)} onClick={ready?preview:()=>saveUncompared()}>{saving?'Saving…':ready?'Compare with my records':'Save statement for later comparison'}</button><button className="home-text-button" onClick={reset}>Cancel</button></section>}
 {mode==='saved'&&(canInvoice||resolved)&&!previewStale&&ready&&<section className="home-card check-next-step">
   <h2><CheckCircle2 size={20} aria-hidden="true"/> Ready to invoice</h2>
   <p className="home-muted text-sm">Your check is saved. Review the recipient, checked amount and VAT before sending.</p>
   <Link to={invoicePath.pathname} state={invoicePath.state} className="home-primary w-full mt-3">Looks good — prepare invoice <ArrowRight size={18}/></Link>
  </section>}
 {['preview','saved'].includes(mode)&&<StatementComparison period={period} expected={previewExpected} statement={pennies(Number(amount))} summary={summary} review={reviewedStatement} workDetails={details} saved={mode==='saved'} resolved={resolved} stale={previewStale} unavailable={!ready} hidden={hidden} saving={saving} error={error} onSave={()=>save(false)} onSaveAndInvoice={()=>save(true)} onEdit={()=>{if(mode==='saved'){manual(true);return;}setBasis(false);setMode(review?'review':'manual');}} onBack={reset} onResolve={resolveComparison}/>}

 {error&&!['preview','saved'].includes(mode)&&<p role="alert" className="home-banner home-error">{error}</p>}
 </main>;
}
