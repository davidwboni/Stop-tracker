import React from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {ClipboardList,Receipt,FolderOpen,UserRound} from 'lucide-react';
import EntriesPage from './EntriesPage';
import ExpensesOverview from './ExpensesOverview';
import DocumentsPage from './DocumentsPage';
import '../styles/records-hub.css';
const tabs=[{id:'work',label:'Work',Icon:ClipboardList},{id:'expenses',label:'Expenses',Icon:Receipt},{id:'documents',label:'Documents',Icon:FolderOpen}];
export default function RecordsHub(){
 const [params,setParams]=useSearchParams();
 const navigate=useNavigate();
 const tab=tabs.some(t=>t.id===params.get('tab'))?params.get('tab'):'work';
 return <div className="home-screen records-hub st-page">
  <header className="home-row"><div><h1>Records</h1><p className="home-muted">Your work, expenses and saved documents in one place.</p></div><button className="home-icon" aria-label="Open profile" onClick={()=>navigate("/app/profile")}><UserRound size={20} aria-hidden="true"/></button></header>
  <nav className="records-tabs" data-tour="records-tabs" aria-label="Records sections">
   {tabs.map(({id,label,Icon})=><button type="button" key={id} aria-current={tab===id?'page':undefined} onClick={()=>setParams(id==='work'?{}:{tab:id})}>
    <Icon size={18} aria-hidden="true"/><span>{label}</span></button>)}
  </nav>
  <section className="records-content" key={tab} aria-label={tabs.find(t=>t.id===tab).label}>
   {tab==='work'?<EntriesPage/>:tab==='expenses'?<ExpensesOverview/>:<DocumentsPage/>}
  </section>
 </div>;
}