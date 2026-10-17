import React from 'react';
import '../styles/app-navigation.css';
import {Home, ClipboardList, Wallet, MapPin} from 'lucide-react';
import {useNavigate,useLocation} from 'react-router-dom';
const items=[
 {path:'/app/dashboard',label:'Home',Icon:Home,active:p=>p==='/app'||p.startsWith('/app/dashboard')},
 {path:'/app/records',label:'Records',Icon:ClipboardList,active:p=>p.startsWith('/app/records')||p.startsWith('/app/entries')||p.startsWith('/app/documents')||p.startsWith('/app/money/expenses')},
 {path:'/app/check-pay',label:'Pay',Icon:Wallet,active:p=>p.startsWith('/app/check-pay')||p.startsWith('/app/money')&&!p.startsWith('/app/money/expenses')||p.startsWith('/app/periods')||p.startsWith('/app/invoice')||p.startsWith('/app/stats')},
 {path:'/app/routes',label:'Routes',Icon:MapPin,active:p=>p.startsWith('/app/routes')}
];
export default function AppNavigation(){
 const navigate=useNavigate(),location=useLocation();
 const toTop=()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 return <nav aria-label="Main navigation" className="st-app-navigation fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl pb-safe">
 <div className="mx-auto flex max-w-2xl items-center px-3 py-2">{items.map(({path,label,Icon,active})=><button key={path} data-tour={'nav-'+label.toLowerCase()} aria-label={label} aria-current={active(location.pathname)?'page':undefined}
 onClick={()=>{if(location.pathname===path&&label!=='Pay')toTop();else{navigate(path);requestAnimationFrame(toTop)}}}
 className={`relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-transform duration-200 active:scale-95 ${active(location.pathname)?'text-primary':'text-muted-foreground'}`}>
 <Icon size={22} strokeWidth={active(location.pathname)?2.5:2} aria-hidden="true"/><span>{label}</span>
 {active(location.pathname)&&<span aria-hidden="true" className="absolute bottom-0 h-1 w-5 rounded-full bg-primary"/>}
 </button>)}</div></nav>;
}