import React,{useMemo,useState} from "react";
import {useLocation} from "react-router-dom";
import {motion} from "framer-motion";
import {CalendarDays,FileText,Settings,ChevronRight,CheckCircle2,Clock3} from "lucide-react";
import {useData} from "../contexts/DataContext";
import {useInvoice} from "../contexts/InvoiceContext";
import {getPeriodForDate,summarizePeriod,listPeriods} from "../features/payperiod/periods";
import InvoiceCreate from "./InvoiceCreate";
import InvoiceHistory from "./InvoiceHistory";
import {Money} from "./ui/money";

const fmt=d=>new Date(d+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
export default function InvoicePage(){
 const {logs=[],payPeriodAnchor}=useData();
 const location=useLocation();
 const {invoices=[],senderProfile}=useInvoice();
 const [view,setView]=useState("home");
 const today=useMemo(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;},[]);
 const anchor=payPeriodAnchor||today;
 const currentPeriod=useMemo(()=>getPeriodForDate(anchor,new Date()),[anchor]);
 const periods=useMemo(()=>listPeriods(logs,anchor,2),[logs,anchor]);
 const period=useMemo(()=>{const requested=periods.find(p=>p.id===location.state?.periodId);if(requested)return requested;const previous=periods[1];const alreadyInvoiced=previous&&invoices.some(i=>i.periodId===previous.id);return previous&&!alreadyInvoiced?previous:currentPeriod;},[periods,invoices,currentPeriod,location.state]);
 const summary=useMemo(()=>summarizePeriod(logs,period),[logs,period]);
 const isCurrent=period.id===currentPeriod.id;
 const prefill={periodId:period.id,startDate:period.start,endDate:period.end,amount:summary.expected,stops:summary.stops,statementAmount:location.state?.statementAmount};
 if(view==="create") return <div className="mx-auto max-w-2xl pb-24"><button onClick={()=>setView("home")} className="mb-4 text-sm font-semibold text-[#9b91ff]">← Invoice overview</button><InvoiceCreate prefill={prefill}/></div>;
 if(view==="history") return <div className="mx-auto max-w-2xl pb-24"><button onClick={()=>setView("home")} className="mb-4 text-sm font-semibold text-[#9b91ff]">← Invoice overview</button><InvoiceHistory/></div>;
 return <motion.div className="mx-auto max-w-2xl space-y-5 pb-24 pt-2" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
  <header><h1 className="text-3xl font-bold">Invoice</h1><p className="mt-1 text-sm text-[#8e9ab2]">Create the invoice after checking your contractor statement.</p></header>
  <section className="rounded-[24px] border border-[#26314a] bg-[#111827] p-5 shadow-xl shadow-black/10">
   <div className="flex items-start gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7567ff]/15 text-[#9b91ff]"><CalendarDays/></span><div className="min-w-0 flex-1"><div className="text-xs text-[#8e9ab2]">{isCurrent?"Current Pay Period":"Completed Pay Period"}</div><div className="mt-0.5 text-lg font-bold">{fmt(period.start)} – {fmt(period.end)}</div><div className="text-xs text-[#6f7b92]">4 weeks</div></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400">{location.state?.statementAmount?"Statement checked":isCurrent?"Current period":"Awaiting statement"}</span></div>
   <div className="mt-5 grid grid-cols-3 divide-x divide-[#26314a] border-y border-[#26314a] py-4 text-center"><div><div className="text-xl font-bold">{summary.stops.toLocaleString()}</div><div className="mt-1 text-[11px] text-[#8e9ab2]">stops</div></div><div><div className="text-xl font-bold">{summary.daysLogged}</div><div className="mt-1 text-[11px] text-[#8e9ab2]">work days</div></div><div><div className="text-xl font-bold text-[#9b91ff]"><Money amount={summary.expected}/></div><div className="mt-1 text-[11px] text-[#8e9ab2]">expected</div></div></div>
   <p className="mt-4 rounded-2xl bg-[#172033] p-3 text-xs leading-5 text-[#a3aec1]">Your Stop Tracker record stays visible here. The final invoice amount should come from the contractor statement you checked.</p>
   <button onClick={()=>setView("create")} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6657f5] to-[#806cff] font-bold text-white shadow-lg shadow-[#7567ff]/20"><FileText className="h-5 w-5"/> Generate Invoice <ChevronRight className="h-5 w-5"/></button>
  </section>
  <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Recent Invoices</h2><button onClick={()=>setView("history")} className="text-sm font-semibold text-[#9b91ff]">View all</button></div><div className="space-y-2">{invoices.length?invoices.slice(0,3).map(inv=><button key={inv.id} onClick={()=>setView("history")} className="flex w-full items-center gap-3 rounded-2xl border border-[#26314a] bg-[#111827] p-4 text-left"><FileText className="h-5 w-5 text-[#9b91ff]"/><div className="min-w-0 flex-1"><div className="font-semibold">#{String(inv.invoiceNumber).padStart(4,"0")}</div><div className="text-xs text-[#7f8ba3]">{inv.dateFrom&&inv.dateTo?`${fmt(inv.dateFrom)} – ${fmt(inv.dateTo)}`:"Saved invoice"}</div></div><div className="text-right"><div className="font-bold"><Money amount={Number(inv.invoiceAmount)||0}/></div><div className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle2 className="h-3 w-3"/> {inv.status==="sent"?"Shared":"Generated"}</div></div></button>):<div className="rounded-2xl border border-dashed border-[#2c3852] p-5 text-center text-sm text-[#7f8ba3]"><Clock3 className="mx-auto mb-2 h-5 w-5"/>Your generated invoices will appear here.</div>}</div></section>
  <button onClick={()=>setView("create")} className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-[#26314a] bg-[#111827] p-4 text-left"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#7567ff]/10 text-[#9b91ff]"><Settings/></span><span className="flex-1"><span className="block font-semibold">Invoice Details</span><span className="block text-xs leading-5 text-[#7f8ba3]">{senderProfile?"Your saved business and client details":"Set up once — business, client and payment details"}</span></span><ChevronRight className="text-[#78849b]"/></button>
  <p className="px-3 text-center text-[11px] leading-5 text-[#5f6a80]">Your invoice information is stored with your account and is only accessible to you when signed in.</p>
 </motion.div>;
}