import React,{useState} from 'react';
import {Dialog} from '@headlessui/react';
import {motion,useReducedMotion} from 'framer-motion';
import {X,ChevronDown,Pencil,Trash2} from 'lucide-react';
import {money,summarizeDay} from '../features/home/homeModel';
import '../styles/day-record.css';

const formattedDate=date=>new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const valueFor=(log,model)=>model==='per_day'?[Number(log.quantity??log.stops??1)===0?'No':'Yes','Worked']:model==='hourly'?[log.hours??log.quantity,'Hours']:model==='per_mile'?[log.miles??log.quantity,'Miles']:[log.stops??log.quantity,'Stops'];
export default function DayRecordSheet({log,onClose,onEdit,onDelete,hidden=false,duplicate=false}){
 const [confirmDelete,setConfirmDelete]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const reducedMotion=useReducedMotion();
 if(!log)return null;
 const day=summarizeDay(log,[]);
 const [quantity,label]=valueFor(log,day?.model||log.payModel);
 const showMoney=value=>hidden?'••••':Number.isFinite(Number(value))?money(value):'Unavailable';
 async function remove(){
   if(busy)return;
   setBusy(true);setError('');
   try{await onDelete(log);onClose();}
   catch(_){setError('This day could not be deleted. Please try again.')}
   finally{setBusy(false)}
 }
 return <Dialog open onClose={()=>{if(!busy)onClose()}} className="drs-root">
  <div className="drs-backdrop" aria-hidden="true"/>
  <div className="drs-position">
   <Dialog.Panel as={motion.div} initial={reducedMotion?false:{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{duration:reducedMotion?0:0.2}} className="home-screen drs-panel">
    <header className="drs-header">
     <div><p className="home-muted text-sm">Saved workday</p><Dialog.Title className="drs-title">{formattedDate(log.date)}</Dialog.Title></div>
     <button className="home-icon" onClick={onClose} disabled={busy} aria-label="Close day details"><X/></button>
    </header>
    <div className="drs-content">
      <section className="drs-hero" aria-label="Saved day summary">
       <div><p className="home-muted text-sm">Estimated gross</p><strong className="drs-total">{day?.unavailable?'Unavailable':showMoney(day?.gross)}</strong><p className="home-muted text-xs">Before contractor fees, expenses and personal tax</p></div>
       <div className="drs-stats">
        <div><strong>{quantity??'—'}</strong><span>{label}</span></div>
        {log.totalParcels!=null&&<div><strong>{log.totalParcels}</strong><span>Parcels</span></div>}
        {day?.excess!=null&&<div><strong>{day.excess}</strong><span>Excess</span></div>}
       </div>
      </section>
      {(log.extraWork||Number(log.extra)>0||log.extraType)&&<div className="drs-line"><span>Extra work{log.extraType?' · '+log.extraType:''}</span><strong>{showMoney(log.extra||0)}</strong></div>}
      {log.notes&&<section className="drs-note"><h3>Notes</h3><p>{log.notes}</p></section>}
      {!day?.unavailable&&<details className="drs-breakdown"><summary>See earnings breakdown <ChevronDown size={18} aria-hidden="true"/></summary>
       <dl><div><dt>Gross earnings</dt><dd>{showMoney(day.gross)}</dd></div>
        <div><dt>Contractor fee{day.feeRate!=null?' ('+day.feeRate+'%)':''}</dt><dd>{day.fee!=null?showMoney(-day.fee):'Not recorded'}</dd></div>
        <div><dt>After contractor fee</dt><dd>{day.afterFee!=null?showMoney(day.afterFee):'Not available'}</dd></div></dl>
       <p className="home-muted text-xs">Expenses are recorded separately under Records. Older saved pay rates are not recalculated.</p>
      </details>}
      {duplicate&&<p className="home-banner" role="alert">More than one entry exists for this date. Review the records before editing.</p>}
      {error&&<p role="alert" className="home-error">{error}</p>}
    </div>
    <footer className="drs-footer">
      <button className="home-primary w-full" disabled={busy||duplicate} onClick={onEdit}><Pencil size={18}/>Edit this day</button>
      <button className="home-text-button drs-delete" onClick={()=>setConfirmDelete(v=>!v)} disabled={busy}><Trash2 size={16}/>Delete record</button>
      {confirmDelete&&<div className="drs-confirm" role="group" aria-label="Confirm deletion"><p>Delete this saved day? Any checked pay period will need reviewing.</p><div><button className="home-secondary" disabled={busy} onClick={()=>setConfirmDelete(false)}>Keep day</button><button className="home-secondary home-error" disabled={busy} onClick={remove}>{busy?'Deleting…':'Confirm delete'}</button></div></div>}
    </footer>
   </Dialog.Panel>
  </div>
 </Dialog>;
}
