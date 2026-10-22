import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useLocation,useNavigate,Link} from 'react-router-dom';
import {FileUp,ArrowRight,Loader2,Sparkles} from 'lucide-react';
import {useData} from '../contexts/DataContext';
import useExpenses from '../hooks/useExpenses';
import HeaderControls from './HeaderControls';
import {isoDate,listPeriods,summarizePeriod} from '../features/payperiod/periods';
import {moneyRevision,moneySummary,payoutComparison,validRange} from '../features/money/moneyModel';
import {buildStatementAutoCheck} from '../features/statements/autoCheck';
import {statementChargeEvidence} from '../features/statements/chargeEvidence';
import {unresolvedStatementFindings,statementInvoiceReady,mergeFindingDecisions,requiresLimitedCoverageAcceptance} from '../features/statements/findingGate';
import {createStatementReview,confirmedReview,captureIssues} from '../features/statements/reviewModel';
import {historicalFeeIssue,applyConfirmedHistoricalFee,validHistoricalFee} from '../features/money/historicalFeeRepair';
import {extractStatement,getPremiumStatus} from '../services/premium';
import {describeStatementExtractionError} from '../features/statements/extractionError';
import {money} from '../features/home/homeModel';
import {trackProductEvent as track} from '../services/productAnalytics';
import '../styles/check-pay-v5.css';

