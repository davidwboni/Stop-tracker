import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Plus, ChevronRight, Repeat, Clock, X, Receipt } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import useExpenses from '../hooks/useExpenses';
import HomeExpenseDialog from './HomeExpenseDialog';
import { isoDate, listPeriods } from '../features/payperiod/periods';
import { money } from '../features/home/homeModel';
import { SOURCES, expenseSummary, recurringOccurrences } from '../features/expenses/expenseModel';
import { trackProductEvent as track } from '../services/productAnalytics';
import '../styles/home.css';
import '../styles/expenses.css';
const fmt=date=>new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const maskPreference=()=>{try{return localStorage.getItem('home-hide-money')==='1';}catch(_){return false;}};

export default function ExpensesOverview(){
  const {user}=useAuth();
  const {logs=[],payPeriodAnchor,periodRecords={}}=useData();
  const costs=useExpenses();
  const nav=useNavigate();
  const location=useLocation();
  const [hidden,setHidden]=useState(maskPreference);
  const [filter,setFilter]=useState('all');
  const [selectedPeriod,setSelectedPeriod]=useState(null);
  const [selected,setSelected]=useState(null);
  const [editor,setEditor]=useState(null);
  const [showExpected,setShowExpected]=useState(false);
  const today=isoDate(new Date());
  const periods=useMemo(()=>payPeriodAnchor?listPeriods(logs,payPeriodAnchor,13):[],[logs,payPeriodAnchor]);
  const currentMonth={id:'month',start:today.slice(0,7)+'-01',end:isoDate(new Date(new Date().getFullYear(),new Date().getMonth()+1,0))};
  const requested=location.state?.start&&location.state?.end?{...location.state,id:location.state.start+'_'+location.state.end}:null;
  const period=selectedPeriod||requested||periods[0]||currentMonth;
  const choices=periods.some(p=>p.start===period.start&&p.end===period.end)?periods:[period,...periods];
  const summary=expenseSummary(costs.expenses,period);
  const rows=summary.records.filter(e=>filter==='all'||e.source===filter);
  const upcoming=recurringOccurrences(costs.rules||[],costs.expenses,period);
  const cash=value=>hidden?'••••':money(value);
  const record=periodRecords[period.id];
  useEffect(()=>{track('expense_overview_viewed',{source:'money'});},[]);
  const toggleHidden=()=>{const next=!hidden;setHidden(next);try{localStorage.setItem('home-hide-money',next?'1':'0');}catch(_){}};
  const applyFilter=value=>{setFilter(value);track('expense_source_filtered',{filter:value});};
  return <div className="home-screen expense-page">
    <header className="home-row"><h1 className="text-3xl font-bold">Money</h1><div className="flex gap-2"><button className="home-icon" aria-label={hidden?'Show monetary amounts':'Hide monetary amounts'} aria-pressed={hidden} onClick={toggleHidden}>{hidden?<EyeOff/>:<Eye/>}</button><button className="home-icon" aria-label="Open profile" onClick={()=>nav('/app/profile')}>{user?.displayName?.[0]||'D'}</button></div></header>
    <nav className="expense-sections" aria-label="Money sections"><Link to="/app/money" state={period}>Overview</Link><Link to="/app/money/expenses" aria-current="page">Expenses</Link><Link to="/app/stats">Insights</Link></nav>
    <label className="home-field expense-period">{payPeriodAnchor?'Pay period':'This month'}<select aria-label="Expense period" value={period.id} onChange={e=>{setSelectedPeriod(choices.find(p=>p.id===e.target.value));setFilter('all');}}>{choices.map(p=><option key={p.id} value={p.id}>{fmt(p.start)} – {fmt(p.end)}{p.id===periods[0]?.id?' · Current':''}</option>)}</select></label>
    {!payPeriodAnchor&&<Link className="home-text-button" to="/app/periods">Set your pay-period dates</Link>}
    {costs.cached&&<p className="home-banner" role="status">Showing cached expense records{costs.pending?' · changes waiting to sync':''}.</p>}
    {record?.needsReview&&<p className="home-banner" role="status">Expenses changed after this period was checked. <Link to="/app/check-pay" state={{periodId:period.id}} className="underline">Recheck this period</Link></p>}
    <div className="expense-columns"><aside>
      <section className="home-card expense-summary" aria-busy={costs.loading}><h2>Recorded expenses</h2><p className="expense-total">{costs.loading?'…':costs.error?'Unavailable':cash(summary.total)}</p><p className="home-muted text-sm">Added to your records this period</p><dl className="expense-source-totals"><div><dd>{costs.loading?'…':costs.error?'—':cash(summary.contractor)}</dd><dt>Contractor charges</dt></div><div><dd>{costs.loading?'…':costs.error?'—':cash(summary.own)}</dd><dt>My expenses</dt></div></dl></section>
      <p className="home-muted text-xs mt-3">Your percentage contractor fee is shown in Overview.</p>
    </aside><section className="space-y-4">
      <div className="expense-filters" role="group" aria-label="Expense source">{[['all','All'],['contractor_charge','Contractor charges'],['my_expense','My expenses']].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>applyFilter(value)}>{label}</button>)}</div>
      <div className="home-row"><h2 className="font-bold text-lg">{filter==='all'?'Recent expenses':filter==='contractor_charge'?'Contractor charges':'My expenses'}</h2><span className="home-muted text-sm">{rows.length} {rows.length===1?'record':'records'}</span></div>
      {costs.error&&<div role="alert" className="home-banner">{costs.error}<button className="home-text-button underline ml-2" onClick={costs.retry}>Retry</button></div>}
      {costs.loading&&!rows.length?<div className="home-skeleton" role="status" aria-label="Loading expenses"/>:rows.length?<div className="expense-list" key={filter}>{rows.map(e=><button key={e.id} className="expense-row" onClick={()=>{setSelected(e);track('expense_record_opened',{source:'money'});}}><Receipt size={22} aria-hidden="true"/><span className="expense-row-copy"><strong>{e.description||e.category}</strong><small>{SOURCES[e.source]} · {fmt(e.date)}</small>{e.recurringRuleId&&<small className="expense-recurring"><Repeat size={14}/>Recurring</small>}</span><strong className="expense-row-amount">{cash(e.amount)}</strong><ChevronRight size={18}/></button>)}</div>:!costs.error&&<div className="home-card home-empty"><h3>{filter==='all'?'No expenses recorded this period':'No matching expenses'}</h3><p className="home-muted">{filter==='all'?'Add a cost below to keep your records complete.':'Choose All to see your other recorded costs.'}</p>{filter!=='all'&&<button className="home-text-button" onClick={()=>applyFilter('all')}>Show all expenses</button>}</div>}
      {!!upcoming.length&&!costs.error&&<button className="home-card expense-upcoming" onClick={()=>setShowExpected(true)}><Clock size={22}/><span><strong>Expected recurring {upcoming.length===1?'cost':'costs'}</strong><small>{upcoming[0].description||upcoming[0].category} · {fmt(upcoming[0].date)} · Not included above</small>{upcoming.length>1&&<small>{upcoming.length} expected costs in this period</small>}</span><strong>{cash(upcoming[0].amount)}</strong><ChevronRight size={18}/></button>}
    </section></div>
    <div className="expense-add-dock"><button className="home-primary w-full" disabled={costs.loading||!!costs.error} onClick={()=>{setEditor({});track('expense_opened',{source:'money'});}}><Plus/>Add expense</button></div>
    {editor&&<HomeExpenseDialog open isGuest={user?.isGuest} initialExpense={editor.id?editor:null} confirmExpected={!!editor.expectedConfirmation} save={async e=>{const {expectedConfirmation,...record}=e;await costs.save(record);}} onClose={()=>setEditor(null)}/>}
    {selected&&<ExpenseDetails expense={selected} costs={costs} hidden={hidden} onClose={()=>setSelected(null)} onEdit={()=>{setEditor(selected);setSelected(null);}}/>}
    {showExpected&&<Dialog open onClose={()=>setShowExpected(false)} className="relative z-[90]"><div className="fixed inset-0 bg-black/70"/><div className="home-dialog-position"><Dialog.Panel className="home-dialog home-screen"><div className="home-row"><Dialog.Title className="text-xl font-bold">Expected costs</Dialog.Title><button className="home-icon" aria-label="Close expected costs" onClick={()=>setShowExpected(false)}><X/></button></div><p className="home-muted my-3">Not included in recorded totals. Only record a cost once it has been charged. Check existing records first.</p>{upcoming.map(e=><div className="home-card space-y-2 mb-3" key={e.id}><strong>{e.description||e.category}</strong><p>{fmt(e.date)} · {cash(e.amount)}</p><button className="home-secondary w-full" onClick={()=>{setShowExpected(false);setEditor({...e,expectedConfirmation:true});}}>Review and record</button></div>)}</Dialog.Panel></div></Dialog>}
  </div>;
}

