import React, { useEffect, useMemo, useState } from "react";
import { useData } from "../contexts/DataContext";
import { Money } from "./ui/money";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Keyboard, ShieldCheck, Upload, Sparkles, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { getPeriodForDate, getPeriodLogs, listPeriods } from "../features/payperiod/periods";
import { extractStatement, getPremiumStatus } from "../services/premium";

const n = (v) => Number(v) || 0;
const gbDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});

const CheckPayV4 = () => {
  const { logs = [], payPeriodAnchor, updatePayPeriodAnchor, updatePeriodRecord } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode,setMode] = useState("idle");
  const [statementStops,setStatementStops] = useState("");
  const [statementAmount,setStatementAmount] = useState("");
  const [extraPayments,setExtraPayments] = useState("");
  const [charges,setCharges] = useState("");
  const [vat,setVat] = useState("");
  const [finalInvoice,setFinalInvoice] = useState("");
  const [daily,setDaily] = useState({});
  const [showDates,setShowDates] = useState(true);
  const [aiUses,setAiUses] = useState(0);
  const [isPro,setIsPro] = useState(false);
  const [aiFile,setAiFile] = useState(null);
  const [aiLoading,setAiLoading] = useState(false);
  const [aiError,setAiError] = useState("");
  useEffect(()=>{ getPremiumStatus().then(s=>{setAiUses(s.statementAiUses||0);setIsPro(!!s.isPro)}).catch(()=>{}); },[]);

  const today = new Date().toISOString().split("T")[0];
  const periodDef = useMemo(() => {
    const all=listPeriods(logs,payPeriodAnchor || today,12);
    return all.find(p=>p.id===location.state?.periodId) || getPeriodForDate(payPeriodAnchor || today, new Date());
  }, [logs,payPeriodAnchor,today,location.state]);
  const period = useMemo(() => getPeriodLogs(logs,periodDef).sort((a,b)=>a.date.localeCompare(b.date)), [logs,periodDef]);
  const stops=period.reduce((s,l)=>s+n(l.stops),0);
  const expected=period.reduce((s,l)=>s+n(l.total),0);
  const dailyComplete = period.length > 0 && period.every(l => daily[l.date]?.stops !== "" && daily[l.date]?.stops != null && daily[l.date]?.amount !== "" && daily[l.date]?.amount != null);
  const hasDaily = Object.keys(daily).length > 0;
  const statementStopsNum = dailyComplete ? period.reduce((s,l)=>s+n(daily[l.date]?.stops),0) : n(statementStops);
  const statementAmountNum = dailyComplete ? period.reduce((s,l)=>s+n(daily[l.date]?.amount),0) : n(statementAmount);
  const stopDiff = statementStopsNum - stops;
  const moneyDiff = statementAmountNum - expected;
  const compared = mode === "result";
  const matches = compared && stopDiff === 0 && Math.abs(moneyDiff) < 0.01;
  const discrepancies = period.filter(l => {
    const d=daily[l.date]; if(!d) return false;
    return n(d.stops)!==n(l.stops) || Math.abs(n(d.amount)-n(l.total))>=0.01;
  });

  const updateDaily=(date,key,value)=>setDaily(prev=>({...prev,[date]:{stops:prev[date]?.stops??"",amount:prev[date]?.amount??"",[key]:value}}));
  const compare=async()=>{ setMode("result"); await updatePeriodRecord(periodDef.id,{status:"reconciled",statementStops:statementStopsNum,statementAmount:statementAmountNum,extraPayments:n(extraPayments),charges:n(charges),vat:n(vat),finalInvoiceAmount:n(finalInvoice)||statementAmountNum,differenceStops:stopDiff,differenceAmount:moneyDiff,reconciledAt:new Date().toISOString()}); };
  const reset=()=>{setMode("idle");setStatementStops("");setStatementAmount("");setExtraPayments("");setCharges("");setVat("");setFinalInvoice("");setDaily({});setAiFile(null);};
  const chooseAiFile=(file)=>{if(!file)return;setAiFile(file);setMode("ai-review");};
  const runAi=async()=>{setAiLoading(true);setAiError("");try{const result=await extractStatement(aiFile);if(result.statementStops!=null)setStatementStops(String(result.statementStops));if(result.statementAmount!=null)setStatementAmount(String(result.statementAmount));const nextDaily={};(result.daily||[]).forEach(d=>{if(d.date)nextDaily[d.date]={stops:d.stops??"",amount:d.amount??""};});setDaily(nextDaily);const s=await getPremiumStatus();setAiUses(s.statementAiUses||0);setIsPro(!!s.isPro);setAiFile(null);setMode("manual");}catch(e){setAiError(e?.message||"Could not read this statement.");}finally{setAiLoading(false);}};

  return <div className="mx-auto max-w-2xl space-y-4 pb-24 -mt-2">
    <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold tracking-tight">Check Pay</h1><span className="text-xs text-[#8e9ab2]">Compare · verify</span></div>

    <div className="rounded-2xl border border-[#202a3d] bg-[#111827] p-4">
      <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-bold tracking-[.16em] text-[#69758d]">YOUR RECORDS</div><div className="mt-1 text-xs text-[#8e9ab2]">{new Date(periodDef.start+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})} — {new Date(periodDef.end+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div></div><label className="text-[9px] text-[#69758d]">CHANGE PERIOD<input type="date" value={payPeriodAnchor || today} onChange={e=>updatePayPeriodAnchor(e.target.value)} className="mt-1 block rounded-lg border border-[#26314a] bg-[#090f1a] p-2 text-xs text-white"/></label></div>
      <div className="mt-4 flex items-end justify-between gap-4"><div><div className="text-2xl font-bold">{stops.toLocaleString("en-GB")}</div><div className="text-[11px] text-[#8e9ab2]">stops</div></div><div className="text-right"><div className="text-2xl font-bold text-[#8f83ff]"><Money amount={expected}/></div><div className="text-[11px] text-[#8e9ab2]">expected earnings</div></div></div>
    </div>

    {mode==="idle" && <div className="space-y-3">
      <button onClick={()=>setMode("manual")} className="flex w-full items-center gap-4 rounded-2xl border border-[#302a5b] bg-[#17152b] p-4 text-left active:scale-[.99]"><div className="rounded-xl bg-[#7567ff]/15 p-3 text-[#8f83ff]"><Keyboard/></div><div className="flex-1"><div className="font-semibold">Enter statement manually</div><div className="mt-1 text-xs text-[#8e9ab2]">Free · compare totals or enter figures by day</div></div></button>
      <label className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-[#302a5b] bg-gradient-to-r from-[#1a1730] to-[#111827] p-4 text-left active:scale-[.99]"><div className="rounded-xl bg-[#7567ff]/15 p-3 text-[#8f83ff]"><Sparkles/></div><div className="flex-1"><div className="flex items-center gap-2 font-semibold">Upload statement with AI <span className="rounded-full bg-[#7567ff] px-2 py-0.5 text-[9px] font-bold">PRO</span></div><div className="mt-1 text-xs text-[#8e9ab2]">{isPro?"Pro · AI statement checks included":aiUses<3?`${3-aiUses} of 3 free AI checks remaining · photo or screenshot`:"Free AI checks used · Pro required for further AI checks"}</div><div className="mt-1 text-[10px] text-[#69758d]">The original upload is for processing only and is not saved to your Stop Tracker account.</div></div><Upload className="h-4 w-4 text-[#8f83ff]"/><input type="file" accept="image/*,.pdf,application/pdf" capture="environment" disabled={!isPro && aiUses>=3} onChange={e=>chooseAiFile(e.target.files?.[0])} className="sr-only"/></label>
    </div>}

    {mode==="ai-review" && <div className="rounded-2xl border border-[#302a5b] bg-[#111827] p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#7567ff]/15 p-3 text-[#8f83ff]"><Sparkles/></div><div><h2 className="text-lg font-bold">AI statement check</h2><p className="mt-1 text-xs leading-5 text-[#8e9ab2]">Selected: {aiFile?.name}. Stop Tracker sends this image securely to DeepSeek for extraction, returns the figures for your confirmation, and does not save the original image to your Stop Tracker account.</p></div></div>{aiError&&<div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">{aiError}</div>}<button onClick={runAi} disabled={aiLoading} className="mt-4 h-12 w-full rounded-xl bg-[#7567ff] text-sm font-bold text-white disabled:opacity-60">{aiLoading?"Reading statement…":"Read statement with AI"}</button><button onClick={()=>{setAiFile(null);setMode("idle")}} className="mt-2 flex h-10 w-full items-center justify-center gap-2 text-xs text-[#7f8ba3]"><Trash2 className="h-3.5 w-3.5"/>Discard file</button></div>}

    {mode==="manual" && <div className="space-y-4 rounded-2xl border border-[#302a5b] bg-[#111827] p-5">
      <div><h2 className="text-lg font-bold">Statement totals</h2><p className="mt-1 text-xs text-[#8e9ab2]">Enter the totals shown on the statement. Add daily figures below if you want Stop Tracker to identify exact dates.</p></div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-[#8e9ab2]">Statement stops<input inputMode="numeric" value={statementStops} onChange={e=>setStatementStops(e.target.value)} placeholder="0" className="mt-2 h-12 w-full rounded-xl border border-[#2a3550] bg-[#0b111d] px-3 text-lg font-bold text-white outline-none focus:border-[#7567ff]"/></label>
        <label className="text-xs text-[#8e9ab2]">Statement amount (£)<input inputMode="decimal" value={statementAmount} onChange={e=>setStatementAmount(e.target.value)} placeholder="0.00" className="mt-2 h-12 w-full rounded-xl border border-[#2a3550] bg-[#0b111d] px-3 text-lg font-bold text-white outline-none focus:border-[#7567ff]"/></label>
      </div>
      <details className="rounded-xl border border-[#26314a] bg-[#0d1422] p-3"><summary className="cursor-pointer text-sm font-semibold">Statement adjustments <span className="text-xs font-normal text-[#7f8ba3]">(optional)</span></summary><p className="mt-2 text-xs leading-5 text-[#7f8ba3]">Record the extras, deductions and VAT shown on the contractor statement for transparency.</p><div className="mt-3 grid grid-cols-2 gap-2"><input inputMode="decimal" value={extraPayments} onChange={e=>setExtraPayments(e.target.value)} placeholder="Extra payments £" className="h-11 rounded-lg border border-[#26314a] bg-[#090f1a] px-3 text-sm"/><input inputMode="decimal" value={charges} onChange={e=>setCharges(e.target.value)} placeholder="Charges £" className="h-11 rounded-lg border border-[#26314a] bg-[#090f1a] px-3 text-sm"/><input inputMode="decimal" value={vat} onChange={e=>setVat(e.target.value)} placeholder="VAT £" className="h-11 rounded-lg border border-[#26314a] bg-[#090f1a] px-3 text-sm"/><input inputMode="decimal" value={finalInvoice} onChange={e=>setFinalInvoice(e.target.value)} placeholder="Final to invoice £" className="h-11 rounded-lg border border-[#26314a] bg-[#090f1a] px-3 text-sm"/></div></details>
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

    <button onClick={()=>navigate("/app/invoice",{state:{periodId:periodDef.id,statementAmount:n(finalInvoice)||statementAmountNum}})} className="w-full rounded-2xl border border-[#202a3d] bg-[#111827] p-4 text-sm font-semibold">{compared?"Statement checked — create your invoice":"Need to send your invoice?"} <span className="text-[#8f83ff]">Open Invoice →</span></button>
  </div>
};
export default CheckPayV4;
