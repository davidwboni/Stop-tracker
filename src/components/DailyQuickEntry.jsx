import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Package, Plus, Minus, X, Briefcase, Check } from "lucide-react";
import { useData } from "../contexts/DataContext";
import { PAY_MODELS } from "../features/payperiod/payStructure";
import { grossForEntry } from "../features/home/homeModel";
import { trackProductEvent } from "../services/productAnalytics";
import { Money } from "./ui/money";
const localISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
export default function DailyQuickEntry({open,onClose,onSaved,initialDate,onDateChange}){
 const {logs=[],updateLogs,paymentConfig}=useData(); const [stops,setStops]=useState(""); const [extraWork,setExtraWork]=useState(false); const [extraType,setExtraType]=useState("Collection"); const [extraAmount,setExtraAmount]=useState(""); const [notes,setNotes]=useState(""); const [saving,setSaving]=useState(false); const [error,setError]=useState(""); const today=localISO();
 const entryDate=initialDate||today;
 const existing = logs.find(l => l.date === entryDate);
 const [totalParcels, setTotalParcels] = useState('');
 const [miles, setMiles] = useState('');
 const config = existing?.payStructureSnapshot || paymentConfig;
 const meta = PAY_MODELS.find(m => m.id === config?.model) || PAY_MODELS[0];
 const parcelsRelevant = ['flat_stops', 'tiered_stops', 'sliding_scale'].includes(config?.model) && Number(config?.excessParcelRate) > 0;
 useEffect(() => {
   if (!open) return;
   setStops(existing ? String(existing.quantity ?? existing.stops ?? '') : '');
   setTotalParcels(existing?.totalParcels == null ? '' : String(existing.totalParcels));
   setMiles(existing?.miles == null ? '' : String(existing.miles));
   setExtraWork(Number(existing?.extra) > 0 || !!existing?.extraType);
   setExtraAmount(existing?.extra == null ? '' : String(existing.extra));
   setExtraType(existing?.extraType || 'Collection');
   setNotes(existing?.notes || ''); setError('');
 // Only initialize when opening or changing the selected date, never overwrite typed values.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [open, entryDate]);
 const expected=useMemo(()=>grossForEntry(config,{quantity:Number(stops)||0,miles:Number(miles)||0,totalParcels:parcelsRelevant?totalParcels:'',extra:extraWork?(Number(extraAmount)||0):0}),[config,stops,miles,totalParcels,parcelsRelevant,extraWork,extraAmount]);
 const adjust=n=>setStops(String(Math.min(meta.primary.field==='day'?1:Infinity,Math.max(0,(Number(stops)||0)+n))));
 const save=async()=>{
   const qty=Number(stops), extra=extraWork?Number(extraAmount || 0):0;
   if(!entryDate || entryDate > today){setError('Choose today or an earlier date.');return;}
   if(!Number.isFinite(qty)||qty<0||stops===''){setError('Enter your work quantity first.');return;}
   if(meta.primary.field==='stops' && !Number.isInteger(qty)){setError('Stops must be a whole number.');return;}
   if(meta.primary.field==='day' && ![0,1].includes(qty)){setError('Choose 1 for worked or 0 for not worked.');return;}
   if(!Number.isFinite(extra)||extra<0){setError('Enter a valid extra amount.');return;}
   if(parcelsRelevant && totalParcels!=='' && (!Number.isInteger(Number(totalParcels)) || Number(totalParcels)<qty)){setError('Total parcels must be a whole number at least as large as stops. Leave it blank if unknown.');return;}
   if(config.model==='sliding_scale' && (miles==='' || !Number.isFinite(Number(miles)) || Number(miles)<0)){setError('Enter miles for your sliding rate.');return;}
   setSaving(true);setError('');
   try {
     // Existing records without a rate snapshot retain their original gross on a no-op save.
     const sameValues = existing && Number(existing.quantity ?? existing.stops)===qty && Number(existing.extra||0)===extra && String(existing.totalParcels ?? '')===totalParcels && String(existing.miles ?? '')===miles;
     const total = existing && !existing.payStructureSnapshot && sameValues ? existing.total : expected;
     const newLog={...existing,id:existing?.id || crypto.randomUUID(),date:entryDate,stops:meta.primary.field==='stops'?qty:0,quantity:qty,miles:Number(miles)||0,extra,total,notes:extraWork?notes:'',extraType:extraWork?extraType:null,payModel:config.model,timestamp:new Date().toISOString()};
     if (parcelsRelevant && totalParcels!=='') newLog.totalParcels=Number(totalParcels); else delete newLog.totalParcels;
     if (!existing || existing.payStructureSnapshot || !sameValues) newLog.payStructureSnapshot=JSON.parse(JSON.stringify(config));
     await updateLogs([newLog,...logs.filter(l=>l.date!==entryDate)].sort((a,b)=>b.date.localeCompare(a.date)));
     trackProductEvent('daily_entry_saved',{mode:existing?'edit':'new',source:'home'});
     onSaved?.(newLog);
   }catch(e){setError("Couldn't save. Your entry is still here — please try again.");}finally{setSaving(false);}
 };
 return <AnimatePresence>{open&&<Dialog as={motion.div} open={open} onClose={() => !saving && onClose()} className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Dialog.Panel as={motion.div} aria-label="Quick entry" className="max-h-[calc(100dvh-24px)] w-full max-w-md overflow-y-auto rounded-[28px] border border-[#27324a] bg-[#0d1422] p-5 shadow-2xl sm:p-6" initial={{y:36,opacity:0,scale:.98}} animate={{y:0,opacity:1,scale:1}} exit={{y:28,opacity:0}} transition={{type:"spring",damping:28,stiffness:320}}>
 <div className="flex items-start justify-between gap-3"><div className="flex-1"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#69758d]">{entryDate===today?"TODAY":"PAST ENTRY"}</p><h2 className="mt-1 text-xl font-bold">{existing?'Edit work':'Log work'}</h2>{entryDate!==today&&<label className="mt-3 block text-xs text-[#8e9ab2]">Entry date<input type="date" max={today} value={entryDate} onChange={e=>onDateChange?.(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-sm text-white outline-none focus:border-[#7567ff]"/></label>}</div><button disabled={saving} onClick={onClose} aria-label="Not now" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#2a3550] bg-[#131c2d] text-[#9aa6bd]"><X/></button></div>
 <div className="mt-4 rounded-2xl border border-[#26314a] bg-[#111827] p-4"><div className="flex items-center justify-between"><div className="text-sm font-semibold">{meta.primary.label}</div><div className="text-xs text-[#7f8ba3]">{new Date(entryDate+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</div></div><div className="mt-3 flex items-center gap-3"><button aria-label="Decrease quantity" onClick={()=>adjust(-1)} className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#182238] text-[#aeb8ca]"><Minus/></button><input aria-label={meta.primary.label} inputMode="decimal" type="number" min="0" max={meta.primary.field==='day'?1:undefined} value={stops} onChange={e=>setStops(e.target.value)} placeholder="0" className="h-16 min-w-0 flex-1 rounded-2xl border border-[#34415f] bg-[#0a101b] text-center text-3xl font-bold tabular-nums outline-none focus:border-[#7567ff] focus:ring-2 focus:ring-[#7567ff]/20"/><button aria-label="Increase quantity" onClick={()=>adjust(1)} className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#182238] text-[#aeb8ca]"><Plus/></button></div>{Number(stops)>0&&<div className="mt-3 text-center text-xs text-[#8e9ab2]">Expected today <strong className="ml-1 text-emerald-400"><Money amount={expected}/></strong></div>}</div>
 {meta.primary.field==='day'&&<p className="mt-2 text-sm text-[#8e9ab2]">1 = worked today · 0 = did not work</p>}
 {parcelsRelevant&&<label className="mt-3 block text-sm text-[#8e9ab2]">Total parcels (optional)<input inputMode="numeric" value={totalParcels} onChange={e=>setTotalParcels(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-base text-white"/><span className="block mt-1">{totalParcels===''?'Leave blank if unknown. Parcel earnings are excluded until recorded.':`Excess parcels: ${Math.max(0,Number(totalParcels)-Number(stops))}`}</span></label>}
 {config.model==='sliding_scale'&&<label className="mt-3 block text-sm text-[#8e9ab2]">Miles driven<input inputMode="decimal" value={miles} onChange={e=>setMiles(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-base text-white"/></label>}
 {existing&&!existing.payStructureSnapshot&&<p className="mt-3 text-sm text-amber-300">This older entry has no saved rates. Changing its work quantity or extras recalculates earnings using your current pay structure.</p>}
 <div className="mt-3 overflow-hidden rounded-2xl border border-[#26314a] bg-[#111827]"><button type="button" onClick={()=>setExtraWork(v=>!v)} className="flex min-h-[64px] w-full items-center gap-3 p-4 text-left"><Briefcase className="h-5 w-5 text-[#8f83ff]"/><span className="flex-1"><span className="block text-sm font-semibold">Did you do any extra work today?</span><span className="block text-xs text-[#7f8ba3]">Collections, returns or another paid job</span></span><span className={`grid h-7 w-7 place-items-center rounded-lg border ${extraWork?"border-emerald-400 bg-emerald-400 text-[#07110e]":"border-[#46516a] bg-[#0a101b]"}`}>{extraWork&&<Check className="h-4 w-4"/>}</span></button><AnimatePresence>{extraWork&&<motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden"><div className="space-y-3 border-t border-[#26314a] p-4"><label className="block text-xs text-[#8e9ab2]">Type of extra work<select value={extraType} onChange={e=>setExtraType(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-sm text-white"><option>Collection</option><option>Return</option><option>Extra route</option><option>Other</option></select></label><label className="block text-xs text-[#8e9ab2]">Extra amount (£)<input inputMode="decimal" value={extraAmount} onChange={e=>setExtraAmount(e.target.value)} placeholder="0.00" className="mt-1 h-12 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-base text-white outline-none focus:border-[#7567ff]"/></label><label className="block text-xs text-[#8e9ab2]">Notes <span className="text-[#5f6a80]">(optional)</span><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What did you do?" className="mt-1 h-12 w-full rounded-xl border border-[#34415f] bg-[#0a101b] px-3 text-sm text-white outline-none focus:border-[#7567ff]"/></label></div></motion.div>}</AnimatePresence></div>
 {error&&<p className="mt-3 text-sm text-red-400">{error}</p>}<button onClick={save} disabled={saving||!stops} className="mt-4 h-14 w-full rounded-2xl bg-gradient-to-r from-[#6657f5] to-[#806cff] text-base font-bold text-white shadow-lg shadow-[#7567ff]/20 disabled:opacity-40">{saving?"Saving…":Number(stops)>0?`Save · ${expected.toLocaleString("en-GB",{style:"currency",currency:"GBP"})}`:"Save entry"}</button><button disabled={saving} onClick={onClose} className="mt-2 h-10 w-full text-xs font-medium text-[#7f8ba3]">Not now</button>
 </Dialog.Panel></Dialog>}</AnimatePresence>;
}