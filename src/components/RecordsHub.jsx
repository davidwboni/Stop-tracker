import React,{useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {ClipboardList,Receipt,FolderOpen} from 'lucide-react';
import HeaderControls from './HeaderControls';
import EntriesPage from './EntriesPage';
import ExpensesOverview from './ExpensesOverview';
import DocumentsPage from './DocumentsPage';
import '../styles/records-hub.css';
const tabs=[{id:'work',label:'Work',Icon:ClipboardList},{id:'expenses',label:'Expenses',Icon:Receipt},{id:'documents',label:'Documents',Icon:FolderOpen}];
export default function RecordsHub(){
 const [params,setParams]=useSearchParams();
 const [hidden,setHidden]=useState(()=>{try{return localStorage.getItem('home-hide-money')==='1'}catch(_){return false}});
 function toggleHidden(){
  const next=!hidden;
  setHidden(next);
  try{localStorage.setItem('home-hide-money',next?'1':'0')}catch(_){}
 }
 const tab=tabs.some(t=>t.id===params.get('tab'))?params.get('tab'):'work';
 return <div className="home-screen records-hub st-page">
  <header className="home-row"><div><h1>Records</h1><p className="home-muted">Your work, expenses and saved documents in one place.</p></div><HeaderControls hidden={hidden} onToggleMoney={toggleHidden}/></header>
  <nav className="records-tabs" data-tour="records-tabs" aria-label="Records sections">
   {tabs.map(({id,label,Icon})=><button type="button" key={id} aria-current={tab===id?'page':undefined} onClick={()=>setParams(id==='work'?{}:{tab:id})}>
    <Icon size={18} aria-hidden="true"/><span>{label}</span></button>)}
  </nav>
  <section className="records-content" key={tab} aria-label={tabs.find(t=>t.id===tab).label}>
   {tab==='work'?<EntriesPage privacyHidden={hidden}/>:tab==='expenses'?<ExpensesOverview privacyHidden={hidden}/>:<DocumentsPage embedded/>}
  </section>
 </div>;
}