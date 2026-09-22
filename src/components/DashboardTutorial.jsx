import React,{useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {motion,AnimatePresence} from "framer-motion";
import {useData} from "../contexts/DataContext";
const FLAG="st_tutorial_v3";
const steps=[
 {target:'[data-tour="log-work"]',title:"Log your work",body:"Tap the highlighted button to start your first daily entry.",action:"Log today’s work"},
 {target:'[data-tour="past-entry"]',title:"Forgot a day?",body:"Past entry lets you choose any earlier date and add work you forgot.",action:"+ Past entry"}
];
export default function DashboardTutorial(){
 const {isNewUser,loading}=useData();const [step,setStep]=useState(0);const [rect,setRect]=useState(null);const [visible,setVisible]=useState(false);
 useEffect(()=>{if(loading)return;let seen=false;try{seen=!!localStorage.getItem(FLAG)}catch(e){}if(!seen&&isNewUser)setVisible(true)},[loading,isNewUser]);
 useEffect(()=>{if(!visible)return;const locate=()=>{const el=document.querySelector(steps[step]?.target);setRect(el?.getBoundingClientRect()||null)};locate();window.addEventListener("resize",locate);window.addEventListener("scroll",locate,true);return()=>{window.removeEventListener("resize",locate);window.removeEventListener("scroll",locate,true)}},[visible,step]);
 const finish=()=>{try{localStorage.setItem(FLAG,"1")}catch(e){}setVisible(false)};
 const interact=()=>{const el=document.querySelector(steps[step]?.target);el?.click();if(step<steps.length-1)setStep(s=>s+1);else finish()};
 if(!visible)return null;const s=steps[step];
 return createPortal(<AnimatePresence><motion.div className="fixed inset-0 z-[70] bg-black/60" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
  {rect&&<div className="pointer-events-none fixed rounded-2xl ring-4 ring-[#8f83ff] ring-offset-4 ring-offset-[#080c14]" style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}/>}
  <div className="absolute inset-x-4 bottom-24 mx-auto max-w-sm rounded-2xl border border-[#4a3fb2] bg-[#111827] p-4 shadow-2xl">
   <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8f83ff]">QUICK TOUR · {step+1}/{steps.length}</div><h3 className="mt-1 text-lg font-bold">{s.title}</h3><p className="mt-1 text-sm leading-5 text-[#9aa6bd]">{s.body}</p>
   <div className="mt-3 flex items-center justify-between"><button onClick={finish} className="text-xs text-[#7f8ba3]">Skip</button><button onClick={interact} className="rounded-xl bg-[#7567ff] px-4 py-2 text-sm font-bold text-white">{s.action}</button></div>
  </div>
 </motion.div></AnimatePresence>,document.body);
}
