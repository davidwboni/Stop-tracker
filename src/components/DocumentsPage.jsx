import React,{useEffect} from 'react';
import {Link} from 'react-router-dom';
import {FileCheck2,FileText,ChevronRight,Plus,ArrowRight} from 'lucide-react';
import {useData} from '../contexts/DataContext';
import {useInvoice} from '../contexts/InvoiceContext';
import InvoiceHistory from './InvoiceHistory';
import {trackProductEvent as track} from '../services/productAnalytics';
import '../styles/documents.css';

const dateLabel=date=>{
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return date||'';
 return new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
};
function statementLabel(id,record){
 const range=record.payoutComparison;
 const [from,to]=id.split('_');
 if(range?.start&&range?.end)return dateLabel(range.start)+' – '+dateLabel(range.end);
 return from&&to?dateLabel(from)+' – '+dateLabel(to):id;
}
function statementStatus(record){
 if(record.needsReview||record.status==='needs_review')return 'Needs recheck';
 if(record.status==='reconciled')return 'Reconciled · Not proof of payment';
 if(record.payoutComparison)return 'Checked · View comparison';
 return 'Review statement details';
}
// A saved check is only a candidate for invoicing. InvoicePage verifies its
// current work fingerprint again before allowing the checked amount to prefill.
function invoiceCandidate(record){
 const c=record?.payoutComparison;
 if(!c||record.needsReview||c.scope!=='contractor_payout'||c.currency!=='GBP'||c.taxBasis!=='same_as_records'||!c.basisConfirmed||
    !Number.isSafeInteger(c.statementPence)||c.statementPence<=0||!Number.isSafeInteger(c.expectedPence)||!c.start||!c.end)return false;
 return (record.status==='checked'&&c.statementPence===c.expectedPence)||
  (record.status==='reconciled'&&!!record.resolvedAt);
}
export default function DocumentsPage({embedded=false}){
 const {periodRecords={},loading,loadError}=useData();
 const invoice=useInvoice();
 const statements=Object.entries(periodRecords)
   .filter(([,record])=>record?.payoutComparison||record?.statementAmount!=null)
   .sort((a,b)=>b[0].localeCompare(a[0]));
 const pendingInvoice=statements.find(([id,record])=>invoiceCandidate(record)&&
   !(invoice.invoices||[]).some(saved=>saved.periodId===id));
 const reviewPeriodId=statements[0]?.[0];
 useEffect(()=>{track('documents_opened');},[]);
 return <div className="home-screen st-page document-page">
  {!embedded&&<header className="home-row"><div><h1>Documents</h1><p className="home-muted">Your checked statements and created invoices.</p></div><FileText size={24} aria-hidden="true"/></header>}
  <section className="document-section" aria-labelledby="document-statements-heading">
   <div className="home-row document-section-heading"><h2 id="document-statements-heading">Statements</h2><Link className="home-text-button" to="/app/check-pay">Check statement <ChevronRight size={17}/></Link></div>
   {loading?<div className="home-skeleton" role="status" aria-label="Loading statements"/>:
    loadError?<div className="home-banner" role="alert">Statements could not be loaded. Reopen when connected.</div>:
    statements.length?<div className="document-list">{statements.map(([id,record])=>
     <Link key={id} className="document-record" to="/app/check-pay" state={{periodId:id,...(record.payoutComparison?{start:record.payoutComparison.start,end:record.payoutComparison.end}:{})}} onClick={()=>track('document_viewed')}>
      <span className="document-icon"><FileCheck2 size={20} aria-hidden="true"/></span>
      <span className="document-main"><strong>{statementLabel(id,record)}</strong><small>{statementStatus(record)}</small></span>
      <ChevronRight size={19} className="document-chevron" aria-hidden="true"/>
     </Link>)}</div>:
    <div className="document-empty">No statements checked yet.<span>When you check your pay, the comparison appears here.</span></div>}
  </section>
  <section className="document-section" aria-labelledby="document-invoices-heading">
   <div className="home-row document-section-heading"><h2 id="document-invoices-heading">Invoices</h2></div>
   {invoice.loading?<div className="home-skeleton" role="status" aria-label="Loading invoices"/>:
    invoice.loadError?<p role="alert" className="home-banner">{invoice.loadError} <button type="button" className="home-text-button" onClick={invoice.retry}>Retry</button></p>:
    <InvoiceHistory compact/>}
   <p className="home-muted text-xs document-invoice-info">Create an invoice only if your contractor needs one. A generated invoice isn't proof of payment.</p>
   {!loading&&!loadError&&!invoice.loading&&!invoice.loadError&&<div className="document-invoice-actions">
    {pendingInvoice?
     <Link className="home-primary document-create" data-tour="invoice-generate" to="/app/invoice" state={{fromPay:true,periodId:pendingInvoice[0]}}><FileCheck2 size={18}/> Prepare from checked pay <ArrowRight size={17}/></Link>:
     <Link className="home-secondary document-create" data-tour="invoice-generate" to="/app/check-pay" state={reviewPeriodId?{periodId:reviewPeriodId}:undefined}><FileCheck2 size={18}/> Check pay before invoicing <ArrowRight size={17}/></Link>}
    <Link className="home-text-button document-invoice-manual" to="/app/invoice"><Plus size={16}/> Create invoice manually</Link>
   </div>}
  </section>
 </div>;
}
