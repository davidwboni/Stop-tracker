import AnalyticsConsent from './AnalyticsConsent';
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Zap, Sparkles, FileText, ArrowRight, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import {trackProductEvent as track} from '../services/productAnalytics';
import SignInSheet from "./SignInSheet";

// App-style first-run screen, not a marketing website: one screen, no scroll,
// three benefits, and a single primary action that drops the user straight into
// the app as a guest (no separate "continue as guest" step).
const BENEFITS = [
  {
    icon: Zap,
    title: "Log your day",
    body: "Stops, parcels and optional extras. Save your day in seconds.",
  },
  {
    icon: Sparkles,
    title: "Know your earnings",
    body: "Describe how you get paid, then review and confirm your setup.",
  },
  {
    icon: FileText,
    title: "Check your pay",
    body: "Compare your records with the contractor statement. Understand the difference.",
  },
];

export default function LandingPage({ onContactUs, onPrivacyPolicy, onTermsOfService }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePreview,setActivePreview]=useState(null);
  const [previewStops,setPreviewStops]=useState('120');
  const [previewParcels,setPreviewParcels]=useState('158');
  const [showDifference,setShowDifference]=useState(false);

  useEffect(()=>{track('landing_viewed');},[]);
  const rise = {
    hidden: { opacity: 0, y: 14 },
    show: (i) => ({ opacity: 1, y: 0, transition: { delay: 0, duration: 0.2 } }),
  };

  return (
    <div className="relative min-h-[100dvh] bg-background overflow-x-hidden flex flex-col items-center px-6 pt-safe pb-safe">
      {/* Ambient depth behind the content. Decorative only. */}
      <div className="hidden w-72 h-72 bg-primary/25 -top-16 -left-20" aria-hidden="true" />
      <div
        className="hidden w-80 h-80 bg-secondary/20 -bottom-24 -right-24"
        style={{ animationDelay: "-9s" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm flex flex-col flex-1 py-6">
        <motion.div variants={rise} custom={0} initial="hidden" animate="show" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-[12px] bg-primary flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Stop Tracker</span>
        </motion.div>

        <motion.h1
          variants={rise}
          custom={1}
          initial="hidden"
          animate="show"
          className="text-3xl font-bold leading-tight mt-7"
        >
          Your Work.<br />Your Records.<br />Your Pay.
        </motion.h1>

        <motion.p
          variants={rise}
          custom={2}
          initial="hidden"
          animate="show"
          className="text-muted-foreground mt-3 leading-relaxed"
        >
          The pay tracker built for delivery drivers.
        </motion.p>

        <p className="mt-6 text-xs text-primary font-semibold">Tap a feature below to see how it works</p>
        <div className="mt-3 space-y-2.5">
          {BENEFITS.map((b,i)=>{
            const Icon=b.icon,expanded=activePreview===i;
            const estimate=(Math.max(0,Number(previewStops)||0)*2.08+Math.max(0,(Number(previewParcels)||0)-(Number(previewStops)||0))*0.05)*0.94;
            return <div key={b.title} className={`rounded-2xl border transition-colors ${expanded?'border-primary bg-primary/10':'border-border bg-card/70'}`}>
              <button type="button" aria-expanded={expanded} aria-controls={'feature-preview-'+i}
                className="w-full min-h-[78px] flex gap-3 items-center text-left p-3.5 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                onClick={()=>{setActivePreview(expanded?null:i);track('landing_feature_preview',{feature:b.title})}}>
                <span className="p-2.5 rounded-xl bg-primary/15 shrink-0"><Icon size={20} className="text-primary" aria-hidden="true"/></span>
                <span className="flex-1 min-w-0"><strong className="block text-sm font-semibold">{b.title}</strong><span className="block text-xs text-muted-foreground mt-1">{b.body}</span>{!expanded&&<span className="block text-[11px] text-primary mt-1">Tap to preview</span>}</span>
                {expanded?<ChevronUp size={19} className="text-primary" aria-hidden="true"/>:<ChevronDown size={19} className="text-primary" aria-hidden="true"/>}
              </button>
              {expanded&&<motion.div id={'feature-preview-'+i} initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} transition={{duration:0.16}} className="border-t border-border px-3.5 py-3.5 space-y-3">
                {i===0&&<>
                  <div className="text-xs font-semibold">Today's work · Example</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">Stops<input inputMode="numeric" type="number" min="0" value={previewStops} onChange={e=>setPreviewStops(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-border bg-background text-foreground p-2 text-base"/></label>
                    <label className="text-xs text-muted-foreground">Parcels<input inputMode="numeric" type="number" min="0" value={previewParcels} onChange={e=>setPreviewParcels(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-border bg-background text-foreground p-2 text-base"/></label>
                  </div>
                  <p className="text-xs text-muted-foreground">Extra work and notes are available when logging your actual day.</p>
                </>}
                {i===1&&<>
                  <span className="text-xs text-muted-foreground">Your estimated daily earnings · Sample rates</span>
                  <strong className="block text-2xl tabular-nums text-primary">£{estimate.toFixed(2)}</strong>
                  <p className="text-xs text-muted-foreground">{previewStops||0} stops · {previewParcels||0} parcels · Before personal expenses and tax</p>
                </>}
                {i===2&&<>
                  <div className="flex items-center gap-2 text-amber-500"><ShieldCheck size={20}/><strong>Possible £45.00 difference</strong></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Your expected payout</span><strong>£4,860.00</strong></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Contractor statement</span><strong>£4,815.00</strong></div>
                  <button type="button" className="text-sm text-primary underline min-h-[44px]" onClick={()=>setShowDifference(v=>!v)}>{showDifference?'Hide example':'See possible differences'}</button>
                  {showDifference&&<p className="text-xs text-muted-foreground rounded-xl bg-muted p-3">18 Sep: extra work £20 · 25 Sep: stops £20 · contractor charges £5. Actual checks depend on verified statement details.</p>}
                </>}
                <p className="text-[11px] text-muted-foreground">Interactive example only. Nothing is stored or charged.</p>
              </motion.div>}
            </div>
          })}
        </div>

        <motion.div
          variants={rise}
          custom={6}
          initial="hidden"
          animate="show"
          className="mt-auto pt-7 space-y-2.5"
        >
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full min-h-[52px] rounded-[16px] bg-primary text-primary-foreground font-medium flex items-center justify-center touch-manipulation active:scale-[0.98] transition-transform"
          >
            Get started
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>

          <button
            onClick={() => { window.location.href = "/login"; }}
            className="w-full min-h-[48px] rounded-[16px] border border-border bg-card/60 font-medium text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors touch-manipulation"
          >
            I already have an account
          </button>

          <p className="text-center text-xs text-muted-foreground pt-1">Free to use. No card needed.</p>

          <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-muted-foreground">
            <button onClick={onPrivacyPolicy} className="hover:text-foreground transition-colors">Privacy</button>
            <span aria-hidden="true">·</span>
            <button onClick={onTermsOfService} className="hover:text-foreground transition-colors">Terms</button>
            <span aria-hidden="true">·</span>
            <button onClick={onContactUs} className="hover:text-foreground transition-colors">Contact</button>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto max-w-md px-5 pb-6"><AnalyticsConsent/></div>
      <SignInSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
