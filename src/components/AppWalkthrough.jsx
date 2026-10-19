import React,{useEffect,useLayoutEffect,useState} from "react";
import {Dialog} from "@headlessui/react";
import {useLocation,useNavigate} from "react-router-dom";
import {motion,AnimatePresence,useReducedMotion} from "framer-motion";
import {useData} from "../contexts/DataContext";
import {useAuth} from "../contexts/AuthContext";

import {trackProductEvent as track} from '../services/productAnalytics';

const FLAG="st_app_walkthrough_v3";

const steps=[
 {path:"/app/dashboard",target:'[data-tour="log-work"]',title:"Log your work",body:"At the end of a shift, record stops, parcels and any extra work. This walkthrough never saves example data.",action:"Continue"},
 {path:"/app/dashboard",target:'[data-tour="nav-records"]',title:"Your records",body:"Your workdays, expenses and documents are together under Records.",action:"Explore Records",nextPath:"/app/records"},
 {path:"/app/records",target:'[data-tour="records-tabs"]',title:"Find what you need",body:"Work opens first. Switch to Expenses for receipts or Documents for statement checks and invoices.",action:"Continue"},
 {path:"/app/records",target:'[data-tour="nav-pay"]',title:"Check your pay",body:"Select a four-week period and compare the contractor statement with your own records.",action:"Explore Pay",nextPath:"/app/check-pay"},
 {path:"/app/check-pay",target:'[data-tour="check-manual"]',title:"Manual or AI",body:"Manual comparison is always available. AI helps extract statement figures, which you review before saving.",action:"Continue"},
  {path:"/app/check-pay",title:"Finish the four-week cycle",body:"Once the statement is checked and any difference resolved, prepare an invoice from the verified payout if your contractor requires one. Confirm sending it yourself in your email app.",action:"Continue"},
 {path:"/app/check-pay",target:'[data-tour="nav-routes"]',title:"Plan your route",body:"Add an address and watch it appear on the map. Full optimisation is a Pro feature after free trial uses.",action:"Explore Routes",nextPath:"/app/routes"},
 {path:"/app/routes",target:'[data-tour="route-search"]',title:"Add delivery stops",body:"See your stops on the map and adjust the order. You can always return here from the Routes tab.",action:"Finish tour",nextPath:"/app/dashboard"},
 {path:"/app/dashboard",title:"You're ready",body:"Return to Home to start recording your real work. You can skip the guidance at any time.",action:"Start tracking"}
]

