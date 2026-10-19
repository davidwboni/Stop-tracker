import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Repeat, X, Receipt } from 'lucide-react';
import HeaderControls from './HeaderControls';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import useExpenses from '../hooks/useExpenses';
import HomeExpenseDialog from './HomeExpenseDialog';
import ExpenseReceiptPreview from './ExpenseReceiptPreview';
import { isoDate, listPeriods } from '../features/payperiod/periods';
import { money } from '../features/home/homeModel';
import { SOURCES, expenseSummary, recurringOccurrences } from '../features/expenses/expenseModel';
import { trackProductEvent as track } from '../services/productAnalytics';
import '../styles/home.css';
import '../styles/expenses.css';
const fmt=date=>new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const maskPreference=()=>{try{return localStorage.getItem('home-hide-money')==='1';}catch(_){return false;}};

export default function ExpensesOverview({privacyHidden}){
  const {user}=useAuth();
  const {logs=[],payPeriodAnchor,periodRecords={}}=useData();
  const costs=useExpenses();
  const nav=useNavigate();
  const location=useLocation();
  const [localHidden,setHidden]=useState(maskPreference);
 const hidden=privacyHidden??localHidden;
  const [selectedPeriod,setSelectedPeriod]=useState(null);
  const [selected,setSelected]=useState(null);
  const [editor,setEditor]=useState(null);
  const today=isoDate(new Date());
  const periods=useMemo(()=>payPeriodAnchor?listPeriods(logs,payPeriodAnchor,13):[],[logs,payPeriodAnchor]);
  const currentMonth={id:'month',start:today.slice(0,7)+'-01',end:isoDate(new Date(new Date().getFullYear(),new Date().getMonth()+1,0))};
  const requested=location.state?.start&&location.state?.end?{...location.state,id:location.state.start+'_'+location.state.end}:null;
  const period=selectedPeriod||requested||periods[0]||currentMonth;
  const choices=periods.some(p=>p.start===period.start&&p.end===period.end)?periods:[period,...periods];
  const summary=expenseSummary(costs.expenses,period);
  const rows=summary.records.filter(e=>e.source==='my_expense');
  const legacyCharges=summary.records.filter(e=>e.source==='contractor_charge');
  const upcoming=recurringOccurrences(costs.rules||[],costs.expenses,period);
  const cash=value=>hidden?'••••':money(value);
  const record=periodRecords[period.id];
  useEffect(()=>{track('expense_overview_viewed',{source:'records'});},[]);
  const toggleHidden=()=>{const next=!hidden;setHidden(next);try{localStorage.setItem('home-hide-money',next?'1':'0');}catch(_){}};
  const add=()=>{setEditor({});track('expense_opened',{source:'records'})};
  function rowButton(e){return <button key={e.id} className="expense-row" onClick={()=>{setSelected(e);track('expense_record_opened',{source:'records'});}}>
    <Receipt size={21} aria-hidden="true"/>
    <span className="expense-row-copy"><strong>{e.description||e.category||'Expense'}</strong><small>{fmt(e.date)}{e.recurringRuleId?' · Recurring':''}</small>{e.receipt&&<small>Receipt attached</small>}</span>
    <strong className="expense-row-amount">{cash(e.amount)}</strong><ChevronRight size={18} aria-hidden="true"/>
   </button>}
  return <div className="home-screen expense-page simple-expenses">
    <header className="home-row"><h1 className="text-3xl font-bold">Expenses</h1><HeaderControls hidden={hidden} onToggleMoney={toggleHidden}/></header>
    <div className="home-row simple-expenses-title"><h2>Expenses</h2><button className="home-primary" onClick={add} disabled={costs.loading||!!costs.error}><Plus size={18}/>Add expense</button></div>
    <label className="home-field expense-period">{payPeriodAnchor?'Pay period':'This month'}
     <select aria-label="Expense period" value={period.id} onChange={e=>setSelectedPeriod(choices.find(p=>p.id===e.target.value))}>
       {choices.map(p=><option key={p.id} value={p.id}>{fmt(p.start)} – {fmt(p.end)}{p.id===periods[0]?.id?' · Current':''}</option>)}
     </select>
    </label>
    {!payPeriodAnchor&&<Link className="home-text-button text-sm" to="/app/periods">Set your pay-period dates</Link>}
    {costs.cached&&<p className="home-banner" role="status">Showing cached expense records{costs.pending?' · changes waiting to sync':''}.</p>}
    {record?.needsReview&&<p className="home-banner" role="status">Expenses changed after this pay period was checked. <Link to="/app/check-pay" state={{periodId:period.id}} className="underline">Recheck pay</Link></p>}
    <section className="home-card simple-expenses-total" aria-busy={costs.loading}>
      <p className="home-muted text-sm">Your recorded expenses</p>
      <strong className="expense-total">{costs.loading?'…':costs.error?'Unavailable':cash(summary.own)}</strong>
      {!costs.loading&&!costs.error&&<p className="home-muted text-xs">{rows.length} {rows.length===1?'expense':'expenses'} recorded in this period</p>}
    </section>
    {costs.error&&<p role="alert" className="home-banner">{costs.error} <button className="home-text-button underline" onClick={costs.retry}>Retry</button></p>}
    <section className="simple-expenses-history" aria-label="Your expenses">
      <div className="home-row"><h3>Your expenses</h3><span className="home-muted text-xs">Tap to view</span></div>
      {costs.loading?<div className="home-skeleton" role="status" aria-label="Loading expenses"/>:rows.length?<div className="expense-list">{rows.map(rowButton)}</div>:!costs.error&&<div className="home-card home-empty"><h3>No expenses recorded this period</h3><p className="home-muted text-sm">Tap Add expense to keep track of what you've spent.</p></div>}
    </section>
    {!!legacyCharges.length&&!costs.error&&<details className="simple-legacy">
      <summary>Previously saved contractor charges <span>{cash(summary.contractor)}</span></summary>
      <p className="home-muted text-xs">Older contractor charges are preserved separately from the expenses you paid yourself. Check these against your contractor's statement in Pay.</p>
      <div className="expense-list">{legacyCharges.map(rowButton)}</div>
    </details>}
    {!!upcoming.length&&!costs.error&&<details className="simple-legacy">
      <summary>Expected recurring costs <span>{upcoming.length}</span></summary>
      <p className="home-muted text-xs">Not included in recorded totals. Review before recording a cost.</p>
      <div className="expense-list">{upcoming.map(row=><div key={row.id} className="simple-expected-row"><div><strong>{row.description||row.category||'Expected cost'}</strong><p className="home-muted text-xs">{fmt(row.date)} · {cash(row.amount)}</p></div><button className="home-secondary" onClick={()=>setEditor({...row,expectedConfirmation:true})}>Record</button></div>)}</div>
    </details>}
    {editor&&<HomeExpenseDialog open isGuest={user?.isGuest} eventSource="records" initialSource={editor.source||'my_expense'} initialExpense={editor.id?editor:null} confirmExpected={!!editor.expectedConfirmation} save={async e=>{const {expectedConfirmation,...record}=e;await costs.save(record)}} onClose={()=>setEditor(null)}/>}
    {selected&&<ExpenseDetails expense={selected} costs={costs} hidden={hidden} onClose={()=>setSelected(null)} onEdit={()=>{setEditor(selected);setSelected(null)}}/>}
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
    {expense.notes&&<p className="whitespace-pre-wrap">{expense.notes}</p>}<ExpenseReceiptPreview receipt={expense.receipt}/>{mode==='view'&&<><button className="home-primary w-full" onClick={onEdit}>Edit expense</button>{!expense.recurringRuleId&&<button className="home-secondary w-full" onClick={()=>setMode('recurring')}>Save as recurring cost</button>}{expense.recurringRuleId&&<button className="home-secondary w-full" onClick={()=>setMode('stop')}>Stop future recurring costs</button>}<button className="home-secondary w-full" onClick={()=>setMode('delete')}>Delete expense</button></>}
    {mode==='stop'&&<><p role="alert">Stop expecting future costs? Existing expense records will remain.</p><button className="home-primary w-full" disabled={busy} onClick={()=>perform(()=>costs.stopRecurring(expense.recurringRuleId))}>{busy?'Saving…':'Confirm stop'}</button></>}
    {mode==='delete'&&<><p role="alert">Delete this recorded expense? Any checked period will need rechecking.{expense.recurringRuleId?' Its recurring schedule will remain.':''}</p><button className="home-primary w-full" disabled={busy} onClick={()=>perform(()=>costs.remove(expense))}>{busy?'Deleting…':'Confirm deletion'}</button></>}
    {mode==='recurring'&&<><p className="home-muted text-sm">This creates an expectation, not another expense. Future costs are recorded only after review.</p><label className="home-field">Repeat<select value={frequency} onChange={e=>setFrequency(e.target.value)}><option value="weekly">Weekly</option><option value="four_weekly">Every 4 weeks</option><option value="monthly">Monthly</option></select></label><label className="home-field">Next expected date<input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)}/></label><button className="home-primary w-full" disabled={busy||!nextDate} onClick={()=>perform(()=>costs.makeRecurring(expense,frequency,nextDate))}>{busy?'Saving…':'Confirm recurring cost'}</button></>}
    {mode!=='view'&&<button className="home-secondary w-full" disabled={busy} onClick={()=>setMode('view')}>Cancel</button>}{error&&<p role="alert" className="home-error">{error}</p>}
  </Dialog.Panel></div></Dialog>;
}
