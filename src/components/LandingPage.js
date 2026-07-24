import React, { useState } from "react";
import { motion } from "framer-motion";
import { Truck, Zap, Sparkles, FileText, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// App-style first-run screen, not a marketing website: one screen, no scroll,
// three benefits, and a single primary action that drops the user straight into
// the app as a guest (no separate "continue as guest" step).
const BENEFITS = [
  {
    icon: Zap,
    title: "Log in seconds",
    body: "One number at the end of your round. That's it.",
  },
  {
    icon: Sparkles,
    title: "Any pay deal",
    body: "Tell us how you're paid, or upload your rate sheet. We work it out.",
  },
  {
    icon: FileText,
    title: "Invoice in a tap",
    body: "Send a proper invoice and check you've been paid right.",
  },
];

export default function LandingPage({ onGetStarted, onContactUs, onPrivacyPolicy, onTermsOfService }) {
  const { loginAsGuest } = useAuth();
  const [starting, setStarting] = useState(false);

  // One-tap guest: sign in anonymously and go straight to the dashboard.
  const startFree = async () => {
    setStarting(true);
    try {
      const ok = await loginAsGuest();
      if (ok) {
        window.location.href = "/app/dashboard";
        return;
      }
    } catch (err) {
      console.error("Guest start failed:", err);
    }
    setStarting(false);
    if (onGetStarted) onGetStarted();
  };

  const rise = {
    hidden: { opacity: 0, y: 14 },
    show: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.4 } }),
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm flex flex-col flex-1 py-6">
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
          Every stop,
          <br />
          every penny.
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

        <div className="mt-7 space-y-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                variants={rise}
                custom={3 + i}
                initial="hidden"
                animate="show"
                className="flex gap-3.5"
              >
                <div className="p-2 rounded-[10px] bg-primary/10 h-fit shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">{b.title}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">{b.body}</div>
                </div>
              </motion.div>
            );
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
            onClick={startFree}
            disabled={starting}
            className="w-full min-h-[52px] rounded-[16px] bg-primary text-primary-foreground font-medium flex items-center justify-center touch-manipulation active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {starting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Setting you up
              </>
            ) : (
              <>
                Start tracking free
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>

          <button
            onClick={() => { window.location.href = "/login"; }}
            className="w-full min-h-[48px] rounded-[16px] border border-border font-medium text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors touch-manipulation"
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
    </div>
  );
}