export default function AppWalkthrough(){
 const reduced=useReducedMotion();
 const {isNewUser,loading}=useData();
 const {user}=useAuth();
 const nav=useNavigate();
 const loc=useLocation();
 const [step,setStep]=useState(0);
 const [open,setOpen]=useState(false);
 const [rect,setRect]=useState(null);
 const [targetMissing,setTargetMissing]=useState(false);

 useEffect(()=>{
   const replay=()=>{
     setStep(0);setOpen(true);track('walkthrough_started');
     nav(steps[0].path,{replace:true,state:{walkthrough:true}});
   };
   window.addEventListener('st-walkthrough-replay',replay);
   return()=>window.removeEventListener('st-walkthrough-replay',replay);
 },[nav]);

 useEffect(()=>{
   if(loading)return;
   let seen=false;
   const key=user?.uid?`${FLAG}_${user.uid}`:FLAG;
   try{seen=!!localStorage.getItem(key)}catch(e){}
   if(isNewUser&&!seen){
     setStep(0);
     setOpen(true);
     track('walkthrough_started');
     nav(steps[0].path,{replace:true,state:{walkthrough:true}});
   }
 },[loading,isNewUser,nav,user?.uid]);

 useEffect(()=>{
   if(!open)return;
   const wanted=steps[step]?.path;
   if(wanted&&loc.pathname!==wanted)nav(wanted,{replace:true,state:{walkthrough:true}});
 },[open,step,loc.pathname,nav]);

 useLayoutEffect(()=>{
   if(!open)return;
   const target=steps[step]?.target;
   setRect(null);
   setTargetMissing(false);
   if(!target)return;
   let cancelled=false;
   let tries=0;
   const locate=()=>{
     if(cancelled)return;
     const el=document.querySelector(target);
     if(!el){
       if(tries++<30)setTimeout(locate,80);
       else setTargetMissing(true);
       return;
     }
     const isNav=target.includes("nav-");
     if(!isNav)el.scrollIntoView({behavior:reduced?"auto":"smooth",block:"center"});
     setTimeout(()=>{if(!cancelled)setRect(el.getBoundingClientRect())},isNav?50:300);
   };
   locate();
   const refresh=()=>{const el=document.querySelector(target);if(el)setRect(el.getBoundingClientRect())};
   window.addEventListener("resize",refresh);
   window.addEventListener("scroll",refresh,true);
   return()=>{cancelled=true;window.removeEventListener("resize",refresh);window.removeEventListener("scroll",refresh,true)};
 },[open,step,loc.pathname,reduced]);

 const finish=(completed=false)=>{
   track(completed?'walkthrough_completed':'walkthrough_skipped');
   const key=user?.uid?`${FLAG}_${user.uid}`:FLAG;
   try{localStorage.setItem(key,"1")}catch(e){}
   setOpen(false);
   setRect(null);
   nav("/app/dashboard",{replace:true});
   requestAnimationFrame(()=>window.scrollTo({top:0,behavior:reduced?"auto":"smooth"}));
 };

 const advance=()=>{
   const s=steps[step];
   if(step===steps.length-1)return finish(true);
   if(s.nextPath)nav(s.nextPath,{state:{walkthrough:true}});
   setStep(v=>v+1);
 };

 if(!open)return null;
 const s=steps[step];
 const targetLow=rect ? rect.top > window.innerHeight*0.52 : false;

 return (
  <AnimatePresence>
   <Dialog open={open} onClose={()=>finish(false)} as={motion.div} className="fixed inset-0 z-[95]" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
    <Dialog.Panel className="fixed inset-0">
    <div className="absolute inset-0 bg-black/25"/>
    {rect&&<button
      type="button"
      aria-label={s.action}
      onClick={advance}
      className="fixed z-[97] rounded-2xl border-2 border-[#9b91ff] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.62)] transition-all duration-300"
      style={{left:Math.max(4,rect.left-4),top:Math.max(4,rect.top-4),width:Math.min(window.innerWidth-8,rect.width+8),height:rect.height+8}}
    />}
    <motion.div
      key={step}
      initial={{y:reduced?0:14,opacity:0}}
      animate={{y:0,opacity:1}}
      className={`absolute inset-x-3 z-[98] mx-auto max-w-md rounded-2xl border border-[#4a3fb2] bg-[#111827] text-white p-4 shadow-2xl backdrop-blur-xl ${targetLow?"top-[max(16px,env(safe-area-inset-top))]":"bottom-[96px]"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8f83ff]">GUIDED TOUR · {step+1}/{steps.length}</span>
        <button onClick={()=>finish(false)} className="min-h-[44px] px-2 text-xs font-semibold text-[#8e9ab2]">Skip tour</button>
      </div>
      <Dialog.Title className="mt-2 text-xl font-bold">{s.title}</Dialog.Title>
      <p className="mt-1 text-sm leading-5 text-[#a5afc0]">{s.body}</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 gap-1">{steps.map((_,i)=><span key={i} className={`h-1 flex-1 rounded-full ${i<=step?"bg-[#7567ff]":"bg-[#293249]"}`}/>)}</div>
        {!s.target&&<button onClick={step===steps.length-1?()=>finish(true):advance} className="min-h-[44px] rounded-xl bg-[#7567ff] px-5 py-2.5 text-sm font-bold text-white">{s.action}</button>}
        {s.target&&<button onClick={advance} className="min-h-[44px] rounded-xl bg-[#7567ff] px-4 py-2 text-xs font-bold text-white">{targetMissing?'Continue':'Next'}</button>}

      </div>
    </motion.div>
    </Dialog.Panel>
   </Dialog>
  </AnimatePresence>
 );
}
