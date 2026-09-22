import React,{useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {useLocation,useNavigate} from "react-router-dom";
import {motion,AnimatePresence} from "framer-motion";
import {useData} from "../contexts/DataContext";
const FLAG="st_app_walkthrough_v1";
const steps=[
 {path:"/app/dashboard",title:"Home",body:"This is your daily hub. Your stops, expected earnings and current 4-week period live here."},
 {path:"/app/routes",title:"Routes",body:"Use Routes to check addresses, build your stop list and optimise the order before you leave."},
 {path:"/app/check-pay",title:"Check Pay",body:"When your contractor statement arrives, compare it with the independent records you logged here."},
 {path:"/app/invoice",title:"Invoice",body:"After checking the statement, create the invoice using the confirmed amount your contractor says to bill."},
 {path:"/app/stats",title:"Insights",body:"Insights shows how your stops, work days and expected earnings change over each pay period."},
 {path:"/app/dashboard",title:"Ready to start",body:"That’s the full workflow. The tour has not added any work entries. Finish here and start with a clean ledger."}
];
export default function AppWalkthrough(){
 const {isNewUser,loading}=useData();const nav=useNavigate();const loc=useLocation();const [step,setStep]=useState(0);const [open,setOpen]=useState(false);
 useEffect(()=>{if(loading)return;let seen=false;try{seen=!!localStorage.getItem(FLAG)}catch(e){}if(isNewUser&&!seen){setOpen(true);nav(steps[0].path,{replace:true})}},[loading,isNewUser]);
 useEffect(()=>{if(open&&loc.pathname!==steps[step].path)nav(steps[step].path)},[open,step]);
 const finish=()=>{try{localStorage.setItem(FLAG,"1")}catch(e){}setOpen(false);nav("/app/dashboard",{replace:true});window.scrollTo({top:0,behavior:"smooth"})};
 const next=()=>{if(step===steps.length-1)return finish();setStep(s=>s+1)};
 if(!open)return null;const s=steps[step];
 return createPortal(<AnimatePresence><motion.div className="fixed inset-0 z-[90] pointer-events-none" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
  <div className="absolute inset-0 bg-black/35"/>
  <motion.div key={step} initial={{y:18,opacity:0}} animate={{y:0,opacity:1}} className="pointer-events-auto absolute inset-x-3 bottom-[92px] mx-auto max-w-md rounded-2xl border border-[#4a3fb2] bg-[#111827]/98 p-4 shadow-2xl backdrop-blur-xl">
   <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8f83ff]">APP TOUR · {step+1}/{steps.length}</span><button onClick={finish} className="text-xs font-semibold text-[#8e9ab2]">Skip tour</button></div>
   <h3 className="mt-2 text-xl font-bold">{s.title}</h3><p className="mt-1 text-sm leading-5 text-[#a5afc0]">{s.body}</p>
   <div className="mt-4 flex items-center gap-2"><div className="flex flex-1 gap-1">{steps.map((_,i)=><span key={i} className={`h-1 flex-1 rounded-full ${i<=step?"bg-[#7567ff]":"bg-[#293249]"}`}/>)}</div><button onClick={next} className="min-w-[112px] rounded-xl bg-[#7567ff] px-4 py-2.5 text-sm font-bold text-white">{step===steps.length-1?"Ready":"I’ve seen it"}</button></div>
  </motion.div>
 </motion.div></AnimatePresence>,document.body);
}
