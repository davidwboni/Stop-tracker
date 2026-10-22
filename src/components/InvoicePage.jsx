import React,{useEffect,useMemo,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useData} from '../contexts/DataContext';
import {useInvoice} from '../contexts/InvoiceContext';
import useExpenses from '../hooks/useExpenses';
import {isoDate,listPeriods,summarizePeriod} from '../features/payperiod/periods';
import {moneyRevision,moneySummary,payoutComparison,validRange} from '../features/money/moneyModel';
import InvoiceCreate from './InvoiceCreate';
import {shareSavedInvoice} from '../services/invoicePdf';
import {money} from '../features/home/homeModel';
import {statementInvoiceReady,unresolvedStatementFindings} from '../features/statements/findingGate';

export default function InvoicePage(){
 const {logs=[],payPeriodAnchor,periodRecords={},loading,loadError}=useData();
 const invoice=useInvoice(),expenses=useExpenses(),loc=useLocation();
 const fromPay=loc.state?.fromPay===true;
 const fromPayHub=fromPay||loc.state?.startInvoice===true;
 const [selected,setSelected]=useState(null),[creating,setCreating]=useState(loc.state?.startInvoice===true),[createDuplicate,setCreateDuplicate]=useState(false);
 const [revision,setRevision]=useState(null),[sending,setSending]=useState(false),[sendError,setSendError]=useState('');
 const periods=useMemo(()=>listPeriods(logs,payPeriodAnchor||isoDate(new Date()),13),[logs,payPeriodAnchor]);
 const requestedId=loc.state?.periodId;
 // Statement dates control billing, even for non-28-day contractor cycles.
 // A saved, server-synced comparison is the sole authority for invoice prefill.
 const savedRange=fromPay?periodRecords[requestedId]?.payoutComparison:null;
 const archivedPeriod=savedRange&&validRange(savedRange)&&requestedId===savedRange.start+'_'+savedRange.end?
  summarizePeriod(logs,{id:requestedId,start:savedRange.start,end:savedRange.end}):null;
 const p=periods.find(row=>row.id===(selected||requestedId))||archivedPeriod||periods[0];
 const summary=useMemo(()=>moneySummary(logs,expenses.expenses,p),[logs,expenses.expenses,p.start,p.end]);
 const record=periodRecords[p.id];
 const checked=fromPay?payoutComparison(record,p,summary,revision,loading||expenses.loading||!!loadError||!!expenses.error):null;
 const allowed=fromPay&&(checked?.state==='matched'||checked?.state==='reconciled')&&statementInvoiceReady(record);
 const prior=(invoice.invoices||[]).filter(i=>i.periodId===p.id);
 const blocked=loading||expenses.loading||invoice.loading||(fromPay&&revision===null);
 useEffect(()=>{
   if(!fromPay){setRevision(null);return;}
   let active=true;setRevision(null);
   moneyRevision(logs,expenses.expenses,p).then(value=>{if(active)setRevision(value);}).catch(()=>{if(active)setRevision('');});
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
  <Link className="home-text-button" to={fromPayHub?'/app/check-pay':'/app/records?tab=documents'} state={fromPayHub?{periodId:p.id}:undefined}>
   ← {fromPayHub?'Back to Pay':'Documents'}
  </Link>
  <header><h1>{fromPay?'Prepare your invoice':loc.state?.startInvoice?'Invoice from statement':'Create invoice'}</h1>
   <p className="home-muted">{fromPay?'From your saved, checked contractor statement.':loc.state?.startInvoice?'For an agreed contractor payment that you have not checked against your work.':'For drivers who invoice their contractor.'}</p>
  </header>
  {loc.state?.startInvoice&&<div className="home-banner" role="status"><strong>Manual invoice · Pay not checked</strong><p>Use the amount on your contractor's statement and confirm the recipient and VAT details. This does not verify your earnings or mark you as paid.</p></div>}
  {blocked?<div className="home-skeleton" role="status" aria-label="Loading invoice records"/>:
   loadError||invoice.loadError||expenses.error?<p role="alert" className="home-banner">Invoice or pay records could not be verified. Retry when connected. <button className="home-text-button" onClick={()=>{invoice.retry?.();expenses.retry?.()}}>Retry</button></p>:
   fromPay&&!allowed?<section className="home-card space-y-3"><h2>Check your statement first</h2>
     <p className="home-muted">{checked?.state==='stale'?'Your work or contractor figures changed since the check. Review them before preparing an invoice.':unresolvedStatementFindings(record).length?'Your saved statement has workday differences you still need to review and accept before invoicing.':checked?.state==='difference'?'The payout difference needs reviewing and accepting before creating an invoice.':'A valid saved pay comparison is required before this invoice can be prepared.'}</p>
     <Link className="home-primary w-full" state={{periodId:p.id}} to="/app/check-pay">Return to Pay</Link>
   </section>:
   (fromPay||creating)&&prior.length&&!createDuplicate?<section className="home-card space-y-3">
     <h2>Invoice already prepared for this period</h2>
     <p className="home-muted">Avoid invoicing the same work twice. You can email this saved invoice here or find it under Records.</p>
     <p className="font-semibold">Invoice {prior.map(i=>'INV-'+String(i.invoiceNumber).padStart(4,'0')).join(', ')}</p>
     {prior[0].status==='sent_self_reported'
      ? <p role="status" className="home-banner">You marked this invoice sent. Delivery and payment have not been verified.</p>
      : <div className="space-y-2">
          <p className="home-muted text-sm">This invoice is prepared, but you haven't confirmed sending it.</p>
          <button type="button" className="home-secondary w-full" disabled={sending||!prior[0].senderSnapshot||!prior[0].clientEmail} onClick={async()=>{
            setSending(true);setSendError('');
            try{await shareSavedInvoice(prior[0]);}catch(e){if(e?.name!=='AbortError')setSendError(e.message||'Could not open the email app. Download the invoice from Records.');}
            finally{setSending(false);}
          }}>{sending?'Opening email app…':'Email saved invoice'}</button>
          <button type="button" className="home-primary w-full" disabled={sending} onClick={async()=>{
            if(!window.confirm('Only mark sent if you actually emailed or shared this invoice with your contractor. Stop Tracker cannot verify delivery.'))return;
            setSending(true);setSendError('');
            try{await invoice.confirmInvoiceSent(prior[0].id);}catch(_){setSendError('Could not save the sent status. Retry when connected.');}
            finally{setSending(false);}
          }}>Yes, I've sent it</button>
        </div>}
     {sendError&&<p role="alert" className="home-banner home-error">{sendError}</p>}
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
