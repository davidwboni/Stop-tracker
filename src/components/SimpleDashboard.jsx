import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { Card, CardContent } from "./ui/card";
import DailyQuickEntry from "./DailyQuickEntry";
import { Money } from "./ui/money";
import { ArrowRight, Plus, UserCircle } from "lucide-react";
import { getPeriodForDate, summarizePeriod } from "../features/payperiod/periods";

const dateKey = (d) => d.toISOString().split("T")[0];
const SimpleDashboard = () => {
  const { user } = useAuth();
  const { logs = [], loading, payPeriodAnchor } = useData();
  const [quickOpen,setQuickOpen] = useState(false);
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

  useEffect(()=>{
    if(loading || todayLog) return;
    const dismissed=localStorage.getItem(`daily-quick-entry-dismissed-${today}`);
    if(new Date().getHours()>=13 && !dismissed) setQuickOpen(true);
  },[loading,todayLog,today]);
  const dismissQuick=()=>{localStorage.setItem(`daily-quick-entry-dismissed-${today}`,"1");setQuickOpen(false);};

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
          <Card className="border-[#302a5b] bg-gradient-to-br from-[#18152d] via-[#12182a] to-[#101624]">
            <CardContent className="p-5">
              <h2 className="text-xl font-bold">Ready when you are</h2>
              <p className="mt-1 text-sm text-[#929db2]">Log today's deliveries in a few seconds.</p>
              <button onClick={()=>setQuickOpen(true)} className="mt-4 h-14 w-full rounded-2xl bg-[#7567ff] text-sm font-bold text-white">Log today's work</button>
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

      {recent.length > 0 && <section>
        <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold tracking-[0.18em] text-[#69758d]">RECENT</p><button onClick={() => navigate("/app/entries")} className="text-xs font-semibold text-[#8f83ff]">View all</button></div>
        <div className="overflow-hidden rounded-2xl border border-[#202a3d] bg-[#111827]">
          {recent.map((log,i) => <button key={log.id || log.date} onClick={() => navigate("/app/entries")} className={`flex w-full items-center justify-between p-4 text-left active:bg-[#151d2d] ${i ? "border-t border-[#202a3d]" : ""}`}>
            <div><div className="text-sm font-semibold">{new Date(log.date+"T12:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</div><div className="mt-1 text-xs text-[#8e9ab2]">{log.stops || 0} stops</div></div>
            <div className="text-sm font-bold text-[#8f83ff]"><Money amount={log.total || 0}/></div>
          </button>)}
        </div>
      </section>}

      <button onClick={()=>setQuickOpen(true)} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#3a3370] bg-gradient-to-r from-[#5f50e8] to-[#7866ff] text-sm font-bold text-white shadow-lg shadow-[#7567ff]/10"><Plus className="h-5 w-5"/> {todayLog?"Update today’s entry":"Log today’s deliveries"}</button>\n      <p className="px-2 pt-2 text-center text-xs text-[#5f6a80]">Your work. Your records. Your pay.</p>\n      <DailyQuickEntry open={quickOpen} onClose={dismissQuick} onSaved={()=>setQuickOpen(false)}/>
    </div>
  );
};
export default SimpleDashboard;
