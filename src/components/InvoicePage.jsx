import React,{useEffect,useMemo,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useData} from '../contexts/DataContext';
import {useInvoice} from '../contexts/InvoiceContext';
import useExpenses from '../hooks/useExpenses';
import {isoDate,listPeriods} from '../features/payperiod/periods';
import {moneyRevision,moneySummary,payoutComparison} from '../features/money/moneyModel';
import InvoiceCreate from './InvoiceCreate';
import {money} from '../features/home/homeModel';

export default function InvoicePage(){
 const {logs=[],payPeriodAnchor,periodRecords={},loading,loadError}=useData();
 const invoice=useInvoice(),expenses=useExpenses(),loc=useLocation();
 const fromPay=loc.state?.fromPay===true;
 const [selected,setSelected]=useState(null),[creating,setCreating]=useState(false),[createDuplicate,setCreateDuplicate]=useState(false);
 const [revision,setRevision]=useState(null);
 const periods=useMemo(()=>listPeriods(logs,payPeriodAnchor||isoDate(new Date()),13),[logs,payPeriodAnchor]);
 const p=periods.find(row=>row.id===(selected||loc.state?.periodId))||periods[0];
 const summary=useMemo(()=>moneySummary(logs,expenses.expenses,p),[logs,expenses.expenses,p.start,p.end]);
 const record=periodRecords[p.id];
 const checked=fromPay?payoutComparison(record,p,summary,revision,loading||expenses.loading||!!loadError||!!expenses.error):null;
 const allowed=fromPay&&(checked?.state==='matched'||checked?.state==='reconciled');
 const prior=(invoice.invoices||[]).filter(i=>i.periodId===p.id);
 const blocked=loading||expenses.loading||invoice.loading;
 useEffect(()=>{
   if(!fromPay){setRevision(null);return;}
   let active=true;setRevision(null);
   moneyRevision(logs,expenses.expenses,p).then(value=>{if(active)setRevision(value);}).catch(()=>{if(active)setRevision(null);});
   return()=>{active=false;};
 },[fromPay,logs,expenses.expenses,p.start,p.end]);
 const prefill={
   periodId:p.id,startDate:p.start,endDate:p.end,stops:p.stops,
   amount:summary.payout==null?null:summary.payout/100,
   // Only a checked GBP contractor-payout figure may prefill an invoice.
   statementAmount:allowed?(record.payoutComparison.statementPence/100).toFixed(2):null
 };
 const prepare=fromPay||creating;
 return <div className="home-screen st-page invoice-workflow" style={{maxWidth:760}}>
  <Link className="home-text-button" to={fromPay?'/app/check-pay':'/app/records?tab=documents'} state={fromPay?{periodId:p.id}:undefined}>
   ← {fromPay?'Back to Pay':'Documents'}
  </Link>
  <header><h1>{fromPay?'Prepare your invoice':'Create invoice'}</h1>
   <p className="home-muted">{fromPay?'From your checked four-week statement.':'For drivers who invoice their contractor.'}</p>
  </header>
  {blocked?<div className="home-skeleton" role="status" aria-label="Loading invoice records"/>:
   loadError||invoice.loadError||expenses.error?<p role="alert" className="home-banner">Invoice or pay records could not be verified. Retry when connected. <button className="home-text-button" onClick={()=>{invoice.retry?.();expenses.retry?.()}}>Retry</button></p>:
   fromPay&&!allowed?<section className="home-card space-y-3"><h2>Check your statement first</h2>
     <p className="home-muted">{checked?.state==='stale'?'Your work or contractor figures changed since the check. Review them before preparing an invoice.':checked?.state==='difference'?'The payout difference needs reviewing and accepting before creating an invoice.':'A valid saved pay comparison is required before this invoice can be prepared.'}</p>
     <Link className="home-primary w-full" state={{periodId:p.id}} to="/app/check-pay">Return to Pay</Link>
   </section>:
   fromPay&&prior.length&&!createDuplicate?<section className="home-card space-y-3">
     <h2>Invoice already prepared for this period</h2>
     <p className="home-muted">Avoid invoicing the same work twice. You can download or share the saved invoice from Records.</p>
     <p className="font-semibold">Invoice {prior.map(i=>'INV-'+String(i.invoiceNumber).padStart(4,'0')).join(', ')}</p>
     <Link className="home-primary w-full" to="/app/records?tab=documents">View saved invoice</Link>
     <button className="home-text-button" onClick={()=>{if(window.confirm('Prepare another invoice for the same four-week period? Check you are not billing twice.'))setCreateDuplicate(true);}}>Create another invoice anyway</button>
   </section>:
   prepare?<InvoiceCreate key={p.id} prefill={prefill}/>:
   <>
     <label className="home-field">Pay period
       <select value={p.id} onChange={e=>setSelected(e.target.value)}>{periods.map(row=><option key={row.id} value={row.id}>{row.start} – {row.end}</option>)}</select>
     </label>
     <section className="home-card space-y-3">
       <h2>Your work record</h2>
       <dl className="money-waterfall"><div><dt>Days logged</dt><dd>{p.daysLogged}</dd></div><div><dt>Stops</dt><dd>{p.stops}</dd></div><div><dt>Expected contractor payout</dt><dd>{summary.payout==null?'Unavailable':money(summary.payout/100)}</dd></div></dl>
       <p className="home-muted">This is an estimate, not a checked statement. Review the amount and VAT treatment before invoicing.</p>
       <button className="home-primary w-full" disabled={!payPeriodAnchor} onClick={()=>setCreating(true)}>Prepare invoice</button>
     </section>
   </>}
 </div>;
}
