import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Save, TrendingUp, ArrowRight } from "lucide-react";
import { useData } from "../contexts/DataContext";

const FLAG = "st_tutorial_v1";

const STEPS = [
  {
    icon: Package,
    title: "Your work ledger",
    body: "Stop Tracker keeps your own record of the work you complete and what you expect to earn.",
  },
  {
    icon: Save,
    title: "Log your day in seconds",
    body: "When you finish work, tap Log today’s deliveries, enter your stops and save. We calculate your expected earnings.",
  },
  {
    icon: TrendingUp,
    title: "Watch the 4 weeks add up",
    body: "Home keeps today, your current pay period and recent entries together so you can see where you stand quickly.",
  },
  {
    icon: Package,
    title: "Then check your pay",
    body: "When your company statement arrives, open Check Pay and compare it with your independent Stop Tracker record.",
  },
];

// A short one-time orientation for brand-new users. Shows
// only when the account has essentially no logs yet and hasn't seen it before.
const DashboardTutorial = () => {
  // Gate on isNewUser (true for guests and brand-new accounts) rather than log
  // count, so guests, who are seeded demo logs, still get the walkthrough once.
  const { isNewUser, loading } = useData();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) return;
    const seen = localStorage.getItem(FLAG);
    if (!seen && isNewUser) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [loading, isNewUser]);

  const finish = () => {
    try {
      localStorage.setItem(FLAG, "1");
    } catch (e) {
      /* ignore */
    }
    setVisible(false);
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());

  if (!visible) return null;
  const s = STEPS[step];
  const Icon = s.icon;

  // Portal to document.body so the overlay is fixed to the real viewport, not
  // the page's Framer Motion transform wrapper (which would left-bias it and
  // push the dismiss buttons off a narrow phone screen).
  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] bg-black/60 flex items-end justify-center p-4 pb-28"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={finish}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-[18px] bg-card border border-border p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{s.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>

          <div className="flex items-center justify-between mt-5">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i === step ? "bg-primary" : "bg-border"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={finish} className="text-sm text-muted-foreground hover:text-foreground">
                Skip
              </button>
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 rounded-[12px] bg-primary text-primary-foreground text-sm font-medium px-4 py-2 active:scale-95 transition-transform"
              >
                {step < STEPS.length - 1 ? "Next" : "Got it"}
                {step < STEPS.length - 1 && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default DashboardTutorial;
