import React, { useMemo } from "react";
import { useData } from "../contexts/DataContext";
import { getPeriodForDate, summarizePeriod, listPeriods } from "../features/payperiod/periods";
import { Money } from "./ui/money";
import { BarChart3, CalendarDays, Gauge, Trophy } from "lucide-react";

const StatsPage=()=>{
 const {logs=[],payPeriodAnchor}=useData();
 const today=new Date().toISOString().split("T")[0];
 const def=useMemo(()=>getPeriodForDate(payPeriodAnchor||today,new Date()),[payPeriodAnchor,today]);
 const current=useMemo(()=>summarizePeriod(logs,def),[logs,def]);
 const previous=useMemo(()=>listPeriods(logs,payPeriodAnchor||today,2)[1],[logs,payPeriodAnchor,today]);
 const days=[...current.logs].sort((a,b)=>(Number(b.stops)||0)-(Number(a.stops)||0));
 const best=days[0]; const avg=current.daysLogged?current.stops/current.daysLogged:0;
 const delta=previous?.stops?((current.stops-previous.stops)/previous.stops)*100:null;
 return <div className="mx-auto max-w-2xl space-y-5 pb-24 pt-2">
  <div><div className="mb-3 inline-flex rounded-2xl bg-[#7567ff]/10 p-3 text-[#8f83ff]"><BarChart3/></div><h1 className="text-3xl font-bold">Insights</h1><p className="mt-2 text-sm text-[#8e9ab2]">Useful numbers from your work ledger, centred on your current pay period.</p></div>
  <div className="grid grid-cols-2 gap-3">
   <div className="rounded-2xl border border-[#202a3d] bg-[#111827] p-4"><CalendarDays className="mb-4 h-5 w-5 text-[#8f83ff]"/><div className="text-2xl font-bold">{current.stops.toLocaleString("en-GB")}</div><div className="text-xs text-[#7f8ba3]">period stops</div></div>
   <div className="rounded-2xl border border-[#202a3d] bg-[#111827] p-4"><Gauge className="mb-4 h-5 w-5 text-[#8f83ff]"/><div className="text-2xl font-bold">{Math.round(avg)}</div><div className="text-xs text-[#7f8ba3]">avg stops / workday</div></div>
   <div className="rounded-2xl border border-[#202a3d] bg-[#111827] p-4"><div className="mb-4 text-xs font-bold text-[#8f83ff]">EXPECTED</div><div className="text-2xl font-bold"><Money amount={current.expected}/></div><div className="text-xs text-[#7f8ba3]">this period</div></div>
   <div className="rounded-2xl border border-[#202a3d] bg-[#111827] p-4"><Trophy className="mb-4 h-5 w-5 text-amber-300"/><div className="text-2xl font-bold">{best?.stops||0}</div><div className="text-xs text-[#7f8ba3]">best day stops</div></div>
  </div>
  <div className="rounded-2xl border border-[#202a3d] bg-[#111827] p-5"><div className="text-xs font-bold tracking-[.16em] text-[#69758d]">PERIOD PACE</div><div className="mt-3 text-lg font-bold">{delta==null?"Building your baseline":delta>=0?`+${delta.toFixed(1)}% vs previous period`:`${delta.toFixed(1)}% vs previous period`}</div><p className="mt-1 text-xs leading-5 text-[#8e9ab2]">Comparison uses stops recorded in the current and previous four-week periods. An incomplete current period will naturally be lower.</p></div>
  {best&&<div className="rounded-2xl border border-[#202a3d] bg-[#0d1422] p-5"><div className="text-xs font-bold tracking-[.16em] text-[#69758d]">BEST RECORDED DAY</div><div className="mt-3 flex items-end justify-between"><div><div className="font-bold">{new Date(best.date+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"short"})}</div><div className="mt-1 text-sm text-[#8e9ab2]">{best.stops} stops</div></div><div className="text-xl font-bold text-[#8f83ff]"><Money amount={best.total}/></div></div></div>}
 </div>
};
export default StatsPage;