import React,{useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useInvoice} from '../contexts/InvoiceContext';
import {Building2,FileText,Plus,Trash2} from 'lucide-react';
import '../styles/home.css';
export default function BusinessSettings(){
 const i=useInvoice();const [search,setSearch]=useSearchParams();
 const tab=search.get('tab')==='invoice'?'invoice':'clients';
 const [editing,setEditing]=useState(null);
 const [name,setName]=useState(''),[email,setEmail]=useState('');
 const [sender,setSender]=useState({name:'',address:'',email:'',extra:''});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{setSender(i.senderProfile||{name:'',address:'',email:'',extra:''});},[i.senderProfile]);
 const switchTab=t=>{setSearch({tab:t});setError('');setNotice('')};
 const modify=async action=>{setBusy(true);setError('');setNotice('');try{await action();setNotice('Saved to your account.');setEditing(null);setName('');setEmail('')}catch(_){setError('Could not save changes. Please check your connection and try again.')}finally{setBusy(false)}};
 const validEmail=email.trim()===''||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
 return <div className="home-screen st-page" style={{maxWidth:740}}>
  <Link to="/app/profile" className="home-text-button">← Profile</Link>
  <header><h1>Business settings</h1><p className="home-muted">The details Stop Tracker reuses when preparing invoices.</p></header>
  <nav aria-label="Business settings" className="st-tabs">
   <button aria-current={tab==='clients'?'page':undefined} onClick={()=>switchTab('clients')}><Building2 className="inline mr-2" size={18}/>Clients</button>
   <button aria-current={tab==='invoice'?'page':undefined} onClick={()=>switchTab('invoice')}><FileText className="inline mr-2" size={18}/>Invoice details</button>
  </nav>
  {i.loading?<div className="home-skeleton" role="status" aria-label="Loading saved business settings"/>:i.loadError?<p className="home-banner" role="alert">{i.loadError} <button className="home-text-button" onClick={i.retry}>Retry</button></p>:tab==='clients'?<>
   <p className="home-muted">Choose your usual contractor once. You can always change the recipient on an individual invoice.</p>
   {i.clients.length?<div className="st-list">{i.clients.map(client=><section key={client.id} className="home-card space-y-3">
    <div className="home-row"><div><h2>{client.name}</h2><p className="home-muted text-sm">{client.email||'No email saved'}</p></div>{i.defaultClientId===client.id&&<span className="home-badge">Default</span>}</div>
    <div className="st-actions">
     <button className="home-secondary" disabled={busy||i.defaultClientId===client.id} onClick={()=>modify(()=>i.setDefaultClientId(client.id))}>{i.defaultClientId===client.id?'Default recipient':'Make default'}</button>
     <button className="home-secondary" disabled={busy} onClick={()=>{setEditing(client.id);setName(client.name);setEmail(client.email||'');setNotice('')}}>Edit</button>
     <button className="home-text-button home-error" disabled={busy} onClick={()=>{if(window.confirm('Remove this saved client? Existing invoices remain unchanged.'))modify(()=>i.deleteClient(client.id))}}><Trash2 size={16}/>Remove</button>
    </div>
   </section>)}</div>:<div className="st-empty">No contractors saved yet.</div>}
   {!editing&&<button className="home-primary" onClick={()=>{setEditing('new');setName('');setEmail('')}}><Plus size={18}/>Add client</button>}
   {editing&&<section className="home-card space-y-3"><h2>{editing==='new'?'Add contractor':'Edit client'}</h2>
    <label className="home-field">Business / contractor name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label>
    <label className="home-field">Client email (optional)<input type="email" value={email} maxLength={254} onChange={e=>setEmail(e.target.value)}/></label>
    <button className="home-primary" disabled={busy||!name.trim()||!validEmail} onClick={()=>modify(()=>i.saveClient({id:editing==='new'?undefined:editing,name:name.trim(),email:email.trim()}))}>Save client</button>
    <button className="home-secondary" disabled={busy} onClick={()=>{setEditing(null);setError('')}}>Cancel</button>
   </section>}
  </>:<section className="home-card space-y-3">
   <p className="home-muted text-sm">These details appear on your invoices. Set them up once, then review each invoice before sharing.</p>
   <label className="home-field">Your name / business name<input value={sender.name||''} maxLength={100} onChange={e=>setSender({...sender,name:e.target.value})}/></label>
   <label className="home-field">Business address<textarea rows="3" value={sender.address||''} maxLength={600} onChange={e=>setSender({...sender,address:e.target.value})}/></label>
   <label className="home-field">Your email<input type="email" value={sender.email||''} maxLength={254} onChange={e=>setSender({...sender,email:e.target.value})}/></label>
   <label className="home-field">Other invoice details (VAT / UTR etc.)<textarea rows="2" value={sender.extra||''} maxLength={300} onChange={e=>setSender({...sender,extra:e.target.value})}/></label>
   <button className="home-primary w-full" disabled={busy||!sender.name?.trim()||(sender.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.email))} onClick={()=>modify(()=>i.saveSenderProfile(sender))}>Save invoice details</button>
  </section>}
  {error&&<p role="alert" className="home-banner home-error">{error}</p>}
  {notice&&<p role="status" className="home-banner">{notice}</p>}
 </div>;
}