function ExpenseDetails({expense,costs,hidden,onClose,onEdit}){
  const [mode,setMode]=useState('view');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [frequency,setFrequency]=useState('four_weekly');
  const [nextDate,setNextDate]=useState('');
  async function perform(action){setBusy(true);setError('');try{await action();onClose();}catch(_){setError('Could not save this change. Your record is still available; please retry.');}finally{setBusy(false);}}
  return <Dialog open onClose={()=>!busy&&onClose()} className="relative z-[90]"><div className="fixed inset-0 bg-black/70"/><div className="home-dialog-position"><Dialog.Panel className="home-dialog home-screen space-y-4"><div className="home-row"><Dialog.Title className="text-xl font-bold">{expense.description||expense.category}</Dialog.Title><button className="home-icon" aria-label="Close expense details" disabled={busy} onClick={onClose}><X/></button></div><p className="home-muted">{SOURCES[expense.source]} · {fmt(expense.date)}</p><p className="text-3xl font-bold">{hidden?'••••':money(expense.amount)}</p><p className="home-muted text-sm">Recorded in your ledger. This does not confirm payment or reconciliation.</p>
    {mode==='view'&&<><button className="home-primary w-full" onClick={onEdit}>Edit expense</button>{!expense.recurringRuleId&&<button className="home-secondary w-full" onClick={()=>setMode('recurring')}>Save as recurring cost</button>}{expense.recurringRuleId&&<button className="home-secondary w-full" onClick={()=>setMode('stop')}>Stop future recurring costs</button>}<button className="home-secondary w-full" onClick={()=>setMode('delete')}>Delete expense</button></>}
    {mode==='stop'&&<><p role="alert">Stop expecting future costs? Existing expense records will remain.</p><button className="home-primary w-full" disabled={busy} onClick={()=>perform(()=>costs.stopRecurring(expense.recurringRuleId))}>{busy?'Saving…':'Confirm stop'}</button></>}
    {mode==='delete'&&<><p role="alert">Delete this recorded expense? Any checked period will need rechecking.{expense.recurringRuleId?' Its recurring schedule will remain.':''}</p><button className="home-primary w-full" disabled={busy} onClick={()=>perform(()=>costs.remove(expense))}>{busy?'Deleting…':'Confirm deletion'}</button></>}
    {mode==='recurring'&&<><p className="home-muted text-sm">This creates an expectation, not another expense. Future costs are recorded only after review.</p><label className="home-field">Repeat<select value={frequency} onChange={e=>setFrequency(e.target.value)}><option value="weekly">Weekly</option><option value="four_weekly">Every 4 weeks</option><option value="monthly">Monthly</option></select></label><label className="home-field">Next expected date<input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)}/></label><button className="home-primary w-full" disabled={busy||!nextDate} onClick={()=>perform(()=>costs.makeRecurring(expense,frequency,nextDate))}>{busy?'Saving…':'Confirm recurring cost'}</button></>}
    {mode!=='view'&&<button className="home-secondary w-full" disabled={busy} onClick={()=>setMode('view')}>Cancel</button>}{error&&<p role="alert" className="home-error">{error}</p>}
  </Dialog.Panel></div></Dialog>;
}
