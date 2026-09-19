import React, { useMemo } from "react";
import { useData } from "../contexts/DataContext";
import { Money } from "./ui/money";
import { ShieldCheck, Upload, Keyboard, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CheckPayV4 = () => {
  const { logs = [] } = useData();
  const navigate = useNavigate();
  const cutoff = useMemo(() => { const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-27); return d; }, []);
  const period = useMemo(() => logs.filter(l => new Date(l.date+"T00:00:00") >= cutoff && l.date <= new Date().toISOString().split("T")[0]), [logs,cutoff]);
  const stops=period.reduce((s,l)=>s+(Number(l.stops)||0),0);
  const expected=period.reduce((s,l)=>s+(Number(l.total)||0),0);
  return <div className="mx-auto max-w-2xl space-y-5 pb-24 pt-2">
    <div><div className="mb-3 inline-flex rounded-2xl bg-[#7567ff]/10 p-3 text-[#8f83ff]"><ShieldCheck/></div><h1 className="text-3xl font-bold tracking-tight">Check Pay</h1><p className="mt-2 max-w-lg text-sm leading-6 text-[#8e9ab2]">When your four-week statement arrives, compare it with the independent record you built in Stop Tracker.</p></div>
    <div className="rounded-2xl border border-[#202a3d] bg-[#111827] p-5">
      <p className="text-xs font-bold tracking-[.18em] text-[#69758d]">YOUR CURRENT RECORD</p>
      <div className="mt-4 grid grid-cols-2 gap-4"><div><div className="text-3xl font-bold">{stops.toLocaleString("en-GB")}</div><div className="mt-1 text-xs text-[#8e9ab2]">stops recorded</div></div><div><div className="text-3xl font-bold text-[#8f83ff]"><Money amount={expected}/></div><div className="mt-1 text-xs text-[#8e9ab2]">expected</div></div></div>
      <p className="mt-5 border-t border-[#202a3d] pt-4 text-xs leading-5 text-[#8e9ab2]">Expected earnings are based on your own entries and saved pay structure. They are not confirmed pay until you compare your statement.</p>
    </div>
    <div className="space-y-3">
      <button className="flex w-full items-center gap-4 rounded-2xl border border-[#302a5b] bg-[#17152b] p-4 text-left active:scale-[.99]"><div className="rounded-xl bg-[#7567ff]/15 p-3 text-[#8f83ff]"><Keyboard/></div><div className="flex-1"><div className="font-semibold">Enter statement manually</div><div className="mt-1 text-xs text-[#8e9ab2]">Free · compare the figures yourself</div></div></button>
      <button className="flex w-full items-center gap-4 rounded-2xl border border-[#302a5b] bg-gradient-to-r from-[#1a1730] to-[#111827] p-4 text-left active:scale-[.99]"><div className="rounded-xl bg-[#7567ff]/15 p-3 text-[#8f83ff]"><Upload/></div><div className="flex-1"><div className="flex items-center gap-2 font-semibold">Upload statement <span className="rounded-full bg-[#7567ff] px-2 py-0.5 text-[9px] font-bold">PRO</span></div><div className="mt-1 text-xs text-[#8e9ab2]">Photo, screenshot or PDF · AI-assisted extraction</div></div><LockKeyhole className="h-4 w-4 text-[#69758d]"/></button>
    </div>
    <div className="rounded-2xl border border-[#202a3d] bg-[#0d1422] p-4 text-sm text-[#8e9ab2]"><strong className="text-[#e8ebf2]">How it works:</strong> confirm the figures extracted from your statement before reconciliation. Stop Tracker will then highlight differences by date instead of silently changing your records.</div>
    <button onClick={()=>navigate("/app/invoice")} className="w-full rounded-2xl border border-[#202a3d] bg-[#111827] p-4 text-sm font-semibold">Need to send your invoice? <span className="text-[#8f83ff]">Open Invoice →</span></button>
  </div>
};
export default CheckPayV4;
