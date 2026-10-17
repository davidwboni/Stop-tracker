import React,{useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {FileText,ChevronRight} from 'lucide-react';
import {useData} from '../contexts/DataContext';
import {useInvoice} from '../contexts/InvoiceContext';
import InvoiceHistory from './InvoiceHistory';
import {trackProductEvent as track} from '../services/productAnalytics';
export default function DocumentsPage(){
 const {periodRecords={},loading,loadError}=useData(),invoice=useInvoice(),location=useLocation();
 const [tab,setTab]=useState(['statements','invoices'].includes(location.state?.tab)?location.state.tab:'statements');
 const statements=Object.entries(periodRecords).filter(([,r])=>r.payoutComparison||r.statementAmount!=null).sort((a,b)=>b[0].localeCompare(a[0]));
 useEffect(()=>{track('documents_opened');},[]);
 return <div className="home-screen st-page"><header className="home-row"><div><h1>Documents</h1><p className="home-muted">Reviewed statements and created invoices. Receipts stay with Expenses.</p></div><FileText aria-hidden="true"/></header><div data-tour="document-tabs" role="tablist" className="st-tabs" aria-label="Document type">{['statements','invoices'].map(t=><button role="tab" id={'document-tab-'+t} aria-controls="document-panel" tabIndex={tab===t?0:-1} onKeyDown={e=>{const tabs=['statements','invoices'];let index=tabs.indexOf(t);if(e.key==='ArrowRight')index=(index+1)%2;else if(e.key==='ArrowLeft')index=(index+1)%2;else if(e.key==='Home')index=0;else if(e.key==='End')index=1;else return;e.preventDefault();setTab(tabs[index]);document.getElementById('document-tab-'+tabs[index])?.focus();}} aria-selected={tab===t} key={t} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>
 <section id="document-panel" role="tabpanel" aria-labelledby={'document-tab-'+tab}>
 {tab==='statements'&&<div className="st-list"><p className="home-muted text-sm">Reviewed statement records. Original uploads are not archived.</p>{loading?<div className="home-skeleton" role="status" aria-label="Loading statements"/>:loadError?<p role="alert" className="home-banner">Statements could not be loaded. Reopen when connected.</p>:statements.length?statements.map(([id,r])=><Link className="st-list-row" key={id} to="/app/check-pay" state={{periodId:id,...(r.payoutComparison?{start:r.payoutComparison.start,end:r.payoutComparison.end}:{})}} onClick={()=>track('document_viewed')}><FileText/><span className="st-grow"><strong>{id.replace('_',' – ')}</strong><small>{r.needsReview?'Needs recheck':r.status==='reconciled'?'Reconciled':'Checked · Open to verify current records'}</small></span><ChevronRight/></Link>):<div className="st-empty"><h2>No statements checked yet</h2><p>When your statement arrives, compare it with your work records.</p></div>}<Link className="home-primary" to="/app/check-pay">Check a statement</Link></div>}
 {tab==='invoices'&&<div className="st-list"><p className="home-muted text-sm">Create an invoice only when your contractor needs one. Self-billed drivers can use Statements.</p><Link className="home-primary" data-tour="invoice-generate" to="/app/invoice">Create invoice</Link>{invoice.loading?<div className="home-skeleton" role="status" aria-label="Loading invoices"/>:invoice.loadError?<p role="alert" className="home-banner">{invoice.loadError}<button className="home-text-button" onClick={invoice.retry}>Retry</button></p>:<InvoiceHistory/>}</div>}

 </section></div>;
}
