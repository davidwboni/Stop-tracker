import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { Card, CardContent } from "./ui/card";
import StopEntryForm from "./StopEntryForm";
import { Money } from "./ui/money";
import { ArrowRight, BarChart3, FileText, MapPin, ShieldCheck, UserCircle } from "lucide-react";
import { getPeriodForDate, summarizePeriod } from "../features/payperiod/periods";

const dateKey = (d) => d.toISOString().split("T")[0];
const startOfCurrentPeriod = () => {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - 27);
  return d;
};

const SimpleDashboard = () => {
  const { user } = useAuth();
  const { logs = [], updateLogs, loading, payPeriodAnchor } = useData();
  const navigate = useNavigate();
  const today = dateKey(new Date());

  const todayLog = useMemo(() => logs.find((l) => l.date === today), [logs, today]);
  const periodDef = useMemo(() => getPeriodForDate(payPeriodAnchor || today, new Date()), [payPeriodAnchor, today]);
  const period = useMemo(() => summarizePeriod(logs, periodDef), [logs, periodDef]);

  const recent = useMemo(() => [...logs].filter(l => l.date <= today).sort((a,b) => b.date.localeCompare(a.date)).slice(0,3), [logs, today]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const startLabel = new Date(period.start+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  const endLabel = new Date(period.end+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"});

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7567ff] border-t-transparent"/></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-24">
      <header className="flex items-start justify-between pt-2">
        <div>
          <p className="mb-1 text-sm text-[#8e9ab2]">{greeting}</p>
          <h1 className="text-3xl font-bold tracking-tight">{user?.displayName?.split(" ")[0] || "Driver"}</h1>
        </div>
        <button onClick={() => navigate("/app/profile")} aria-label="Open profile" className="rounded-2xl border border-[#202a3d] bg-[#111827] p-3 text-[#9aa6bd] active:scale-95">
          <UserCircle className="h-6 w-6"/>
        </button>
      </header>

      <section>
        <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[#69758d]">TODAY</p>
        {todayLog ? (
          <Card className="border-[#2a3450] bg-gradient-to-br from-[#151c2c] to-[#101624]">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">LOGGED ✓</span>
                <button onClick={() => navigate("/app/entries")} className="text-xs font-semibold text-[#8f83ff]">Edit entry</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-3xl font-bold">{todayLog.stops || 0}</div><div className="mt-1 text-xs text-[#8e9ab2]">stops</div></div>
                <div><div className="text-3xl font-bold text-[#8f83ff]"><Money amount={todayLog.total || 0}/></div><div className="mt-1 text-xs text-[#8e9ab2]">expected</div></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-[#302a5b] bg-gradient-to-br from-[#18152d] via-[#12182a] to-[#101624]">
            <CardContent className="p-5">
              <h2 className="text-xl font-bold">Log today's work</h2>
              <p className="mb-5 mt-1 text-sm text-[#929db2]">A few seconds now means no guesswork on payday.</p>
              <StopEntryForm logs={logs} updateLogs={updateLogs}/>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between">
          <div><p className="text-xs font-bold tracking-[0.18em] text-[#69758d]">CURRENT PAY PERIOD</p><p className="mt-1 text-xs text-[#8e9ab2]">{startLabel} — {endLabel}</p></div>
          <button onClick={() => navigate("/app/periods")} className="flex items-center gap-1 text-xs font-semibold text-[#8f83ff]">View periods <ArrowRight className="h-3.5 w-3.5"/></button>
        </div>
        <Card className="border-[#202a3d] bg-[#111827]">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-5">
              <div><div className="text-3xl font-bold">{period.stops.toLocaleString("en-GB")}</div><div className="mt-1 text-xs text-[#8e9ab2]">stops recorded</div></div>
              <div><div className="text-3xl font-bold text-[#8f83ff]"><Money amount={period.expected}/></div><div className="mt-1 text-xs text-[#8e9ab2]">expected earnings</div></div>
            </div>
            <div className="mt-5 border-t border-[#202a3d] pt-4 text-sm text-[#9aa6bd]">{period.daysLogged} work {period.daysLogged === 1 ? "day" : "days"} logged in this 4-week period</div>
          </CardContent>
        </Card>
      </section>

      <section>
        <p className="mb-2 text-xs font-bold tracking-[0.18em] text-[#69758d]">QUICK TOOLS</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            ["Routes",MapPin,"/app/routes",true],
            ["Invoice",FileText,"/app/invoice",false],
            ["Check Pay",ShieldCheck,"/app/check-pay",false],
            ["Insights",BarChart3,"/app/stats",false],
          ].map(([label,Icon,path,pro]) => <button key={label} onClick={() => navigate(path)} className="relative min-h-[88px] rounded-2xl border border-[#202a3d] bg-[#111827] px-2 py-3 active:scale-95">
            {pro && <span className="absolute right-1.5 top-1.5 rounded-full bg-[#7567ff] px-1.5 py-0.5 text-[8px] font-bold">PRO</span>}
            <Icon className="mx-auto mb-2 h-5 w-5 text-[#8f83ff]"/><span className="text-[11px] font-semibold">{label}</span>
          </button>)}
        </div>
      </section>

      {recent.length > 0 && <section>
        <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold tracking-[0.18em] text-[#69758d]">RECENT</p><button onClick={() => navigate("/app/entries")} className="text-xs font-semibold text-[#8f83ff]">View all</button></div>
        <div className="overflow-hidden rounded-2xl border border-[#202a3d] bg-[#111827]">
          {recent.map((log,i) => <button key={log.id || log.date} onClick={() => navigate("/app/entries")} className={`flex w-full items-center justify-between p-4 text-left active:bg-[#151d2d] ${i ? "border-t border-[#202a3d]" : ""}`}>
            <div><div className="text-sm font-semibold">{new Date(log.date+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</div><div className="mt-1 text-xs text-[#8e9ab2]">{log.stops || 0} stops</div></div>
            <div className="text-sm font-bold text-[#8f83ff]"><Money amount={log.total || 0}/></div>
          </button>)}
        </div>
      </section>}

      <p className="px-2 pt-2 text-center text-xs text-[#5f6a80]">Your work. Your records. Your pay.</p>
    </div>
  );
};
export default SimpleDashboard;
