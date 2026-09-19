import React, { useMemo } from "react";
import { useData } from "../contexts/DataContext";
import { listPeriods } from "../features/payperiod/periods";
import { Money } from "./ui/money";
import { CheckCircle2, ChevronRight, Clock3, FileCheck2, FileText, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PERIOD_STATUS = {
  in_progress: { label:"In Progress", icon:Clock3, cls:"text-[#8f83ff] bg-[#7567ff]/10" },
  complete: { label:"Period Complete", icon:CheckCircle2, cls:"text-emerald-400 bg-emerald-500/10" },
  invoice_sent: { label:"Invoice Sent", icon:Send, cls:"text-sky-400 bg-sky-500/10" },
  awaiting_statement: { label:"Awaiting Statement", icon:FileText, cls:"text-amber-300 bg-amber-500/10" },
  ready_to_check: { label:"Ready to Check", icon:FileCheck2, cls:"text-amber-300 bg-amber-500/10" },
  reconciled: { label:"Reconciled", icon:CheckCircle2, cls:"text-emerald-400 bg-emerald-500/10" },
};

export const inferredStatus = (period, record, currentId) => record?.status || (period.id===currentId ? "in_progress" : "complete");

const PeriodHistoryV4 = ({ compact=false }) => {
  const { logs=[], payPeriodAnchor, periodRecords={}, updatePeriodRecord } = useData();
  const navigate=useNavigate();
  const anchor=payPeriodAnchor || new Date().toISOString().split("T")[0];
  const periods=useMemo(()=>listPeriods(logs,anchor,compact?3:8),[logs,anchor,compact]);
  const currentId=periods[0]?.id;

  const advance = async (period,status) => {
    const next = status==="invoice_sent"?"awaiting_statement":status==="awaiting_statement"?"ready_to_check":null;
    if(next) await updatePeriodRecord(period.id,{status:next});
  };

  return <div className="space-y-3">{periods.map((p,i)=>{
    const record=periodRecords[p.id]||{};
    const status=inferredStatus(p,record,currentId);
    const meta=PERIOD_STATUS[status]||PERIOD_STATUS.in_progress;
    const Icon=meta.icon;
    return <div key={p.id} className="rounded-2xl border border-[#202a3d] bg-[#111827] p-4">
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-sm font-bold">{new Date(p.start+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})} — {new Date(p.end+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div><div className="mt-1 text-xs text-[#7f8ba3]">{p.daysLogged} days logged</div></div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.cls}`}><Icon className="h-3 w-3"/>{meta.label}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4"><div><div className="text-xl font-bold">{p.stops.toLocaleString("en-GB")}</div><div className="text-[11px] text-[#7f8ba3]">stops</div></div><div><div className="text-xl font-bold text-[#8f83ff]"><Money amount={p.expected}/></div><div className="text-[11px] text-[#7f8ba3]">expected</div></div></div>
      {status==="complete" && <button onClick={()=>navigate("/app/invoice",{state:{periodId:p.id,startDate:p.start,endDate:p.end,amount:p.expected,stops:p.stops}})} className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#302a5b] bg-[#17152b] p-3 text-sm font-semibold"><span>Generate invoice</span><ChevronRight className="h-4 w-4"/></button>}
      {status==="invoice_sent" && <button onClick={()=>advance(p,status)} className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#26314a] bg-[#0d1422] p-3 text-sm font-semibold"><span>Mark invoice sent</span><ChevronRight className="h-4 w-4"/></button>}
      {status==="awaiting_statement" && <button onClick={()=>advance(p,status)} className="mt-4 flex w-full items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm font-semibold"><span>Statement received</span><ChevronRight className="h-4 w-4"/></button>}
      {status==="ready_to_check" && <button onClick={()=>navigate("/app/check-pay",{state:{periodId:p.id}})} className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#7567ff] p-3 text-sm font-bold text-white"><span>Check statement</span><ChevronRight className="h-4 w-4"/></button>}
      {status==="reconciled" && record.differenceAmount!=null && <div className="mt-4 border-t border-[#202a3d] pt-3 text-xs text-[#8e9ab2]">Final difference: <strong className={Math.abs(record.differenceAmount)<0.01?"text-emerald-400":"text-amber-300"}><Money amount={record.differenceAmount}/></strong></div>}
    </div>
  })}</div>;
};
export default PeriodHistoryV4;
