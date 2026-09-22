import React,{useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {motion,AnimatePresence} from "framer-motion";
import {useData} from "../contexts/DataContext";
const FLAG="st_tutorial_v2";
export default function DashboardTutorial(){
 const {isNewUser,loading}=useData();const [visible,setVisible]=useState(false);
 useEffect(()=>{if(loading)return;const seen=localStorage.getItem(FLAG);if(!seen&&isNewUser){const t=setTimeout(()=>setVisible(true),700);return()=>clearTimeout(t)}},[loading,isNewUser]);
 const finish=()=>{try{localStorage.setItem(FLAG,"1")}catch(e){}setVisible(false)};
 if(!visible)return null;
 return createPortal(<AnimatePresence><motion.div className="fixed inset-0 z-[70] bg-black/55" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
   <div className="absolute inset-x-4 bottom-28 mx-auto max-w-sm">
    <motion.div initial={{y:18,opacity:0}} animate={{y:0,opacity:1}} className="rounded-2xl border border-[#4a3fb2] bg-[#111827] p-4 shadow-2xl">
      <div className="text-xs font-bold uppercase tracking-[.16em] text-[#8f83ff]">START HERE</div>
      <h3 className="mt-1 text-lg font-bold">Log your first work day</h3>
      <p className="mt-1 text-sm leading-5 text-[#9aa6bd]">Tap the purple <strong className="text-white">Log today’s work</strong> button below. Enter your deliveries and Stop Tracker will start building your 4-week record.</p>
      <div className="mt-3 flex items-center justify-between"><button onClick={finish} className="text-xs text-[#7f8ba3]">Skip guide</button><button onClick={finish} className="rounded-xl bg-[#7567ff] px-4 py-2 text-sm font-bold text-white">Show me</button></div>
    </motion.div>
    <div className="mx-auto mt-3 h-8 w-px bg-[#7567ff]"/><div className="mx-auto h-3 w-3 rotate-45 border-b-2 border-r-2 border-[#7567ff]"/>
   </div>
 </motion.div></AnimatePresence>,document.body);
}
