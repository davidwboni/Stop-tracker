import React,{useState} from 'react';
import {Download,FileText,Send} from 'lucide-react';
import {useInvoice} from '../contexts/InvoiceContext';
import {money} from '../features/home/homeModel';
import {downloadSavedInvoice,shareSavedInvoice} from '../services/invoicePdf';
import {trackProductEvent as track} from '../services/productAnalytics';
export default function InvoiceHistory({compact=false}){const {invoices=[],deleteInvoice,confirmInvoiceSent}=useInvoice();const [query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(null);const rows=invoices.filter(i=>`${i.invoiceNumber} ${i.clientName||''}`.toLowerCase().includes(query.toLowerCase()));async function act(id,fn){setBusy(id);setError('');try{await fn();}catch(e){setError(e.message||'Could not complete this action.');}finally{setBusy(null);}}
 if(compact)return <div className="document-invoice-list">
   {invoices.length>5&&<label className="home-field">Find an invoice<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Invoice number or client"/></label>}
   {error&&<p role="alert" className="home-banner home-error">{error}</p>}
   {rows.length?rows.map(i=><article className="document-invoice-item" key={i.id}>
     <div className="document-invoice-top">
       <span className="document-icon"><FileText size={20} aria-hidden="true"/></span>
       <div className="document-main"><strong>INV-{String(i.invoiceNumber).padStart(4,'0')}</strong>
        <small>{i.clientName||'Invoice'}{i.dateFrom&&i.dateTo?' · '+i.dateFrom+' – '+i.dateTo:''}</small>
       </div>
       <strong className="document-invoice-amount">{money(Number(i.invoiceAmount))}</strong>
     </div>
     <div className="document-invoice-bottom">
       <span className="home-muted text-xs">{i.status==='sent_self_reported'?'Marked sent by you':i.status==='sent'?'Shared':'Generated'} · Delivery and payment unverified</span>
       <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" className="home-secondary document-download" disabled={!!busy||!i.senderSnapshot||!i.clientEmail} onClick={()=>act(i.id,async()=>{await shareSavedInvoice(i);track('document_viewed');})}><Send size={16} aria-hidden="true"/>{busy===i.id?'Working…':'Email PDF'}</button>
        <button type="button" className="home-secondary document-download" disabled={!!busy||!i.senderSnapshot} onClick={()=>act(i.id,async()=>{await downloadSavedInvoice(i);track('document_viewed');})}><Download size={16} aria-hidden="true"/>Download</button>
       </div>
     </div>
     {!i.senderSnapshot&&<p className="home-muted text-xs">This older invoice can't be recreated because its original business details weren't stored.</p>}
     <details className="document-invoice-options"><summary>More options</summary>
        {i.status!=='sent_self_reported'&&<button type="button" className="home-text-button" disabled={!!busy} onClick={()=>{if(window.confirm('Have you actually sent this invoice? Stop Tracker cannot verify delivery.'))act(i.id,()=>confirmInvoiceSent(i.id));}}>Mark as sent</button>}
       <button type="button" className="home-text-button home-error" disabled={!!busy} onClick={()=>{if(window.confirm('Delete this invoice record? Copies already downloaded will remain.'))act(i.id,()=>deleteInvoice(i.id));}}>Delete invoice record</button>
     </details>
   </article>):<div className="document-empty">{invoices.length?'No matching invoices':'No invoices created yet'}<span>Your saved invoices will appear here.</span></div>}
  </div>;
 return <div className="st-list"><label className="home-field">Find an invoice<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Invoice number or client"/></label>{error&&<p role="alert" className="home-banner home-error">{error}</p>}{rows.length?rows.map(i=><article className="home-card" key={i.id}><div className="home-row"><div><h2>Invoice #{i.invoiceNumber}</h2><p className="home-muted">{i.clientName}</p><p className="home-muted text-sm">{i.dateFrom} – {i.dateTo}</p></div><strong>{money(Number(i.invoiceAmount))}</strong></div><span className="st-badge">{i.status==='sent_self_reported'?'Marked sent by you':i.status==='sent'?'Shared':'Generated'} · Delivery and payment unverified</span><div className="st-actions mt-3">{i.status!=='sent_self_reported'&&<button className="home-secondary" disabled={!!busy} onClick={()=>{if(window.confirm('Have you actually sent this invoice? Stop Tracker cannot verify delivery.'))act(i.id,()=>confirmInvoiceSent(i.id));}}>Mark as sent</button>}<button className="home-secondary" disabled={!!busy} onClick={()=>act(i.id,async()=>{await downloadSavedInvoice(i);track('document_viewed');})}>{busy===i.id?'Working…':'Download PDF'}</button><button className="home-text-button home-error" disabled={!!busy} onClick={()=>{if(window.confirm('Delete this invoice record? Copies already downloaded will remain.'))act(i.id,()=>deleteInvoice(i.id));}}>Delete record</button></div>{!i.senderSnapshot&&<p className="home-muted text-sm mt-2">Older record: original business details were not saved, so its original PDF cannot be recreated.</p>}</article>):<div className="st-empty"><h2>{invoices.length?'No matching invoices':'No invoices created yet'}</h2><p>Your generated invoice records will appear here.</p></div>}</div>;
}
