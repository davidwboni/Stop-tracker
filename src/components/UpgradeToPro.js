import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { startProCheckout } from "../services/billing";

const plans = [
  { id: "monthly", label: "Monthly", price: "£4.99", suffix: "/month" },
  { id: "annual", label: "Annual", price: "£49.99", suffix: "/year", note: "Save £9.89 a year" },
];

export default function UpgradeToPro() {
  const [plan, setPlan] = useState("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const checkout = async () => {
    setLoading(true); setError("");
    try { await startProCheckout(plan); }
    catch (e) { setError(e?.message || "Could not open secure checkout."); setLoading(false); }
  };
  return <div className="mx-auto max-w-xl pb-28 pt-3">
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="space-y-5">
      <div><div className="text-xs font-bold uppercase tracking-[.18em] text-[#8f83ff]">Stop Tracker Pro</div>
      <h1 className="mt-2 text-3xl font-bold">More power when you need it.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Keep the core tracker free. Upgrade for AI statement checks, full route optimisation and premium tools.</p></div>
      <div className="grid grid-cols-2 gap-3">{plans.map(p=><button key={p.id} onClick={()=>setPlan(p.id)} className={`relative rounded-2xl border p-4 text-left transition-all ${plan===p.id?"border-[#786cff] bg-[#786cff]/10":"border-border bg-card"}`}>
        {p.note&&<span className="absolute -top-2 right-2 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white">{p.note}</span>}
        <div className="text-sm font-semibold">{p.label}</div><div className="mt-2 text-2xl font-bold">{p.price}<span className="text-xs font-normal text-muted-foreground">{p.suffix}</span></div>
      </button>)}</div>
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">{["AI-assisted statement checking","Full route optimisation","Premium tools as they are released","Core work and earnings ledger stays free"].map(x=><div key={x} className="flex gap-3 text-sm"><Check className="h-5 w-5 shrink-0 text-emerald-500"/><span>{x}</span></div>)}</div>
      <button onClick={checkout} disabled={loading} className="h-13 w-full rounded-2xl bg-[#786cff] px-4 py-4 font-bold text-white disabled:opacity-60">{loading?<span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin"/>Opening secure checkout…</span>:`Continue with ${plan==="annual"?"£49.99/year":"£4.99/month"}`}</button>
      {error&&<p className="text-center text-sm text-red-400">{error}</p>}
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4"/>Payments and subscription management are handled securely by Stripe.</p>
    </motion.div>
  </div>;
}
