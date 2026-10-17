import React,{useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {Eye,EyeOff,Plus,ChevronRight,ClipboardList,MapPin,Receipt,CheckCircle2,ChevronDown} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {useData} from '../contexts/DataContext';
import DailyQuickEntry from './DailyQuickEntry';
import DayRecordSheet from './DayRecordSheet';
import HomeExpenseDialog from './HomeExpenseDialog';
import useExpenses from '../hooks/useExpenses';
import {getPeriodForDate,isoDate} from '../features/payperiod/periods';
import {money,summarizeDay} from '../features/home/homeModel';
import {moneySummary} from '../features/money/moneyModel';
import {trackProductEvent as track} from '../services/productAnalytics';
import '../styles/home.css';
import '../styles/customer-home.css';

const shortDate=value=>new Date(value+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const fullDate=value=>new Date(value+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'});
const readHidden=()=>{try{return localStorage.getItem('home-hide-money')==='1'}catch(_){return false}};
const quantityFor=(log,model)=>model==='per_day'?Number(log?.quantity??log?.stops??1)?'Worked':'Not worked':model==='hourly'?`${log?.hours??log?.quantity??'—'} hours`:model==='per_mile'?`${log?.miles??log?.quantity??'—'} miles`:`${log?.stops??log?.quantity??'—'} stops`;
export default function SimpleDashboard(){
 const {user}=useAuth();
 const {logs=[],loading,loadError,forceSync,paymentConfig,payPeriodAnchor,periodRecords={},updateLogs,lastSaveStatus}=useData();
 const costs=useExpenses();
 const navigate=useNavigate();
 const location=useLocation();
 const [now,setNow]=useState(()=>new Date());
 const [hidden,setHidden]=useState(readHidden);
 const [entryDate,setEntryDate]=useState(()=>isoDate(new Date()));
 const [quickOpen,setQuickOpen]=useState(false);
 const [expenseOpen,setExpenseOpen]=useState(false);
 const [selectedId,setSelectedId]=useState(null);
 const [notice,setNotice]=useState('');
 const [showCalculation,setShowCalculation]=useState(false);
 const [offline,setOffline]=useState(()=>!navigator.onLine);
 const today=isoDate(now);
 const todayRows=logs.filter(r=>r.date===today);
 const todayLog=todayRows[0];
 const day=summarizeDay(todayLog,costs.expenses||[]);
 const model=day?.model||paymentConfig?.model;
 const period=useMemo(()=>payPeriodAnchor?getPeriodForDate(payPeriodAnchor,now):null,[payPeriodAnchor,now]);
 const periodInfo=useMemo(()=>period?moneySummary(logs,costs.expenses||[],period):null,[logs,costs.expenses,period?.start,period?.end]);
 const periodRecord=period?periodRecords[period.id]:null;
 const periodStatus=periodRecord?.needsReview?'Needs recheck':periodRecord?.status==='reconciled'?'Reconciled':periodRecord?.payoutComparison?'Statement checked':period?.end<today?'Ready to check':'In progress';
 const selected=logs.find(r=>r.id===selectedId)||null;
 const currentDays=logs.filter(r=>r.date<today).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
 const cash=value=>hidden?'••••':money(value);
 const moneyPence=value=>value==null?'Unavailable':cash(value/100);
 const hasPeriodData=periodInfo&&periodInfo.rows.length>0;
 const periodTotalReady=hasPeriodData&&!loading&&!loadError&&!costs.loading&&!costs.error&&periodInfo.payout!=null;
 const hour=now.getHours();
 const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
 const firstName=user?.displayName?.split(' ')[0]||'Driver';
 const goRecords=()=>{track('records_opened',{source:'home'});navigate('/app/records')};
 const goPay=()=>{track('check_pay_opened',{source:'home'});navigate('/app/check-pay',period?{state:{periodId:period.id,start:period.start,end:period.end}}:{})};
 const goPeriods=()=>navigate('/app/periods');
 function openEntry(date=today){setEntryDate(date);setQuickOpen(true);track('quick_entry_opened',{source:'home',mode:logs.some(r=>r.date===date)?'edit':'new'})}
 function reviewRecord(row){if(!row)return;if(logs.filter(r=>r.date===row.date).length>1){goRecords();return}setSelectedId(row.id)}
 async function deleteRecord(row){const result=await updateLogs(logs.filter(r=>r.id!==row.id),{strict:true});if(result?.success===false)throw new Error('Save rejected');setSelectedId(null);setNotice('Saved day deleted. Any previous pay checks may need reviewing.')}
 function toggleHidden(){const next=!hidden;setHidden(next);try{localStorage.setItem('home-hide-money',next?'1':'0')}catch(_){}}
 useEffect(()=>{
   const refresh=()=>{setNow(new Date());setOffline(!navigator.onLine)};
   const timer=setInterval(refresh,60000);
   window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('offline',refresh);
   return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('offline',refresh)}
 },[]);
 useEffect(()=>{if(!loading)track('home_viewed',{state:loadError?'error':todayLog?'saved':'empty'})},[loading,loadError,!!todayLog]);
 useEffect(()=>{if(location.state?.walkthrough)setShowCalculation(false)},[location.state?.walkthrough]);
 return <div className="home-screen customer-home">
   <header className="customer-home-header">
     <div className="home-row">
       <p className="customer-date">{now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</p>
       <div className="customer-header-actions">
         <button className="home-icon" onClick={toggleHidden} aria-label={hidden?'Show monetary amounts':'Hide monetary amounts'} aria-pressed={hidden}>{hidden?<EyeOff/>:<Eye/>}</button>
         <button className="customer-avatar" aria-label="Open profile" onClick={()=>navigate('/app/profile')}>{firstName[0]?.toUpperCase()||'D'}</button>
       </div>
     </div>
     <h1>{greeting}, {firstName}</h1>
     <p className="home-muted">Here's where your work stands.</p>
   </header>
   {(offline||lastSaveStatus==='local'||costs.pending)&&<p role="status" className="home-banner">{offline?'Offline · showing available records':'Changes saved on this device · waiting to sync'}</p>}
   {notice&&<p role="status" className="home-banner">{notice}</p>}
   <div className="customer-home-grid">
     <section className="customer-today home-card" aria-labelledby="today-title" aria-busy={loading}>
       <div className="home-row"><h2 id="today-title">Today</h2><span className="home-badge">{loading?"Loading":loadError?"Unavailable":todayLog?"Saved":"Not logged yet"}</span></div>
       {loading?<div className="home-skeleton" role="status" aria-label="Loading today's work"/>:
       loadError?<div className="customer-home-error" role="alert"><p>{loadError}</p><button className="home-secondary" onClick={forceSync}>Retry loading records</button></div>:
       todayLog&&!day?.unavailable?<>
         <p className="customer-money-label">Your earnings after contractor fee</p>
         <strong className="customer-today-money" aria-label="Today estimated earnings">{day.afterFee==null?'Fee not recorded':cash(day.afterFee)}</strong>
         <p className="home-muted text-xs">Before your expenses and personal tax</p>
         <div className="customer-today-metrics">
           <div><strong>{quantityFor(todayLog,model)}</strong><span>Work recorded</span></div>
           {todayLog.totalParcels!=null&&<div><strong>{todayLog.totalParcels}</strong><span>Parcels</span></div>}
           {(todayLog.extraWork||Number(todayLog.extra)>0)&&<div><strong>{hidden?'••••':cash(Number(todayLog.extra)||0)}</strong><span>Extra work</span></div>}
         </div>
         {todayRows.length>1&&<p role="alert" className="home-banner">Multiple entries for today. Review them in Records.</p>}
         {day.fee==null&&<p className="home-muted text-xs">No contractor fee was saved with this entry. Its original gross remains unchanged.</p>}
         <button data-tour="log-work" className="home-primary customer-main-action" onClick={()=>reviewRecord(todayLog)}>
           <CheckCircle2 size={19}/>View today's record<ChevronRight size={18}/>
         </button>
         <button className="customer-calculation-toggle" aria-expanded={showCalculation} aria-controls="home-calculation" onClick={()=>setShowCalculation(v=>!v)}>View calculation <ChevronDown size={18} aria-hidden="true" className={showCalculation?'rotate-180':''}/></button>
         {showCalculation&&<dl className="customer-calculation" id="home-calculation">
           <div><dt>Gross earnings</dt><dd>{cash(day.gross)}</dd></div>
           <div><dt>Contractor fee{day.feeRate!=null?` (${day.feeRate}%)`:''}</dt><dd>{day.fee!=null?cash(-day.fee):'Not recorded'}</dd></div>
           <div><dt>Personal expenses and recorded charges</dt><dd>{costs.loading?'Loading…':costs.error?'Unavailable':cash(-day.expenses)}</dd></div>
           <div><dt>After recorded costs</dt><dd>{costs.loading?'Loading…':costs.error?'Unavailable':day.takeHome!=null?cash(day.takeHome):'Unavailable'}</dd></div>
         </dl>}
         {costs.error&&<p role="alert" className="home-banner">Expenses are temporarily unavailable. <button className="home-text-button" onClick={costs.retry}>Retry</button></p>}
       </>:<>
         <div className="customer-empty-day">
           <h3>{todayLog?'Review your saved entry':'Ready to record today’s work?'}</h3>
           <p className="home-muted">{todayLog?'The saved earnings cannot be calculated. You can still review the work you recorded.':'Record your stops, parcels and any extra work.'}</p>
         </div>
         <button data-tour="log-work" className="home-primary customer-main-action" onClick={()=>todayLog?reviewRecord(todayLog):openEntry()}><Plus size={20}/>{todayLog?'View today’s record':'Log your day'}<ChevronRight size={18}/></button>
       </>}
     </section>
     <section className="home-card customer-period" aria-labelledby="period-title">
       <div className="home-row"><h2 id="period-title">Current pay period</h2><span className="home-badge">{period?periodStatus:'Not set'}</span></div>
       <p className="home-muted text-sm">{period?`${shortDate(period.start)} – ${shortDate(period.end)}`:'Set up your four-week period in Profile'}</p>
       <p className="customer-money-label">Expected contractor payout</p>
       <strong className="customer-period-money">{loading||costs.loading?'Loading…':loadError||costs.error?'Unavailable':periodTotalReady?moneyPence(periodInfo.payout):hasPeriodData?'Needs complete records':'No work logged yet'}</strong>
       <p className="home-muted text-xs">After contractor fees and charges · Before personal expenses and tax</p>
       {hasPeriodData&&<p className="home-muted text-xs">{periodInfo.rows.length} {periodInfo.rows.length===1?'day':'days'} recorded this period</p>}
       <button className="home-secondary customer-period-cta" onClick={period?goPay:goPeriods}>{period?'Check your statement':'Set pay-period dates'}<ChevronRight size={18}/></button>
     </section>
     <section className="home-card customer-recent">
       <div className="home-row"><h2>Recent work</h2><button className="customer-header-link" onClick={goRecords}>See all <ChevronRight size={16}/></button></div>
       {loading?<p className="home-muted text-sm">Loading your history…</p>:loadError?<p className="home-muted text-sm">Your work history is unavailable.</p>:currentDays.length?currentDays.map((row,index)=><button className="customer-recent-row" key={row.id||row.date+'-'+index} onClick={()=>reviewRecord(row)}>
         <span><strong>{fullDate(row.date)}</strong><small>{quantityFor(row,row.payStructureSnapshot?.model||row.payModel)}{row.totalParcels!=null?` · ${row.totalParcels} parcels`:''}</small></span>
         <span className="customer-recent-earnings">{row.total!=null&&Number.isFinite(Number(row.total))?cash(Number(row.total)):'Unavailable'}<small>Gross</small></span><ChevronRight size={18} aria-hidden="true"/></button>):<p className="home-muted text-sm">Your previously logged days will appear here.</p>}
     </section>
     <section className="customer-tools" aria-label="Quick tools">
       <h2>Quick tools</h2>
       <div className="customer-tools-grid">
         <button className="customer-tool" onClick={goRecords}><span className="customer-tool-icon"><ClipboardList size={21}/></span><strong>Records</strong><small>Saved days</small></button>
         <button className="customer-tool" onClick={()=>{track('expense_opened',{source:'home'});setExpenseOpen(true)}}><span className="customer-tool-icon"><Receipt size={21}/></span><strong>Expenses</strong><small>Track costs</small></button>
         <button className="customer-tool" onClick={()=>navigate('/app/routes')}><span className="customer-tool-icon"><MapPin size={21}/></span><strong>Routes</strong><small>Plan stops</small></button>
       </div>
     </section>
   </div>
   <DayRecordSheet log={selected} hidden={hidden} duplicate={selected?logs.filter(r=>r.date===selected.date).length>1:false} onClose={()=>setSelectedId(null)} onEdit={()=>{const d=selected.date;setSelectedId(null);openEntry(d)}} onDelete={deleteRecord}/>
   {createPortal(<DailyQuickEntry open={quickOpen} initialDate={entryDate} onDateChange={setEntryDate} onClose={()=>setQuickOpen(false)} onSaved={(_record,result)=>{setQuickOpen(false);setNotice(user?.isGuest?'Saved on this device · guest record':result?.isOnline===false?'Saved on this device · waiting to sync':'Work saved')}}/>,document.body)}
   {expenseOpen&&<HomeExpenseDialog open onClose={()=>setExpenseOpen(false)} save={costs.save} isGuest={user?.isGuest}/>}
 </div>;
}