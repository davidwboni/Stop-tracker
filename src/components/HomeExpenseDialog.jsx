import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, useReducedMotion } from 'framer-motion';
import { X, Paperclip, ScanLine } from 'lucide-react';
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
  const [initial] = useState(() => ({date:initialExpense?.date || isoDate(new Date()),amount:initialExpense ? String(initialExpense.amount) : '',source:initialExpense?.source || initialSource,category:initialExpense?.category || 'Other',description:initialExpense?.description || '',notes:initialExpense?.notes || ''}));
  const [draft, setDraft] = useState(initial);
  const [mode, setMode] = useState('manual');
  const [showNotes, setShowNotes] = useState(!!initial.notes);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [retain, setRetain] = useState(!!initialExpense?.receipt);
  const [existing, setExisting] = useState(initialExpense?.receipt || null);
  const [reviewed, setReviewed] = useState(false);
  const [review, setReview] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('idle');
  const [discard, setDiscard] = useState(false);
  const [viewport, setViewport] = useState(null);
  const lock = useRef(false), closeRef = useRef(), input = useRef(), attached = useRef(null);
  const reduce = useReducedMotion();
  const busy = phase !== 'idle';
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || !!file || existing !== (initialExpense?.receipt || null) || retain !== !!initialExpense?.receipt || review;
  const change = (key, value) => { setDraft(old => ({...old,[key]:value})); setError(''); };
  closeRef.current = () => { if (lock.current) return; if (discard) setDiscard(false); else if (dirty) setDiscard(true); else onClose(); };
  useEffect(() => {
    const view = window.visualViewport;
    if (!view) return;
    const update = () => setViewport({height:view.height,top:view.offsetTop});
    update(); view.addEventListener('resize',update); view.addEventListener('scroll',update);
    return () => {view.removeEventListener('resize',update);view.removeEventListener('scroll',update);};
  },[]);
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
  },[mode,isGuest]);
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
      await save({...initialExpense,id,...draft,amount:Number(draft.amount),description:draft.description.trim(),notes:draft.notes.trim(),receipt});
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
  const canScan=status?.enabled&&status?.isPro&&!isGuest;
  return <Dialog open={open} onClose={()=>closeRef.current?.()} className="qe-root"><div className="qe-backdrop" aria-hidden="true"/>
    <div className="qe-position" style={viewport?{height:viewport.height,top:viewport.top,bottom:'auto'}:undefined}>
      <Dialog.Panel as={motion.div} initial={{opacity:0,y:reduce?0:12}} animate={{opacity:1,y:0}} transition={{duration:reduce?0:.2}} tabIndex={0} className="qe-panel home-screen ae-panel">
        <header className="qe-header"><div><Dialog.Title className="qe-title">{discard?'Discard unsaved changes?':confirmExpected?'Record expected cost':initialExpense?'Edit expense':'Add expense'}</Dialog.Title><p className="home-muted">Keep track of your business costs.</p></div><button type="button" className="home-icon" aria-label="Close expense" disabled={busy} onClick={()=>closeRef.current?.()}><X/></button></header>
        {discard?<div className="qe-discard"><p>Your unsaved changes will be lost.</p><button className="home-primary" onClick={()=>setDiscard(false)}>Keep editing</button><button className="home-secondary" onClick={()=>{track('expense_dismissed',{source:eventSource});onClose();}}>Discard changes</button></div>:<form className="qe-form" onSubmit={submit} noValidate>
          <div className="qe-scroll">
            {!initialExpense&&<div className="qe-worked" role="group" aria-label="Entry method"><button type="button" disabled={busy} aria-pressed={mode==='manual'} onClick={()=>setMode('manual')}>Manual <small>Free</small></button><button type="button" disabled={busy} aria-pressed={mode==='ai'} onClick={()=>setMode('ai')}>Scan with AI <small>Pro</small></button></div>}
            {mode==='ai'&&!review&&<div className="qe-summary space-y-3"><ScanLine aria-hidden="true"/><h3>Read a receipt, then review</h3><p className="home-muted text-sm">Send this receipt to DeepSeek to extract the date, total and merchant. Check every field before saving. Storage is a separate choice below.</p>
              {isGuest?<p className="home-banner">Sign in to a permanent account and use Pro to scan. Manual entry is free. <a className="underline" href="/app/profile">Open profile</a></p>:status===null?<p role="status">Checking receipt scanning…</p>:status.error?<p role="alert">Could not check scanning availability. Switch to Manual, or reopen Scan with AI to retry.</p>:!status.enabled?<p className="home-banner">Receipt scanning isn’t available yet. You can enter this expense manually.</p>:!status.isPro?<p className="home-banner">Receipt scanning requires Pro. <a className="underline" href="/app/upgrade">View Pro</a>, or use Manual for free.</p>:null}
            </div>}
            {review&&<div className="home-banner" role="status"><strong>Review extracted details</strong><p>Nothing has been saved. Check the amount, date, source and category against your receipt.</p></div>}
            {(mode==='manual'||review)&&<fieldset disabled={busy} className="ae-fields">
              <label className="home-field ae-amount">Amount (£)<input inputMode="decimal" autoComplete="off" value={draft.amount} onChange={e=>change('amount',e.target.value)} placeholder="0.00" required/></label>
              <label className="home-field qe-date">Date<input type="date" value={draft.date} onChange={e=>change('date',e.target.value)} required/></label>
              <div><p className="mb-2 font-semibold" id="expense-source-label">Source</p><div className="qe-worked" role="group" aria-labelledby="expense-source-label">{[['my_expense','My expense'],['contractor_charge','Contractor charge']].map(([value,label])=><button type="button" key={value} aria-pressed={draft.source===value} onClick={()=>change('source',value)}>{label}</button>)}</div></div>
              <p className="home-muted text-sm">Only add costs not already recorded. Your percentage contractor fee is calculated separately.</p>
              <label className="home-field">Category<select value={draft.category} onChange={e=>change('category',e.target.value)}>{[...new Set([...categories,draft.category])].map(c=><option key={c}>{c}</option>)}</select></label>
              <label className="home-field">Merchant or description (optional)<input maxLength={200} value={draft.description} onChange={e=>change('description',e.target.value)}/></label>
              {showNotes?<label className="home-field">Notes (optional)<textarea maxLength={1000} rows={3} value={draft.notes} onChange={e=>change('notes',e.target.value)}/></label>:<button type="button" className="home-text-button ae-note" onClick={()=>setShowNotes(true)}>+ Add a note</button>}
            </fieldset>}
            <div className="ae-receipt">
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={attach} className="sr-only" tabIndex={-1} aria-label="Receipt file" disabled={busy}/>
              {!file&&!existing?<button type="button" disabled={busy} className="home-secondary w-full" onClick={()=>input.current?.click()}><Paperclip size={18}/> {mode==='ai'?'Choose receipt':'Attach receipt (optional)'}</button>:<><div className="home-row">{preview&&<img src={preview} alt="Selected receipt preview" className="ae-thumbnail"/>}<p>{file?(file.type==='application/pdf'?'PDF receipt attached':'Photo attached'):'Saved receipt attached'}</p><button type="button" disabled={busy} className="home-text-button" onClick={()=>{setFile(null);setExisting(null);setRetain(false);attached.current=null;}}>Remove</button></div><label className="ae-checkbox"><input type="checkbox" checked={retain} disabled={busy} onChange={e=>setRetain(e.target.checked)}/>Save receipt to my records</label><p className="home-muted text-xs">{retain?(isGuest?'Receipt stays on this device only. Clearing browser data removes it.':'Receipt is retained with this expense until you remove it.'):'The receipt will not be saved to your records.'}</p></>}
              <p className="home-muted text-xs mt-2">Photo, screenshot or PDF · Up to 8 MB{mode==='ai'?' · 4 pages maximum':''}</p>
            </div>
            {review&&<label className="ae-checkbox"><input type="checkbox" disabled={busy} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I checked these details against the receipt</label>}
            {error&&<p role="alert" className="home-error">{error}</p>}
            {isGuest&&<p className="home-muted text-sm">Guest records are saved on this device only.</p>}
          </div>
          <footer className="qe-footer">{mode==='ai'&&!review?<><button type="button" className="home-primary w-full" disabled={busy||!file||!canScan} onClick={scan}>{phase==='extracting'?'Reading receipt…':'Extract for review'}</button><button type="button" className="home-text-button w-full ae-note" disabled={busy} onClick={()=>setMode('manual')}>Enter manually for free</button></>:<button type="submit" className="home-primary w-full" disabled={busy || (review&&!reviewed)}>{phase==='saving'?'Saving…':confirmExpected?'Record expense':initialExpense?'Save changes':review?'Confirm and save expense':'Save expense'}</button>}<p className="home-muted text-xs" role="status">{busy?(phase==='saving'?'Saving your record. Please keep this open.':'Reading fields. You’ll review them next.'):'A saved expense is a record, not a confirmed payment.'}</p></footer>
        </form>}
      </Dialog.Panel>
    </div></Dialog>;
}