const showDate=s=>new Date(s+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const currency=p=>p==null?'Not available':money(p/100);
const amount=n=>typeof n==='number'&&Number.isFinite(n)?String(n):'';
const dateKey=range=>range.start+'_'+range.end;
const isSensibleRange=range=>{
 if(!validRange(range))return false;
 const start=Date.parse(range.start+'T00:00:00Z'),end=Date.parse(range.end+'T00:00:00Z');
 return Number.isFinite(start)&&Number.isFinite(end)&&(end-start)/86400000<=366;
};
export function periodFromStatement(statement){
 const range={start:statement?.periodStart,end:statement?.periodEnd};
 return isSensibleRange(range)?{...range,id:dateKey(range)}:null;
}
function savedStatementDraft(record){
 const r=record?.reviewedStatement;
 if(!r)return null;
 return {
   currency:r.currency,periodStart:r.start,periodEnd:r.end,
   taxBasis:r.vatIncludedPayoutPence!=null?'included':r.taxBasis,
   contractorPayout:(r.vatIncludedPayoutPence??r.payoutPence)/100,
   beforeVatPayout:r.taxBasis==='excluded'&&r.vatIncludedPayoutPence!=null?r.payoutPence/100:null,
   vatAmount:r.vatAmountPence==null?null:r.vatAmountPence/100,
   statementAmount:r.grossPence==null?null:r.grossPence/100,
   contractorFee:r.feePence==null?null:r.feePence/100,
   contractorCharges:r.chargesPence==null?null:r.chargesPence/100,
   charges:(r.charges||[]).map(c=>({label:c.label,amount:c.amountPence/100})),
   daily:Object.entries(record.statementWorkDetails?.daily||{}).map(([date,x])=>({date,stops:x.stops===''?null:Number(x.stops),amount:x.amount===''?null:Number(x.amount)})),
   extractionMode:record.statementExtractionMode||null
 };
}
export default function CheckPayV5(){
 const {logs=[],payPeriodAnchor,periodRecords={},paymentConfig,updatePeriodRecord,updateLogs,loading,loadError,forceSync}=useData();
 const costs=useExpenses(),nav=useNavigate(),location=useLocation(),fileInput=useRef(null),savingLock=useRef(false);
 const today=isoDate(new Date());
 const periods=useMemo(()=>listPeriods(logs,payPeriodAnchor||today,13),[logs,payPeriodAnchor,today]);
 const archived=useMemo(()=>Object.keys(periodRecords).filter(id=>/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(id))
   .map(id=>{const [start,end]=id.split('_');return isSensibleRange({start,end})?summarizePeriod(logs,{id,start,end}):null;})
   .filter(Boolean),[periodRecords,logs]);
 const available=useMemo(()=>{
   const map=new Map([...periods,...archived].map(p=>[p.id,p]));
   return [...map.values()].sort((a,b)=>b.start.localeCompare(a.start));
 },[periods,archived]);
 const requested=available.find(p=>p.id===location.state?.periodId);
 const [chosen,setChosen]=useState(null),[step,setStep]=useState('home');
 const [ai,setAi]=useState(null),[scanSource,setScanSource]=useState('ai'),[scanFile,setScanFile]=useState(null);
 const [manualPayout,setManualPayout]=useState(''),[vatChoice,setVatChoice]=useState(''),[vatEntry,setVatEntry]=useState('');
 const [error,setError]=useState(''),[stage,setStage]=useState(''),[busy,setBusy]=useState(false);
 const [permission,setPermission]=useState(null),[permissionError,setPermissionError]=useState(false);
 const [confirmedDays,setConfirmedDays]=useState({});
 const [openDays,setOpenDays]=useState(false),[showMore,setShowMore]=useState(false);
 const [limitedAccepted,setLimitedAccepted]=useState(false);
 const [feeInput,setFeeInput]=useState(()=>validHistoricalFee(paymentConfig?.contractorFeePercent)?String(paymentConfig.contractorFeePercent):''),[feeAck,setFeeAck]=useState(false),[feeSaving,setFeeSaving]=useState(false);
 const [hidden,setHidden]=useState(()=>{try{return localStorage.getItem('home-hide-money')==='1';}catch{return false;}});
 const initially=available.find(p=>p.daysLogged>0)||available[0]||{start:today,end:today,id:today+'_'+today};
 const period=chosen||requested||initially;
 const rowSummary=useMemo(()=>moneySummary(logs,costs.expenses||[],period),[logs,costs.expenses,period.start,period.end]);
 const statusRecord=periodRecords[period.id]||null;
 const [revision,setRevision]=useState(null);
 useEffect(()=>{let current=true;setRevision(null);moneyRevision(logs,costs.expenses||[],period).then(v=>{if(current)setRevision(v);}).catch(()=>{});return()=>{current=false;};},[logs,costs.expenses,period.start,period.end]);
 const previous=payoutComparison(statusRecord,period,rowSummary,revision,!!loadError||!!costs.error||loading||costs.loading);
 const view=useMemo(()=>{
   if(!ai)return null;
   const enriched={...ai,taxBasis:vatChoice||ai.taxBasis,vatAmount:vatEntry.trim()&&/^\d+(\.\d{1,2})?$/.test(vatEntry)?Number(vatEntry):ai.vatAmount};
   return buildStatementAutoCheck(enriched,period,rowSummary.rows,rowSummary.days,rowSummary.payout);
 },[ai,period.start,period.end,rowSummary,vatChoice,vatEntry]);
 const issues=historicalFeeIssue(logs,period);
 const chargeEvidence=useMemo(()=>ai?statementChargeEvidence(ai,costs.expenses||[],period):[],[ai,costs.expenses,period.start,period.end]);
 const sourceNet=ai?{...ai,taxBasis:vatChoice||ai.taxBasis,vatAmount:vatEntry.trim()&&/^\d+(\.\d{1,2})?$/.test(vatEntry)?Number(vatEntry):ai.vatAmount}:null;
 const canCompare=!!view?.canCompare&&!loading&&!costs.loading&&!loadError&&!costs.error;
 const scanEnabled=!!permission&&(permission.isPro||permission.betaAccess||permission.statementAiUses<3);
 const savedCheck=['matched','difference','reconciled'].includes(previous.state);
 const unresolvedSaved=unresolvedStatementFindings(statusRecord);
 const invoiceReady=statementInvoiceReady(statusRecord);
 const unresolvedCurrent=(view?.flagged||[]).filter(row=>!['figures_verified','possible_duplicate_accepted'].includes(confirmedDays[row.date]));
 const limitedCoverage=!!view&&requiresLimitedCoverageAcceptance({summaryOnly:view.summaryOnly,hasDaily:view.hasDaily,incompleteDays:view.unknown.length,outsidePeriod:view.outsidePeriod});
 const savedCoveragePending=requiresLimitedCoverageAcceptance(statusRecord?.statementFindings)&&statusRecord?.statementFindings?.limitedCoverageAccepted!==true;
 const requiredPeriod=period.start+' – '+period.end;
 useEffect(()=>{let active=true;getPremiumStatus().then(s=>{if(active)setPermission(s);}).catch(()=>{if(active)setPermissionError(true);});return()=>{active=false;};},[]);
 useEffect(()=>{track('check_pay_opened');},[]);
 const cash=value=>hidden?'••••':currency(value);
 const reset=()=>{if(busy)return;setStep('home');setAi(null);setScanFile(null);setError('');setConfirmedDays({});setVatChoice('');setVatEntry('');setLimitedAccepted(false);};
 // Re-tapping the persistent Pay tab returns to the beginning of the flow.
 // It does not delete the server-side statement, comparisons or work history.
 useEffect(()=>{if(location.state?.payHome&&!busy){setStep('home');setAi(null);setScanFile(null);setError('');setLimitedAccepted(false);setConfirmedDays({});}},[location.key]);
 async function readFile(file){
   if(!file||busy)return;
   if(!navigator.onLine){setError('Reconnect to upload a statement. Your saved workdays are safe.');return;}
   if(file.size>12*1024*1024||(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)&&!file.name.toLowerCase().endsWith('.pdf'))){setError('Choose a PDF or image smaller than 12 MB.');return;}
   setScanFile(file);setError('');setBusy(true);setStage('Reading your contractor statement…');
   track('statement_ai_started');
   try{
     const data=await extractStatement(file,()=>setStage('Comparing the statement with your saved days…'));
     const detected=periodFromStatement(data);
     if(detected){
       setChosen(summarizePeriod(logs,detected));
     }
     setAi(data);setScanSource('ai');setVatChoice(data.taxBasis||'unknown');setVatEntry('');
     setConfirmedDays({});setLimitedAccepted(false);setStep('result');setOpenDays(false);setShowMore(false);
     track('statement_ai_completed');
   }catch(e){setError(describeStatementExtractionError(e));track('statement_ai_failed');}
   finally{setBusy(false);setStage('');}
 }
 function beginManual(){
   const parsed=Number(manualPayout);
   if(!/^\d+(\.\d{1,2})?$/.test(manualPayout)||!Number.isSafeInteger(Math.round(parsed*100))){
     setError('Enter the payout printed on your contractor statement.');return;
   }
   setAi({periodStart:period.start,periodEnd:period.end,currency:'GBP',contractorPayout:parsed,taxBasis:'unknown',daily:[],charges:[]});
   setVatChoice('unknown');setScanSource('manual');setConfirmedDays({});setLimitedAccepted(false);setError('');setStep('result');
 }
 function loadRecord(item){
   const range={start:item.start,end:item.end,id:item.id};
   setChosen(summarizePeriod(logs,range));setScanSource(item.record?.payoutComparison?.source||'saved');
   setAi(savedStatementDraft(item.record));setVatChoice('');setVatEntry('');setConfirmedDays(mergeFindingDecisions(item.record));setLimitedAccepted(item.record?.statementFindings?.limitedCoverageAccepted===true);setStep(item.record?.payoutComparison?'saved':'result');setError('');
 }
 async function saveCheck(){
   if(savingLock.current||!ai)return;
   const draft=createStatementReview(sourceNet);
   const captureOk=captureIssues(draft,period).length===0;
   if(!captureOk){setError('Check the statement dates, GBP currency and final payout. You can correct them using the original statement.');return;}
   savingLock.current=true;setBusy(true);setError('');
   try{
     const existing=periodRecords[period.id]||{};
     const netKnown=canCompare&&Number.isSafeInteger(view.payoutBeforeVat);
     const approved=confirmedReview({
       ...draft,
       payout:netKnown?String(view.payoutBeforeVat/100):draft.payout,
       taxBasis:netKnown?'excluded':draft.taxBasis,
       vatIncludedPayout:netKnown&&sourceNet.taxBasis==='included'?String(view.rawPayout/100):draft.vatIncludedPayout,
       reviewed:netKnown,
       items:[] // AI charge details are not verified just by scanning.
     },{asReceived:!netKnown});
     const details={
       stops:ai.statementStops==null?'':String(ai.statementStops),
       gross:amount(ai.statementAmount),
       extras:'',charges:amount(ai.contractorCharges),vat:amount(ai.vatAmount),
       daily:Object.fromEntries((ai.daily||[]).filter(x=>x?.date&&x.date>=period.start&&x.date<=period.end).map(x=>[x.date,{stops:x.stops==null?'':String(x.stops),amount:x.amount==null?'':String(x.amount)}]))
     };
     const base={
       status:netKnown?'checked':'statement_received',
       needsReview:!netKnown||unresolvedCurrent.length>0||(limitedCoverage&&!limitedAccepted),
       statementReceivedAt:new Date().toISOString(),
       reviewedStatement:approved,statementAmount:approved.payoutPence/100,
       statementWorkDetails:details,statementExtractionMode:ai.extractionMode||null,
       statementFindings:{
         source:scanSource,summaryOnly:view.summaryOnly,hasDaily:view.hasDaily,outsidePeriod:view.outsidePeriod,limitedCoverageAccepted:limitedCoverage?limitedAccepted:true,
         flagged:view.flagged.map(d=>({date:d.date,reason:d.reason,loggedStops:d.loggedStops,statementStops:d.statementStops,loggedGross:d.loggedGross,statementGross:d.statementGross,acceptedReason:confirmedDays[d.date]||null})),
         incompleteDays:view.unknown.length,recordedAt:new Date().toISOString()
       }
     };
     if(netKnown){
       const revisionNow=await moneyRevision(logs,costs.expenses||[],period);
       base.checkedAt=new Date().toISOString();
       base.payoutComparison={
         source:scanSource,scope:'contractor_payout',currency:'GBP',
         taxBasis:'same_as_records',basisConfirmed:true,start:period.start,end:period.end,
         statementPence:approved.payoutPence,expectedPence:rowSummary.payout,revision:revisionNow
       };
       base.resolvedAt=null;base.resolutionReason=null;
     }else{
       base.payoutComparison=null;
     }
     await updatePeriodRecord(period.id,{...existing,...base},true);
     setStep('saved');setScanFile(null);
     track(netKnown?'statement_compared':'statement_reviewed');
   }catch(_){setError('Could not save this pay check. Your work records were not changed. Please retry.');}
   finally{savingLock.current=false;setBusy(false);}
 }
 async function acceptDifference(){
   if(savingLock.current||previous.state!=='difference'||!statusRecord?.payoutComparison||!invoiceReady)return;
   savingLock.current=true;setBusy(true);setError('');
   try{
     const latest=await moneyRevision(logs,costs.expenses||[],period);
     if(statusRecord.payoutComparison.revision!==latest)throw new Error('stale');
     await updatePeriodRecord(period.id,{...statusRecord,status:'reconciled',needsReview:false,resolvedAt:new Date().toISOString(),resolutionReason:'driver_reviewed_and_accepted'},true);
     nav('/app/invoice',{state:{fromPay:true,periodId:period.id}});
   }catch(_){setError('Your pay check changed or could not be saved. Review the statement and try again.');}
   finally{savingLock.current=false;setBusy(false);}
 }
 async function recoverFee(){
   if(feeSaving||!feeAck)return;
   setFeeSaving(true);setError('');
   try{
     await updateLogs(applyConfirmedHistoricalFee(logs,period,feeInput));
     setFeeInput('');setFeeAck(false);
   }catch(_){setError('Unable to save the confirmed historical deduction. Your workdays were not changed.');}
   finally{setFeeSaving(false);}
 }
 const history=available.filter(p=>periodRecords[p.id]?.reviewedStatement||periodRecords[p.id]?.payoutComparison).slice(0,7);
 const latestCheck=periodRecords[period.id];
 // After upload, show the result headline on small mobile screens.
 useEffect(()=>{if(step==='result')document.querySelector('.st-app-shell > main')?.scrollTo?.({top:0,behavior:'auto'});},[step]);
 const displayResult=step==='result'||step==='saved';
 return <div className="home-screen st-page v5-pay">
  <header className="home-row v5-header"><div><h1>{displayResult?'Your pay check':'Check your pay'}</h1><p className="home-muted">{displayResult?'AI compared the figures it could read. Review what matters.':'Log your work. Upload the statement. See what changed.'}</p></div><HeaderControls hidden={hidden} onToggleMoney={()=>{setHidden(v=>{try{localStorage.setItem('home-hide-money',v?'0':'1');}catch(_){}return !v;});}}/></header>
  {step==='home'&&<>
   <section className="home-card v5-upload">
     <div className="v5-upload-heading"><Sparkles size={23} aria-hidden="true"/><h2>Ready to check a statement?</h2></div>
     <p className="home-muted">Upload the statement from your contractor. Stop Tracker reads the dates, finds your logged days and checks the differences.</p>
     {permissionError?<div className="home-banner">AI access couldn't be confirmed. You can still record the payout manually. <button className="home-text-button" type="button" onClick={()=>{setPermissionError(false);getPremiumStatus().then(setPermission).catch(()=>setPermissionError(true));}}>Retry AI access</button></div>:null}
     <label className={'home-primary v5-upload-cta '+(!scanEnabled||busy?'v5-inactive':'')}><FileUp size={20} aria-hidden="true"/> Upload & check with AI
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" disabled={!scanEnabled||busy} aria-label="Upload contractor statement" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)readFile(f);}}/>
     </label>
     <p className="home-muted text-xs">{permissionError?'AI temporarily unavailable':permission?.betaAccess?'AI included during testing · daily limits apply':permission?.isPro?'Included with Pro':permission?permission.statementAiUses<3?String(3-permission.statementAiUses)+' free scans left':'Pro required to scan':'Checking AI access…'} · PDF or photo up to 12 MB</p>
     <details className="v5-manual"><summary>Or enter a statement amount manually</summary><label className="home-field">Payout on statement (£)<input value={manualPayout} onChange={e=>setManualPayout(e.target.value)} inputMode="decimal" placeholder="e.g. 4250.00" /></label><button className="home-secondary w-full" type="button" onClick={beginManual}>Continue with manual amount</button></details>
   </section>
   <section className="v5-overview home-card"><div className="v5-topline"><h2>Your recorded work</h2><span className="st-badge">{period.daysLogged??rowSummary.rows.length} days</span></div>
    <label className="home-field">Period to view<select value={period.id} aria-label="Choose work period" onChange={e=>{const p=available.find(a=>a.id===e.target.value);if(p)setChosen(p);}}>{available.map(p=><option key={p.id} value={p.id}>{showDate(p.start)} – {showDate(p.end)}</option>)}</select></label>
    <div className="v5-overview-total"><span className="home-muted">Expected payout</span><strong>{cash(rowSummary.payout)}</strong></div>
    <p className="home-muted text-xs">The uploaded statement's dates override this selection for the check. Your saved work is never rewritten.</p>
    {rowSummary.payout==null&&rowSummary.rows.length>0&&<p className="home-muted text-sm">Some historical earnings or fees need confirming. AI can still check workday counts.</p>}
    <Link className="home-text-button" to="/app/dashboard">Log a workday <ArrowRight size={16}/></Link>
   </section>
   {!!history.length&&<section className="home-card v5-history"><h2>Previous checks</h2>{history.map(p=><button type="button" key={p.id} onClick={()=>loadRecord({id:p.id,start:p.start,end:p.end,record:periodRecords[p.id]})}><span><strong>{showDate(p.start)} – {showDate(p.end)}</strong><small>{periodRecords[p.id]?.payoutComparison?'Check saved':'Statement saved · Finish review'}</small></span><ArrowRight size={17} aria-hidden="true"/></button>)}</section>}
  </>}
  {(step==='result'||step==='saved')&&<>
   <button className="home-text-button v5-back" onClick={reset} disabled={busy}>← Back to Pay</button>
   <section className="home-card v5-result">
    <div className="v5-topline"><span className="st-badge">{step==='saved'?'Saved to your account':'AI figures · Review before saving'}</span>{view?.hasDaily&&<span className="st-badge">Daily check</span>}</div>
    <h2>{!ai?'No saved statement details':!view?.periodOk?'Check statement dates':view.flagged.length?view.flagged.length+' workday'+(view.flagged.length===1?' needs':'s need')+' attention':view.hasDaily?'Available daily figures checked':'Pay totals found'}</h2>
    <p className="home-muted">{showDate(period.start)} – {showDate(period.end)} · {rowSummary.rows.length} logged workdays</p>
    <dl className="v5-totals">
     <div><dt>Contractor statement</dt><dd>{cash(view?.rawPayout)}</dd></div>
     <div><dt>Your expected payout</dt><dd>{cash(rowSummary.payout)}</dd></div>
     {view?.payoutBeforeVat!=null&&view.rawPayout!==view.payoutBeforeVat&&<div><dt>Statement, before VAT</dt><dd>{cash(view.payoutBeforeVat)}</dd></div>}
     <div className={'v5-difference '+(view?.canCompare&&view.difference!==0?'v5-warning-difference':'')}><dt>Potential difference</dt><dd>{view?.canCompare?cash(Math.abs(view.difference)):'Not comparable yet'}</dd></div>
    </dl>
    {view?.canCompare&&<p className="home-muted text-sm">{view.difference===0?'The before-VAT payout totals match.':view.difference<0?'The statement payout is lower than your expected amount.':'The statement payout is higher than your expected amount.'} A totals match does not prove each day or charge is correct.</p>}
    {view?.hasDaily&&<p className="home-muted text-sm" role="status">{view.matched.length} workdays matched · {view.flagged.length} to review · {view.unknown.length} without enough detail</p>}
    {limitedCoverage?<p className="home-banner" role="status">Limited check: some workdays could not be verified. You can save this payout now, but an invoice requires acknowledging that limitation.</p>:null}
   </section>
   {view?.flagged.length>0&&<section className="home-card v5-differences"><div className="v5-topline"><h2>Workdays to review</h2><span className="st-badge">{view.flagged.length}</span></div>
    <p className="home-muted text-sm">A small stop difference may be a duplicate, but AI cannot prove it. Review only the affected days. You can save now; preparing an invoice waits until you resolve them.</p>
    {(openDays?view.flagged:view.flagged.slice(0,4)).map(row=><div className="v5-day" key={row.date}>
      <strong>{showDate(row.date)}</strong>
      <p className="home-muted text-sm">{row.reason||'Your stops or earnings differ from the statement.'}</p>
      <div className="v5-day-numbers"><span>Stops: {row.loggedStops??'—'} yours / {row.statementStops??'—'} statement</span><span>Gross: {cash(row.loggedGross)} / {cash(row.statementGross)}</span></div>
      <label className="v5-day-accept">Mark as<select value={confirmedDays[row.date]||''} onChange={e=>setConfirmedDays(v=>({...v,[row.date]:e.target.value}))}><option value="">Needs review</option><option value="possible_duplicate_accepted">Possible duplicate — accepted</option><option value="figures_verified">Checked and accepted</option><option value="dispute">Query with contractor</option></select></label>
     </div>)}
    {view.flagged.length>4&&<button type="button" className="home-secondary w-full" onClick={()=>setOpenDays(v=>!v)}>{openDays?'Show fewer':`See all ${view.flagged.length} workdays`}</button>}
   </section>}
   {view?.unknown.length>0&&<p className="home-banner">{view.unknown.length} workdays have insufficient figures for a full comparison. They are not marked as matching.</p>}
   {chargeEvidence.length>0&&<details className="home-card v5-charge-evidence"><summary>Contractor charges & fuel — {chargeEvidence.length} read</summary><p className="home-muted text-sm">AI checked these charges only where independent records exist. Fuel-card discounts are never assumed.</p>
    {chargeEvidence.map(row=><div className="v5-charge-row" key={row.id}><div><strong>{row.label}</strong><p className="home-muted text-xs">{row.explanation}</p></div><span>{cash(row.amountPence)}</span></div>)}
   </details>}
   {ai&&step==='result'&&(!view?.canCompare||!view?.periodOk)&&<section className="home-card v5-one-question">
    <h2>One detail needs checking</h2>
    {!view?.periodOk&&<p className="home-muted">The statement dates don't match the selected range. Choose the matching period:</p>}
    <label className="home-field">Work period<select value={period.id} onChange={e=>{const p=available.find(a=>a.id===e.target.value);if(p)setChosen(p);}}>{[period,...available.filter(p=>p.id!==period.id)].map(p=><option key={p.id} value={p.id}>{p.start} – {p.end}</option>)}</select></label>
    {view?.vatSource==='unknown'&&<><label className="home-field">Does the statement payout include VAT?<select value={vatChoice||'unknown'} onChange={e=>setVatChoice(e.target.value)}><option value="unknown">Not sure / show me later</option><option value="excluded">No — this is before VAT</option><option value="included">Yes — it includes VAT</option><option value="not_applicable">No VAT applies</option></select></label>
     {vatChoice==='included'&&<label className="home-field">VAT amount printed on the statement (£)<input inputMode="decimal" placeholder="Only enter an amount shown on the original" value={vatEntry} onChange={e=>setVatEntry(e.target.value)}/></label>}</>}
    {rowSummary.payout==null&&<p className="home-muted text-sm">Some historical pay settings are missing. You can save the statement now, then confirm those settings without re-uploading.</p>}
   </section>}
   {issues.missingGross.length>0&&<section className="home-card v5-missing-work" role="region" aria-label="Review missing work earnings">
     <h2>{issues.missingGross.length} saved {issues.missingGross.length===1?'day needs':'days need'} earnings reviewed</h2>
     <p className="home-muted text-sm">Your recorded stops are safe, but those historical gross amounts are missing. Open just the affected days; no new statement scan is needed.</p>
     <Link className="home-secondary w-full" to="/app/records?payReview=1" state={{periodId:period.id}}>Review saved workdays <ArrowRight size={16}/></Link>
   </section>}
   {issues.missingFee.length>0&&<details className="home-card v5-fee-repair" aria-label="Confirm historical pay deduction">
    <summary>One missing detail · Confirm a contractor deduction for {issues.missingFee.length} saved {issues.missingFee.length===1?'day':'days'}</summary>
    <p className="home-muted text-sm">Your original work and gross earnings stay unchanged. Confirm this percentage only if it applied then.</p>
    <label className="home-field">Contractor fee (%)<input value={feeInput} placeholder="e.g. 6" inputMode="decimal" onChange={e=>{setFeeInput(e.target.value);setFeeAck(false);}}/></label>
    <label className="v5-ack"><input type="checkbox" checked={feeAck} onChange={e=>setFeeAck(e.target.checked)}/> Yes, this percentage applied to these historic dates.</label>
    <button type="button" className="home-primary w-full" disabled={feeSaving||!feeAck||!validHistoricalFee(feeInput)} onClick={recoverFee}>{feeSaving?'Saving…':'Confirm old deduction'}</button>
   </details>}
   {step==='result'&&<section className="home-card v5-finish"><h2>Finish checking</h2>
     <p className="home-muted text-sm">{canCompare?'Check the payout and dates against your original statement. Individually matched charges need no extra taps.':'Save the statement as received. Finish any missing details later without another scan.'}</p>
     {limitedCoverage&&canCompare&&<label className="v5-ack"><input type="checkbox" checked={limitedAccepted} onChange={e=>setLimitedAccepted(e.target.checked)}/> I understand that not every workday was verified. I accept a limited comparison for invoicing.</label>}
     <button type="button" className="home-primary w-full" disabled={busy||!ai||!sourceNet||!view?.periodOk||!view?.currencyOk||view.rawPayout==null} onClick={saveCheck}>{busy?'Saving…':canCompare?'Save pay check':'Save statement — check later'}</button>
     <details className="v5-manual"><summary>View extracted totals and charges</summary>
       <p className="home-muted text-sm">These are unverified AI figures from the contractor document. Never assume that a missing amount is £0.</p>
       <dl className="v5-totals"><div><dt>Gross work earnings</dt><dd>{currency(typeof ai.statementAmount==='number'?Math.round(ai.statementAmount*100):null)}</dd></div><div><dt>Contractor fee</dt><dd>{currency(typeof ai.contractorFee==='number'?Math.round(ai.contractorFee*100):null)}</dd></div><div><dt>Other charges</dt><dd>{currency(typeof ai.contractorCharges==='number'?Math.round(ai.contractorCharges*100):null)}</dd></div>{(ai.charges||[]).slice(0,15).map((c,i)=><div key={i}><dt>{c.label||'Charge'}</dt><dd>{typeof c.amount==='number'?currency(Math.round(c.amount*100)):'Not read'}</dd></div>)}</dl>
       <Link className="home-text-button" to="/app/check-pay/advanced" state={{periodId:period.id}}>Correct statement figures manually <ArrowRight size={16}/></Link>
     </details>
   </section>}
   {step==='saved'&&<section className="home-card v5-finish">
     <h2>{savedCheck?'Pay check saved':'Statement saved · Needs review'}</h2>
     <p className="home-muted">{savedCheck?'Your statement was compared with the saved work available for this period. The actual payment is not independently confirmed.':'Your statement is saved. The app did not falsely mark VAT, missing rates or unknown daily figures as verified.'}</p>
     {unresolvedSaved.length>0&&<div className="home-banner" role="status"><strong>{unresolvedSaved.length} workday {unresolvedSaved.length===1?'difference':'differences'} to review</strong><p className="home-muted text-sm">Your statement is saved. Before preparing an invoice, mark each difference as accepted. You don't need to scan again.</p>
       <button className="home-primary w-full" type="button" onClick={()=>{setConfirmedDays(mergeFindingDecisions(statusRecord));setStep('result');setOpenDays(true);}}>Review differences <ArrowRight size={18}/></button>
     </div>}
     {statusRecord?.payoutComparison&&savedCoveragePending&&unresolvedSaved.length===0&&<button className="home-primary w-full" type="button" onClick={()=>{setLimitedAccepted(false);setStep('result');}}>Review limited pay check <ArrowRight size={18}/></button>}
     {savedCheck&&previous.state==='difference'&&invoiceReady&&<button className="home-primary w-full" type="button" disabled={busy} onClick={acceptDifference}>{busy?'Saving…':'Accept difference & prepare invoice'} <ArrowRight size={18}/></button>}
     {savedCheck&&['matched','reconciled'].includes(previous.state)&&invoiceReady&&<button className="home-primary w-full" type="button" onClick={()=>nav('/app/invoice',{state:{fromPay:true,periodId:period.id}})}>Prepare invoice from statement <ArrowRight size={18}/></button>}
     {savedCheck&&<Link to="/app/records?tab=documents" className="home-secondary w-full">Save and finish (self-billed)</Link>}
     {!savedCheck&&unresolvedSaved.length===0&&<button className="home-secondary w-full" type="button" onClick={()=>setStep('result')}>Review missing details</button>}
   </section>}

  </>}
  {busy&&<p className="home-banner v5-stage" role="status"><Loader2 size={18} className="v5-spinner" aria-hidden="true"/>{stage||'Saving your check…'}</p>}
  {error&&<p className="home-banner home-error" role="alert">{error}</p>}
  <p className="home-muted text-xs v5-disclaimer">Stop Tracker checks your records independently. AI findings require review; matching amounts don't prove payment was received. Invoices are only marked sent when you confirm sending them.</p>
 </div>;
}
