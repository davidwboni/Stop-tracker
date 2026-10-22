import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, useReducedMotion } from 'framer-motion';
import { X, Paperclip, ScanLine, Pencil, ArrowLeft, ChevronRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { useAuth } from '../contexts/AuthContext';
import { isoDate } from '../features/payperiod/periods';
import { validDate } from '../features/expenses/expenseModel';
import { trackProductEvent as track } from '../services/productAnalytics';
import '../styles/home.css';
import '../styles/quick-entry.css';
import '../styles/add-expense.css';

const categories = ['Fuel','Parking','Tolls','Lease','Insurance','Servicing','Repairs','Equipment','Mobile rental','Management fee','Mileage','Parcel claim','Other'];
const receipts = () => import('../services/expenseReceipts');
export default function HomeExpenseDialog({ open, onClose, save, isGuest, initialExpense = null, confirmExpected = false, initialSource = 'my_expense', eventSource = 'home' }) {
  const { user } = useAuth();
  const [id] = useState(() => initialExpense?.id || crypto.randomUUID());
  const [initial] = useState(() => ({date:initialExpense?.date || isoDate(new Date()),amount:initialExpense ? String(initialExpense.amount) : '',source:initialExpense?.source || (confirmExpected ? initialSource : 'my_expense'),category:initialExpense?.category || 'Other',description:initialExpense?.description || '',notes:initialExpense?.notes || '',fuelCardDiscount:initialExpense?.fuelCardDiscount == null ? '' : String(initialExpense.fuelCardDiscount)}));
  const [draft, setDraft] = useState(initial);
  const [mode, setMode] = useState(initialExpense || confirmExpected ? 'manual' : 'choice');
  const [changeDate, setChangeDate] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [retain, setRetain] = useState(!!initialExpense?.receipt);
  const [existing, setExisting] = useState(initialExpense?.receipt || null);
  const [reviewed, setReviewed] = useState(false);
  const [review, setReview] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusRetry, setStatusRetry] = useState(0);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('idle');
  const [discard, setDiscard] = useState(false);
  const [viewport, setViewport] = useState(null);
  const lock = useRef(false), closeRef = useRef(), input = useRef(), attached = useRef(null), scrollRef = useRef(null);
  const reduce = useReducedMotion();
  const busy = phase !== 'idle';
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || !!file || existing !== (initialExpense?.receipt || null) || retain !== !!initialExpense?.receipt || review;
  const change = (key, value) => { setDraft(old => ({...old,[key]:value})); setError(''); };
  closeRef.current = () => { if (lock.current) return; if (discard) setDiscard(false); else if (dirty) setDiscard(true); else onClose(); };
  useEffect(() => {
    const view = window.visualViewport;
    const update = () => setViewport({height:Math.max(240,view?.height || window.innerHeight),top:view?.offsetTop||0});
    update();
    view?.addEventListener('resize',update);view?.addEventListener('scroll',update);window.addEventListener('resize',update);
    return () => {view?.removeEventListener('resize',update);view?.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
  },[]);
  const revealField=target=>{
    const region=scrollRef.current;
    if(!region || !region.contains(target))return;
    const align=()=>{
      if(!scrollRef.current?.contains(target))return;
      const visible=region.getBoundingClientRect(), rect=target.getBoundingClientRect();
      if(rect.bottom>visible.bottom-18)region.scrollTop+=rect.bottom-visible.bottom+18;
      else if(rect.top<visible.top+18)region.scrollTop-=visible.top-rect.top+18;
    };
    requestAnimationFrame(align);setTimeout(align,180);
  };
  useEffect(()=>{const active=document.activeElement;if(active?.matches?.('input,textarea,select'))revealField(active);},[viewport?.height,viewport?.top]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = event => {event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',prevent); return () => window.removeEventListener('beforeunload',prevent);
  },[dirty]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed=false, listener;
    NativeApp.addListener('backButton',()=>{
      const active=document.activeElement;
      if(window.visualViewport && window.innerHeight-window.visualViewport.height>150 && active?.matches('input,textarea'))active.blur();
      else closeRef.current?.();
    }).then(handle=>{if(disposed)handle.remove();else listener=handle;});
    return ()=>{disposed=true;listener?.remove();};
  },[]);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {setPreview('');return;}
    const url=URL.createObjectURL(file);setPreview(url);return ()=>URL.revokeObjectURL(url);
  },[file]);
  useEffect(() => {
    if(mode !== 'ai' || isGuest) return;
    let active=true;setStatus(null);
    receipts().then(service=>service.getReceiptStatus()).then(value=>{if(active)setStatus(value);}).catch(()=>{if(active)setStatus({error:true});});
    return ()=>{active=false;};
  },[mode,isGuest,statusRetry]);
  async function attach(event) {
    const next=event.target.files?.[0];event.target.value='';if(!next)return;
    try { (await receipts()).validateReceipt(next);setFile(next);attached.current=null;setRetain(false);setError('');setReviewed(false);setReview(false); }
    catch(err){setError(err.message);}
  }
  async function scan() {
    if(lock.current || !file)return;
    lock.current=true;setPhase('extracting');setError('');track('expense_ai_started',{source:eventSource});
    try {
      if(!navigator.onLine)throw new Error('Connect to scan this receipt. Your draft is still here.');
      const result=await (await receipts()).extractReceipt(file);
      setDraft(old=>({...old,amount:result.amount == null ? '' : String(result.amount),date:result.date || '',category:categories.includes(result.category)?result.category:'Other',description:result.description || ''}));
      setReview(true);setReviewed(false);track('expense_ai_completed',{source:eventSource});
      if(result.currency !== 'GBP')setError('Currency could not be confirmed as GBP. Check the receipt and enter the GBP amount yourself; no conversion has been applied.');
    }catch(err){track('expense_ai_failed',{source:eventSource});setError(err.message || 'Could not read this receipt. Enter it manually or retry.');}
    finally{lock.current=false;setPhase('idle');}
  }
  async function submit(event) {
    event.preventDefault();if(lock.current)return;
    if(mode==='ai'&&!review){setError('Scan and review the receipt, or choose Manual to enter it yourself.');return;}
    if(!validDate(draft.date)||!/^\d+(\.\d{1,2})?$/.test(draft.amount)||Number(draft.amount)<=0||!Number.isSafeInteger(Math.round(Number(draft.amount)*100))){setError('Enter a valid date and an amount greater than £0, with up to two decimal places.');return;}
    if(fuelExpense&&draft.fuelCardDiscount!==''){
      if(!/^\d+(\.\d{1,2})?$/.test(draft.fuelCardDiscount)||Number(draft.fuelCardDiscount)>Number(draft.amount)){
        setError('Enter the exact fuel-card discount shown, between £0 and the pump amount.');return;
      }
    }
    if(review&&!reviewed){setError('Check the extracted fields and confirm your review before saving.');return;}
    if(!navigator.onLine&&!isGuest){setError('You’re offline. Keep this form open and save when connected.');return;}
    lock.current=true;setPhase('saving');setError('');
    let newReceipt=null;
    try {
      if(file&&retain){
        const service=await receipts();
        newReceipt=attached.current || await service.retainReceipt(user?.uid,id,file,isGuest);
        attached.current=newReceipt;
      }
      const receipt=retain ? newReceipt || existing : null;
      const {fuelCardDiscount,...base}=draft;
      const fuelEvidence=fuelExpense&&fuelCardDiscount!==''?{fuelCardDiscount:Number(fuelCardDiscount)}:{};
      await save({...initialExpense,id,...base,amount:Number(draft.amount),
        category:fuelExpense&&draft.category==='Other'?'Fuel':draft.category,
        description:draft.description.trim(),notes:draft.notes.trim(),receipt,
        fuelCardDiscount:null,...fuelEvidence});
      // Signed-in replacements/deletions are retried by a server trigger. Guest files remain local.
      if(initialExpense?.receipt?.local && initialExpense.receipt.path!==receipt?.path) await (await receipts()).removeReceipt(user?.uid,initialExpense.receipt).catch(()=>{});
      track(review?'expense_ai_saved':'expense_manual_saved',{source:eventSource,mode:initialExpense?'edit':'new'});
      onClose();
    }catch(_){
      // Retain the same expense id on retry. Remove a newly uploaded orphan where possible.
      if(newReceipt) {try{await (await receipts()).removeReceipt(user?.uid,newReceipt);attached.current=null;}catch(_){/* Reuse the same upload on retry. */}}
      track('expense_save_failed',{source:eventSource});setError('Couldn’t save. Your details are still here. Please retry.');
    }finally{lock.current=false;setPhase('idle');}
  }
  const fuelExpense=draft.source==='my_expense'&&(draft.category==='Fuel'||/\b(fuel|diesel|petrol|fuel card)\b/i.test(draft.description));
  const canScan=status?.enabled&&(status?.isPro||status?.betaAccess)&&!isGuest;
  const displayDate=value=>validDate(value)?new Date(value+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Choose date';
  const dayLabel=draft.date===isoDate(new Date())?'Today · '+displayDate(draft.date):displayDate(draft.date);
  return <Dialog open={open} onClose={()=>closeRef.current?.()} className="qe-root">
    <div className="qe-backdrop" aria-hidden="true"/>
    <div className="qe-position" style={viewport?{height:viewport.height,top:viewport.top,bottom:'auto'}:undefined}>
      <Dialog.Panel as={motion.div} initial={{opacity:0,y:reduce?0:12}} animate={{opacity:1,y:0}} transition={{duration:reduce?0:.2}} tabIndex={0} className="qe-panel home-screen ae-panel">
        <header className="qe-header">
          <div><Dialog.Title className="qe-title">{discard?'Discard changes?':confirmExpected?'Record expected cost':initialExpense?'Edit expense':'Add expense'}</Dialog.Title></div>
          <button type="button" className="home-icon" aria-label="Close expense" disabled={busy} onClick={()=>closeRef.current?.()}><X/></button>
        </header>
        {discard?<div className="qe-discard"><p>Your unsaved changes will be lost.</p>
          <button className="home-primary" onClick={()=>setDiscard(false)}>Keep editing</button>
          <button className="home-secondary" onClick={()=>{track('expense_dismissed',{source:eventSource});onClose();}}>Discard changes</button>
        </div>:<form className="qe-form" onSubmit={submit} noValidate>
          <div ref={scrollRef} className="qe-scroll ae-simple-scroll" onFocusCapture={event=>revealField(event.target)}>
            {mode==='choice'&&<div className="ae-choice" role="group" aria-label="How to add an expense">
              <p className="home-muted text-sm">Choose the easiest way to record your cost.</p>
              <button type="button" className="ae-choice-card ae-choice-scan" onClick={()=>setMode('ai')} disabled={busy}>
                <span className="ae-choice-icon"><ScanLine size={24} aria-hidden="true"/></span>
                <span><strong>Scan receipt with AI</strong><small>Photo or PDF · Extract details for review</small></span><ChevronRight aria-hidden="true" size={19}/>
              </button>
              <button type="button" className="ae-choice-card" onClick={()=>setMode('manual')} disabled={busy}>
                <span className="ae-choice-icon"><Pencil size={24} aria-hidden="true"/></span>
                <span><strong>Enter manually</strong><small>Amount and optional description · Free</small></span><ChevronRight aria-hidden="true" size={19}/>
              </button>
            </div>}
            {mode!=='choice'&&!initialExpense&&!confirmExpected&&<button type="button" className="ae-back home-text-button" onClick={()=>{setMode('choice');setError('');}} disabled={busy}><ArrowLeft size={17}/> Choose another method</button>}
            {mode==='ai'&&!review&&<section className="ae-scan-home">
              <div className="ae-scan-icon"><ScanLine size={32} aria-hidden="true"/></div>
              <h3>Scan your receipt</h3>
              <p className="home-muted text-sm">Choose a photo or PDF. AI will try to read the amount, date and what you bought. Review the result before saving.</p>
              {isGuest?<p className="home-banner">Sign in with a permanent account to scan receipts during testing. Manual entry is free.</p>:
                status===null?<p role="status" className="home-muted text-sm">Checking scanning access…</p>:
                status.error?<p role="alert" className="home-banner">Scanning access could not be checked. You can retry or enter manually.</p>:
                !status.enabled?<p className="home-banner">Receipt scanning isn't available right now. You can enter it manually.</p>:
                !status.isPro&&!status.betaAccess?<p className="home-banner">Scanning requires Pro. <a className="underline" href="/app/upgrade">View Pro</a> or enter it manually.</p>:null}
              {status?.betaAccess&&!status?.error&&<p className="home-muted text-xs" role="status">Receipt AI is free during testing · up to 8 scans per day.</p>}
              {status?.error&&<button type="button" className="home-secondary" onClick={()=>setStatusRetry(n=>n+1)}>Retry availability</button>}
              <p className="home-muted text-xs">Scanning uses an external AI service. Nothing is saved until you confirm.</p>
            </section>}
            {mode==='ai'&&review&&<p className="home-banner" role="status"><strong>Review AI-extracted details</strong><span className="block text-sm">Check the amount, date and description against the receipt before saving.</span></p>}
            {(mode==='manual'||review)&&<fieldset disabled={busy} className="ae-fields ae-simple-fields">
              <label className="home-field ae-amount">Amount (£)<input inputMode="decimal" autoComplete="off" value={draft.amount} onChange={e=>change('amount',e.target.value)} placeholder="0.00" required/></label>
              <label className="home-field">What was it for? <span className="home-muted text-xs">(optional)</span><input maxLength={200} value={draft.description} onChange={e=>change('description',e.target.value)} placeholder="e.g. Fuel, repair, parking"/></label>
              {fuelExpense&&<details className="ae-fuel-discount" open={draft.fuelCardDiscount!==''||undefined}>
                <summary>Fuel-card discount (optional)</summary>
                <p className="home-muted text-xs">The receipt may show the pump price, but your contractor may bill less. Only enter a discount shown in your records. We won't guess.</p>
                <label className="home-field">Fuel-card discount shown (£)
                  <input inputMode="decimal" aria-label="Fuel-card discount shown (£)" value={draft.fuelCardDiscount} onChange={e=>change('fuelCardDiscount',e.target.value)} placeholder="e.g. 6.00"/>
                </label>
              </details>}
              <div className="ae-date-choice">
                <button type="button" className="ae-date-toggle" aria-expanded={changeDate||!validDate(draft.date)} onClick={()=>setChangeDate(value=>!value)}>
                  <span>{dayLabel}</span><span className="ae-date-action">{changeDate?'Close':'Change date'}</span>
                </button>
                {(changeDate||!validDate(draft.date))&&<label className="home-field">Date<input type="date" value={draft.date} required onChange={e=>change('date',e.target.value)}/></label>}
              </div>
              {initial.source==='contractor_charge'&&<p className="home-banner text-xs">This older record was saved as a contractor charge. The charge type is preserved when you edit it; new contractor deductions belong in Pay.</p>}
            </fieldset>}
            {mode!=='choice'&&<div className={'ae-receipt '+(mode==='manual'?'ae-manual-receipt':'')}>
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={attach} className="sr-only" tabIndex={-1} aria-label="Receipt file" disabled={busy}/>
              {mode==='ai'&&!review&&<button type="button" disabled={busy} className="home-secondary w-full" onClick={()=>input.current?.click()}><Paperclip size={18}/> {file?'Change receipt':'Choose receipt'}</button>}
              {mode==='manual'&&!file&&!existing&&<button type="button" disabled={busy} className="home-text-button ae-attach" onClick={()=>input.current?.click()}><Paperclip size={17}/> Attach receipt (optional)</button>}
              {(file||existing)&&<div className="ae-attached">
                <div className="home-row">{preview&&<img src={preview} alt="Selected receipt preview" className="ae-thumbnail"/>}<span className="text-sm">{file?(file.type==='application/pdf'?'PDF selected':'Photo selected'):'Receipt already attached'}</span>
                  <button type="button" disabled={busy} className="home-text-button" onClick={()=>{setFile(null);setExisting(null);setRetain(false);attached.current=null;setReviewed(false);if(mode==='ai')setReview(false);}}>Remove</button>
                </div>
                <label className="ae-checkbox"><input type="checkbox" checked={retain} disabled={busy} onChange={e=>setRetain(e.target.checked)}/>Save receipt with expense</label>
                <p className="home-muted text-xs">{retain?(isGuest?'Saved only on this device.':'Saved privately with this expense.'):'The receipt will not be stored.'}</p>
              </div>}
              {mode==='ai'&&<p className="home-muted text-xs">JPEG, PNG, WebP or PDF · Up to 8 MB · 4 PDF pages maximum</p>}
            </div>}
            {review&&<label className="ae-checkbox"><input type="checkbox" disabled={busy} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I've checked these details against my receipt</label>}
            {error&&<p role="alert" className="home-error">{error}</p>}
            {isGuest&&mode!=='choice'&&<p className="home-muted text-xs">Guest records are stored on this device only.</p>}
          </div>
          {mode!=='choice'&&<footer className="qe-footer">
            {mode==='ai'&&!review?
              <button type="button" className="home-primary w-full" disabled={busy||!file||!canScan} onClick={scan}>{phase==='extracting'?'Reading receipt…':'Extract for review'}</button>:
              <button type="submit" className="home-primary w-full" disabled={busy||(review&&!reviewed)}>{phase==='saving'?'Saving…':confirmExpected?'Record expense':initialExpense?'Save changes':review?'Confirm and save expense':'Save expense'}</button>}
          </footer>}
        </form>}
      </Dialog.Panel>
    </div>
  </Dialog>;
}
