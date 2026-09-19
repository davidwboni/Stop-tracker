import React, { useMemo, useState } from "react";
import { useData } from "../contexts/DataContext";
import { Money } from "./ui/money";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Keyboard, LockKeyhole, ShieldCheck, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

const n = (v) => Number(v) || 0;
const gbDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});

const CheckPayV4 = () => {
  const { logs = [] } = useData();
  const navigate = useNavigate();
  const [mode,setMode] = useState("idle");
  const [statementStops,setStatementStops] = useState("");
  const [statementAmount,setStatementAmount] = useState("");
  const [daily,setDaily] = useState({});
  const [showDates,setShowDates] = useState(true);

  const cutoff = useMemo(() => { const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-27); return d; }, []);
  const period = useMemo(() => logs.filter(l => new Date(l.date+"T00:00:00") >= cutoff && l.date <= new Date().toISOString().split("T")[0]).sort((a,b)=>a.date.localeCompare(b.date)), [logs,cutoff]);
  const stops=period.reduce((s,l)=>s+n(l.stops),0);
  const expected=period.reduce((s,l)=>s+n(l.total),0);
  const hasDaily = Object.keys(daily).length > 0;
  const statementStopsNum = hasDaily ? period.reduce((s,l)=>s+n(daily[l.date]?.stops),0) : n(statementStops);
  const statementAmountNum = hasDaily ? period.reduce((s,l)=>s+n(daily[l.date]?.amount),0) : n(statementAmount);
  const stopDiff = statementStopsNum - stops;
  const moneyDiff = statementAmountNum - expected;
  const compared = mode === "result";
  const matches = compared && stopDiff === 0 && Math.abs(moneyDiff) < 0.01;
  const discrepancies = period.filter(l => {
    const d=daily[l.date]; if(!d) return false;
    return n(d.stops)!==n(l.stops) || Math.abs(n(d.amount)-n(l.total))>=0.01;
  });

  const updateDaily=(date,key,value)=>setDaily(prev=>({...prev,[date]:{stops:prev[date]?.stops??"",amount:prev[date]?.amount??"",[key]:value}}));
  const compare=()=>setMode("result");
  const reset=()=>{setMode("idle");setStatementStops("");setStatementAmount("");setDaily({});};

  return <div className="mx-auto max-w-2xl space-y-5 pb-24 pt-2">
    <div><div className="mb-3 inline-flex rounded-2xl bg-[#7567ff]/10 p-3 text-[#8f83ff]"><ShieldCheck/></div><h1 className="text-3xl font-bold tracking-tight">Check Pay</h1><p className="mt-2 max-w-lg text-sm leading-6 text-[#8e9ab2]">Compare the statement you receive with your independent Stop Tracker record.</p></div>

    <div className="rounded-2xl border border-[#202a3d] bg-[#111827] p-5">
      <p className="text-xs font-bold tracking-[.18em] text-[#69758d]">YOUR CURRENT RECORD</p>
      <div className="mt-4 grid grid-cols-2 gap-4"><div><div className="text-3xl font-bold">{stops.toLocaleString("en-GB")}</div><div className="mt-1 text-xs text-[#8e9ab2]">stops recorded</div></div><div><div className="text-3xl font-bold text-[#8f83ff]"><Money amount={expected}/></div><div className="mt-1 text-xs text-[#8e9ab2]">expected</div></div></div>
      <p className="mt-5 border-t border-[#202a3d] pt-4 text-xs leading-5 text-[#8e9ab2]">Expected earnings come from your own entries and saved pay structure. They are not confirmed pay until compared with your statement.</p>
    </div>

    {mode==="idle" && <div className="space-y-3">
      <button onClick={()=>setMode("manual")} className="flex w-full items-center gap-4 rounded-2xl border border-[#302a5b] bg-[#17152b] p-4 text-left active:scale-[.99]"><div className="rounded-xl bg-[#7567ff]/15 p-3 text-[#8f83ff]"><Keyboard/></div><div className="flex-1"><div className="font-semibold">Enter statement manually</div><div className="mt-1 text-xs text-[#8e9ab2]">Free · compare totals or enter figures by day</div></div></button>
      <button className="flex w-full items-center gap-4 rounded-2xl border border-[#302a5b] bg-gradient-to-r from-[#1a1730] to-[#111827] p-4 text-left active:scale-[.99]"><div className="rounded-xl bg-[#7567ff]/15 p-3 text-[#8f83ff]"><Upload/></div><div className="flex-1"><div className="flex items-center gap-2 font-semibold">Upload statement <span className="rounded-full bg-[#7567ff] px-2 py-0.5 text-[9px] font-bold">PRO</span></div><div className="mt-1 text-xs text-[#8e9ab2]">Photo, screenshot or PDF · AI-assisted extraction</div></div><LockKeyhole className="h-4 w-4 text-[#69758d]"/></button>
    </div>}

    {mode==="manual" && <div className="space-y-4 rounded-2xl border border-[#302a5b] bg-[#111827] p-5">
      <div><h2 className="text-lg font-bold">Statement totals</h2><p className="mt-1 text-xs text-[#8e9ab2]">Enter the totals shown on the statement. Add daily figures below if you want Stop Tracker to identify exact dates.</p></div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-[#8e9ab2]">Statement stops<input inputMode="numeric" value={statementStops} onChange={e=>setStatementStops(e.target.value)} placeholder="0" className="mt-2 h-12 w-full rounded-xl border border-[#2a3550] bg-[#0b111d] px-3 text-lg font-bold text-white outline-none focus:border-[#7567ff]"/></label>
        <label className="text-xs text-[#8e9ab2]">Statement amount (£)<input inputMode="decimal" value={statementAmount} onChange={e=>setStatementAmount(e.target.value)} placeholder="0.00" className="mt-2 h-12 w-full rounded-xl border border-[#2a3550] bg-[#0b111d] px-3 text-lg font-bold text-white outline-none focus:border-[#7567ff]"/></label>
      </div>
      {period.length>0 && <div>
        <button onClick={()=>setShowDates(!showDates)} className="flex w-full items-center justify-between border-t border-[#202a3d] pt-4 text-sm font-semibold"><span>Optional: compare by date</span>{showDates?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</button>
        {showDates && <div className="mt-3 space-y-2">{period.map(l=><div key={l.date} className="rounded-xl border border-[#202a3d] bg-[#0d1422] p-3">
          <div className="mb-2 flex justify-between text-xs"><span className="font-semibold">{gbDate(l.date)}</span><span className="text-[#77839a]">Your record: {l.stops} · <Money amount={l.total}/></span></div>
          <div className="grid grid-cols-2 gap-2"><input inputMode="numeric" placeholder="Statement stops" value={daily[l.date]?.stops??""} onChange={e=>updateDaily(l.date,"stops",e.target.value)} className="h-10 rounded-lg border border-[#26314a] bg-[#090f1a] px-2 text-sm outline-none focus:border-[#7567ff]"/><input inputMode="decimal" placeholder="Statement £" value={daily[l.date]?.amount??""} onChange={e=>updateDaily(l.date,"amount",e.target.value)} className="h-10 rounded-lg border border-[#26314a] bg-[#090f1a] px-2 text-sm outline-none focus:border-[#7567ff]"/></div>
        </div>)}</div>}
      </div>}
      <button onClick={compare} disabled={!hasDaily && statementStops==="" && statementAmount===""} className="h-14 w-full rounded-2xl bg-[#7567ff] font-bold text-white disabled:opacity-40">Compare with my records</button>
      <button onClick={reset} className="w-full text-xs text-[#7f8ba3]">Cancel</button>
    </div>}

    {compared && <div className={`rounded-2xl border p-5 ${matches?"border-emerald-500/30 bg-emerald-500/5":"border-amber-500/30 bg-amber-500/5"}`}>
      <div className="flex items-start gap-3">{matches?<CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-400"/>:<AlertTriangle className="mt-0.5 h-6 w-6 text-amber-400"/>}<div><h2 className="text-xl font-bold">{matches?"Everything matches":"Difference found"}</h2><p className="mt-1 text-sm text-[#9aa6bd]">{matches?"The statement totals match your Stop Tracker record.":"Your statement does not match your independent record."}</p></div></div>
      <div className="mt-5 overflow-hidden rounded-xl border border-[#293249]">
        <div className="grid grid-cols-3 bg-[#0c1320] p-3 text-[10px] font-bold tracking-wider text-[#77839a]"><span></span><span>STOPS</span><span>AMOUNT</span></div>
        <div className="grid grid-cols-3 border-t border-[#293249] p-3 text-sm"><span className="font-semibold">Your record</span><span>{stops}</span><Money amount={expected}/></div>
        <div className="grid grid-cols-3 border-t border-[#293249] p-3 text-sm"><span className="font-semibold">Statement</span><span>{statementStopsNum}</span><Money amount={statementAmountNum}/></div>
        <div className="grid grid-cols-3 border-t border-[#293249] p-3 text-sm font-bold"><span>Difference</span><span className={stopDiff<0?"text-amber-400":"text-emerald-400"}>{stopDiff>0?"+":""}{stopDiff}</span><span className={moneyDiff<0?"text-amber-400":"text-emerald-400"}>{moneyDiff>0?"+":""}<Money amount={moneyDiff}/></span></div>
      </div>
      {discrepancies.length>0 && <div className="mt-5"><p className="mb-2 text-xs font-bold tracking-[.16em] text-[#77839a]">DATES TO CHECK</p><div className="space-y-2">{discrepancies.map(l=><div key={l.date} className="rounded-xl border border-amber-500/20 bg-[#111827] p-3"><div className="font-semibold">{gbDate(l.date)}</div><div className="mt-2 grid grid-cols-2 gap-3 text-xs text-[#9aa6bd]"><div>You: <strong className="text-white">{l.stops} stops · <Money amount={l.total}/></strong></div><div>Statement: <strong className="text-amber-300">{n(daily[l.date]?.stops)} stops · <Money amount={n(daily[l.date]?.amount)}/></strong></div></div></div>)}</div></div>}
      {!hasDaily && !matches && <p className="mt-4 text-xs leading-5 text-[#9aa6bd]">You compared totals only. Enter the statement figures by date to identify exactly where the discrepancy occurred.</p>}
      <button onClick={()=>setMode("manual")} className="mt-5 h-12 w-full rounded-xl border border-[#343d57] bg-[#111827] text-sm font-semibold">Edit statement figures</button>
      <button onClick={reset} className="mt-2 w-full py-2 text-xs text-[#7f8ba3]">Start over</button>
    </div>}

    <button onClick={()=>navigate("/app/invoice")} className="w-full rounded-2xl border border-[#202a3d] bg-[#111827] p-4 text-sm font-semibold">Need to send your invoice? <span className="text-[#8f83ff]">Open Invoice →</span></button>
  </div>
};
export default CheckPayV4;
