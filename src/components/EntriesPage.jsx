import React,{useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ChevronRight,Plus,Search,ArrowLeft} from 'lucide-react';
import {useData} from '../contexts/DataContext';
import DailyQuickEntry from './DailyQuickEntry';
import DayRecordSheet from './DayRecordSheet';
import PreviousWorkImport from './PreviousWorkImport';
import {money,summarizeDay} from '../features/home/homeModel';
import {isoDate} from '../features/payperiod/periods';

function workLabel(r){
 const model=r.payStructureSnapshot?.model||r.payModel;
 const [quantity,unit]=model==='per_day'?[Number(r.quantity??r.stops??1)?'Worked':'Not worked','day']:model==='hourly'?[r.hours??r.quantity,'hours']:model==='per_mile'?[r.miles??r.quantity,'miles']:[r.stops??r.quantity,'stops'];
 return model==='per_day'?quantity:`${quantity??'—'} ${unit}`;
}
const displayDate=date=>new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const moneyPreference=()=>{try{return localStorage.getItem('home-hide-money')==='1'}catch(_){return false}};
export default function EntriesPage({privacyHidden}){
 const {logs=[],loading,loadError,updateLogs}=useData();
 const loc=useLocation();
 const needsPayReview=new URLSearchParams(loc.search).get('payReview')==='1';
 const periodId=loc.state?.periodId;
 const reviewRange=needsPayReview&&/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(periodId||'')?periodId.split('_'):null;
 const [query,setQuery]=useState('');
 const [from,setFrom]=useState('');
 const [to,setTo]=useState('');
 const [editing,setEditing]=useState(null);
 const [selectedId,setSelectedId]=useState(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [importOpen,setImportOpen]=useState(()=>new URLSearchParams(loc.search).get('import')==='1');
 const [page,setPage]=useState(0);
 const [localHidden]=useState(moneyPreference);
 const hidden=privacyHidden??localHidden;
 const missingPay=r=>{const day=summarizeDay(r);return !day||day.unavailable||day.fee==null;};
 const rows=logs.filter(r=>(!needsPayReview||(!!reviewRange&&r.date>=reviewRange[0]&&r.date<=reviewRange[1]&&missingPay(r)))&&(!from||r.date>=from)&&(!to||r.date<=to)&&(!query||`${r.date} ${r.stops??''} ${r.notes||''}`.toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>b.date.localeCompare(a.date));
 const perPage=10,maxPage=Math.max(0,Math.ceil(rows.length/perPage)-1),currentPage=Math.min(page,maxPage),pagedRows=rows.slice(currentPage*perPage,(currentPage+1)*perPage);
 const selected=logs.find(r=>r.id===selectedId)||null;
 const duplicate=selected?logs.filter(r=>r.date===selected.date).length>1:false;
 async function importPrevious(rows){
  if(!rows?.length)return;
  const existing=new Set(logs.map(row=>row.date));
  if(rows.some(row=>existing.has(row.date)))throw new Error('Import conflicts with already recorded dates.');
  const now=new Date().toISOString();
  const imported=rows.map(row=>({...row,id:crypto.randomUUID(),timestamp:now,notes:'Imported from driver-provided work CSV'}));
  await updateLogs([...logs,...imported].sort((a,b)=>b.date.localeCompare(a.date)));
 }
 async function remove(row){
  setBusy(true);setError('');
  try{
   const result=await updateLogs(logs.filter(r=>r.id!==row.id),{strict:true});
   if(result?.success===false)throw new Error('Delete rejected');
   setSelectedId(null);
  }catch(_){
   setError('Could not delete this record. Please try again.');
   throw _;
  }finally{setBusy(false)}
 }
 const updateFilter=(setter,value)=>{setter(value);setPage(0)};
 return <div className="home-screen st-page work-records">
  <header className="home-row work-history-header"><div><h2>Your days</h2><p className="home-muted text-xs">{loading?'Loading days…':loadError?'Records unavailable':needsPayReview?`${rows.length} ${rows.length===1?'day needs':'days need'} pay details`:`${logs.length} ${logs.length===1?'day':'days'} recorded`}</p></div>
   <button className="home-primary" onClick={()=>setEditing(isoDate(new Date()))} disabled={loading||!!loadError}><Plus size={18}/>Add day</button>
  </header>
  {loc.state?.walkthrough?<div className="home-card" data-tour="entry-example"><h2>Example work day</h2><p>150 stops · 185 parcels</p><p className="home-muted">Temporary example; nothing is saved.</p></div>:<>
   {needsPayReview&&<div className="home-banner work-pay-review" role="status"><strong>Days needing pay details</strong><p className="home-muted text-sm">Open a day to review the correct historical pay rate or contractor fee. Saved work totals are not changed automatically.</p><Link className="home-text-button" to="/app/check-pay" state={loc.state?.periodId?{periodId:loc.state.periodId}:undefined}><ArrowLeft size={16}/> Back to Pay</Link></div>}
   {!needsPayReview&&<div className="work-import-action">
     {!importOpen?<button type="button" className="home-text-button" onClick={()=>setImportOpen(true)}>Have previous work records? Import your own CSV</button>:
       <PreviousWorkImport existing={logs} onImport={importPrevious} onClose={()=>setImportOpen(false)}/>}
   </div>}
   <details className="home-card work-search"><summary><Search size={17} aria-hidden="true"/> Find a day{from||to||query?' · Filters active':''}</summary>
    <label className="home-field">Search date, stops or notes<input value={query} onChange={e=>updateFilter(setQuery,e.target.value)}/></label>
    <div className="review-fields">
      <label className="home-field">From<input type="date" value={from} onChange={e=>updateFilter(setFrom,e.target.value)}/></label>
      <label className="home-field">To<input type="date" value={to} onChange={e=>updateFilter(setTo,e.target.value)}/></label>
    </div>
    {(from||to||query)&&<button type="button" className="home-text-button" onClick={()=>{setQuery('');setFrom('');setTo('');setPage(0)}}>Clear filters</button>}
   </details>
   {loading?<div className="home-skeleton" role="status" aria-label="Loading work history"/>:
   loadError?<p role="alert" className="home-banner">{loadError}</p>:
   rows.length?<div className="st-list work-entry-list" data-tour="entries-ledger">{pagedRows.map(r=>
     <article className="home-card day-record-card" key={r.id}>
      <button type="button" aria-label={`View work for ${displayDate(r.date)}`} onClick={()=>setSelectedId(r.id)} disabled={busy}>
       <span className="day-record-copy"><strong>{displayDate(r.date)}</strong><small>{workLabel(r)}{r.totalParcels!=null?` · ${r.totalParcels} parcels`:''}{r.extraWork||Number(r.extra)>0?' · Extra work':''}</small></span>
       <span className="day-record-total">{r.total!=null&&r.total!==''&&Number.isFinite(Number(r.total))?(hidden?'••••':money(Number(r.total))):'Unavailable'}<small>Gross · Estimated</small></span>
       <ChevronRight size={19} className="text-muted-foreground shrink-0" aria-hidden="true"/>
      </button>
     </article>
   )}</div>:
   <div className="st-empty"><h2>{needsPayReview?'No days need pay details':logs.length?'No matching days':'No work recorded yet'}</h2><p>{needsPayReview?'Return to Pay and try the comparison again.':'Tap Add day to start your work history.'}</p></div>}
  </>}
  {rows.length>perPage&&<nav aria-label="Work record pages" className="flex items-center justify-between gap-2">
   <button className="home-secondary" disabled={currentPage===0} onClick={()=>setPage(v=>Math.max(0,v-1))}>Previous</button>
   <span className="home-muted text-sm">Page {currentPage+1} of {maxPage+1}</span>
   <button className="home-secondary" disabled={currentPage===maxPage} onClick={()=>setPage(v=>Math.min(maxPage,v+1))}>Next</button>
  </nav>}
  {error&&<p role="alert" className="home-error">{error}</p>}
  <DayRecordSheet key={selected?.id||'closed'} log={selected} hidden={hidden} duplicate={duplicate} onClose={()=>setSelectedId(null)}
   onEdit={()=>{const date=selected.date;setSelectedId(null);setEditing(date)}} onDelete={remove}/>
  <DailyQuickEntry open={!!editing} initialDate={editing} onClose={()=>setEditing(null)} onSaved={()=>setEditing(null)}/>
 </div>;
}
