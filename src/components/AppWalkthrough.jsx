import React,{useEffect,useLayoutEffect,useState} from "react";
import {createPortal} from "react-dom";
import {useLocation,useNavigate} from "react-router-dom";
import {motion,AnimatePresence} from "framer-motion";
import {useData} from "../contexts/DataContext";
import {useAuth} from "../contexts/AuthContext";

const FLAG="st_app_walkthrough_v2";

const steps=[
 {path:"/app/dashboard",target:'[data-tour="log-work"]',title:"Log today’s work",body:"This is the button you’ll use at the end of a shift. Tap the highlighted button to continue.",action:"Tap Log today’s work"},
 {path:"/app/dashboard",target:'[data-tour="past-entry"]',title:"Forgot a day?",body:"Use Past entry when you missed a day. You can choose any earlier date before saving.",action:"Tap Past entry"},
 {path:"/app/entries",target:'[data-tour="entry-example"]',title:"Your work ledger",body:"This is what one saved work day looks like: date, stops, expected earnings and notes. In real use, swipe an entry to the right to edit it.",action:"Tap the example entry"},
 {path:"/app/entries",target:'[data-tour="nav-routes"]',title:"Routes",body:"Now tap Routes in the navigation. This is where you check addresses and build the order of your stops.",action:"Tap Routes",nextPath:"/app/routes"},
 {path:"/app/routes",target:'[data-tour="route-search"]',title:"Build a route",body:"Start here by searching an address. Address checking stays separate from your daily work log.",action:"Tap address search"},
 {path:"/app/routes",target:'[data-tour="nav-check-pay"]',title:"Check Pay",body:"At the end of the pay period, move to Check Pay when your contractor statement arrives.",action:"Tap Check Pay",nextPath:"/app/check-pay"},
 {path:"/app/check-pay",target:'[data-tour="check-manual"]',title:"Compare the statement",body:"You can compare the contractor statement with your own records manually. AI upload will be the faster Pro option.",action:"Tap manual check"},
 {path:"/app/check-pay",target:'[data-tour="nav-invoice"]',title:"Invoice",body:"After the statement is checked, Invoice uses the confirmed amount you need to bill.",action:"Tap Invoice",nextPath:"/app/invoice"},
 {path:"/app/invoice",target:'[data-tour="invoice-generate"]',title:"Create the invoice",body:"This is the final step after reconciliation. Your real invoice details and amount will be used here.",action:"Tap Generate Invoice"},
 {path:"/app/invoice",target:'[data-tour="nav-insights"]',title:"Insights",body:"Insights keeps the bigger picture together across your work periods.",action:"Tap Insights",nextPath:"/app/stats"},
 {path:"/app/stats",target:'[data-tour="insights-period"]',title:"Review each period",body:"Use the period selector to look back at stops, expected earnings and workload trends.",action:"Tap the period selector"},
 {path:"/app/stats",target:'[data-tour="nav-home"]',title:"Back to Home",body:"You now know the main workflow. Tap Home to return to your starting point.",action:"Tap Home",nextPath:"/app/dashboard"},
 {path:"/app/dashboard",title:"You’re ready",body:"The walkthrough did not create or save any work. Your ledger is still blank and ready for your first real entry.",action:"Ready"}
];

export default function AppWalkthrough(){
 const {isNewUser,loading}=useData();
 const {user}=useAuth();
 const nav=useNavigate();
 const loc=useLocation();
 const [step,setStep]=useState(0);
 const [open,setOpen]=useState(false);
 const [rect,setRect]=useState(null);

 useEffect(()=>{
   if(loading)return;
   let seen=false;
   const key=user?.uid?`${FLAG}_${user.uid}`:FLAG;
   try{seen=!!localStorage.getItem(key)}catch(e){}
   if(isNewUser&&!seen){
     setStep(0);
     setOpen(true);
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
   if(!target)return;
   let cancelled=false;
   let tries=0;
   const locate=()=>{
     if(cancelled)return;
     const el=document.querySelector(target);
     if(!el){
       if(tries++<30)setTimeout(locate,80);
       return;
     }
     const isNav=target.includes("nav-");
     if(!isNav)el.scrollIntoView({behavior:"smooth",block:"center"});
     setTimeout(()=>{if(!cancelled)setRect(el.getBoundingClientRect())},isNav?50:300);
   };
   locate();
   const refresh=()=>{const el=document.querySelector(target);if(el)setRect(el.getBoundingClientRect())};
   window.addEventListener("resize",refresh);
   window.addEventListener("scroll",refresh,true);
   return()=>{cancelled=true;window.removeEventListener("resize",refresh);window.removeEventListener("scroll",refresh,true)};
 },[open,step,loc.pathname]);

 const finish=()=>{
   const key=user?.uid?`${FLAG}_${user.uid}`:FLAG;
   try{localStorage.setItem(key,"1")}catch(e){}
   setOpen(false);
   setRect(null);
   nav("/app/dashboard",{replace:true});
   requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));
 };

 const advance=()=>{
   const s=steps[step];
   if(step===steps.length-1)return finish();
   if(s.nextPath)nav(s.nextPath,{state:{walkthrough:true}});
   setStep(v=>v+1);
 };

 if(!open)return null;
 const s=steps[step];
 const targetLow=rect ? rect.top > window.innerHeight*0.52 : false;

 return createPortal(
  <AnimatePresence>
   <motion.div className="fixed inset-0 z-[95]" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
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
      initial={{y:14,opacity:0}}
      animate={{y:0,opacity:1}}
      className={`absolute inset-x-3 z-[98] mx-auto max-w-md rounded-2xl border border-[#4a3fb2] bg-[#111827]/98 p-4 shadow-2xl backdrop-blur-xl ${targetLow?"top-[max(16px,env(safe-area-inset-top))]":"bottom-[96px]"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8f83ff]">GUIDED TOUR · {step+1}/{steps.length}</span>
        <button onClick={finish} className="text-xs font-semibold text-[#8e9ab2]">Skip tour</button>
      </div>
      <h3 className="mt-2 text-xl font-bold">{s.title}</h3>
      <p className="mt-1 text-sm leading-5 text-[#a5afc0]">{s.body}</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 gap-1">{steps.map((_,i)=><span key={i} className={`h-1 flex-1 rounded-full ${i<=step?"bg-[#7567ff]":"bg-[#293249]"}`}/>)}</div>
        {!s.target&&<button onClick={finish} className="rounded-xl bg-[#7567ff] px-5 py-2.5 text-sm font-bold text-white">{s.action}</button>}
        {s.target&&<span className="whitespace-nowrap text-xs font-bold text-[#b7b0ff]">Tap highlighted area</span>}
      </div>
    </motion.div>
   </motion.div>
  </AnimatePresence>,
  document.body
 );
}
