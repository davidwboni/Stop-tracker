import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {trackProductEvent as track} from '../services/productAnalytics';
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { startProCheckout } from "../services/billing";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../services/firebase";

const plans = [
  { id: "monthly", label: "Monthly", price: "£4.99", suffix: "/month" },
  { id: "annual", label: "Annual", price: "£49.99", suffix: "/year", note: "Save £9.89 a year" },
];

export default function UpgradeToPro() {
  const lock=useRef(false);
  useEffect(()=>{track('pro_viewed');},[]);
  const [plan, setPlan] = useState("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const isGuest = !!user?.isGuest || !!auth.currentUser?.isAnonymous;

  const checkout = async () => {
    if(lock.current)return;
    lock.current=true;
    if (isGuest) {
      setError("");
      try{sessionStorage.setItem("stopTrackerReturnAfterAuth", "/app/upgrade");}catch(_){}
      try{await auth.signOut();}catch(_){setError('Could not sign out. Please retry.');lock.current=false;return;}
      lock.current=false;
      navigate("/login?returnTo=%2Fapp%2Fupgrade");
      return;
    }

    setLoading(true);
    setError("");
    try {
      track('checkout_started');
      await startProCheckout(plan);
    } catch (e) {
      const code = String(e?.code || "");
      const message = String(e?.message || "");
      if (code.includes("unauthenticated")) {
        setError("Please sign in to your Stop Tracker account before subscribing.");
      } else if (code.includes("failed-precondition")) {
        setError(message.replace(/^Firebase:\s*/i, "") || "Stripe billing is not configured correctly yet.");
      } else {
        setError(message.replace(/^Firebase:\s*/i, "") || "Could not open checkout.");
      }
      setLoading(false);lock.current=false;
    }
  };
  return <div className="home-screen st-page" style={{maxWidth:640}}>
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="space-y-5">
      <div><div className="text-xs font-bold uppercase tracking-[.18em] text-[#8f83ff]">Stop Tracker Pro</div>
      <h1 className="mt-2 text-3xl font-bold">More power when you need it.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Keep the core tracker free. Upgrade for AI statement checks, full route optimisation and premium tools.</p></div>
      <p className="home-muted text-sm">Choose monthly or annual billing. The selected amount is charged each billing period until cancelled.</p>
      <div className="grid grid-cols-2 gap-3">{plans.map(p=><button key={p.id} aria-pressed={plan===p.id} disabled={loading} onClick={()=>setPlan(p.id)} className={`relative rounded-2xl border p-4 text-left transition-all ${plan===p.id?"border-[#786cff] bg-[#786cff]/10":"border-border bg-card"}`}>
        {p.note&&<span className="absolute -top-2 right-2 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white">{p.note}</span>}
        <div className="text-sm font-semibold">{p.label}</div><div className="mt-2 text-2xl font-bold">{p.price}<span className="text-xs font-normal text-muted-foreground">{p.suffix}</span></div>
      </button>)}</div>
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">{["AI-assisted statement checking","Full route optimisation","AI expense receipt extraction","Daily tracking, manual expenses and manual statement comparison stay free"].map(x=><div key={x} className="flex gap-3 text-sm"><Check className="h-5 w-5 shrink-0 text-emerald-500"/><span>{x}</span></div>)}</div>
      {isGuest && (
        <div className="rounded-2xl border border-[#786cff]/30 bg-[#786cff]/10 p-4 text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">Sign in before subscribing</div>
          <p className="mt-1 leading-5">Pro is linked to your permanent account. Guest records are not transferred automatically; export them from Profile before switching accounts.</p>
        </div>
      )}
      <button onClick={checkout} disabled={loading} className="h-13 w-full rounded-2xl bg-[#786cff] px-4 py-4 font-bold text-white disabled:opacity-60">{loading?<span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin"/>Opening checkout…</span>:isGuest?"Sign in to continue":`Continue with ${plan==="annual"?"£49.99/year":"£4.99/month"}`}</button>
      {error&&<p className="text-center text-sm text-red-400">{error}</p>}
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4"/>Payment and subscription management are handled by Stripe.</p>
    </motion.div>
  </div>;
}
