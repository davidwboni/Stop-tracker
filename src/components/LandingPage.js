import React, { useState } from "react";
import { motion } from "framer-motion";
import { Truck, Zap, Sparkles, FileText, ArrowRight } from "lucide-react";
import SignInSheet from "./SignInSheet";

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

export default function LandingPage({ onContactUs, onPrivacyPolicy, onTermsOfService }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const rise = {
    hidden: { opacity: 0, y: 14 },
    show: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.4 } }),
  };

  return (
    <div className="relative min-h-[100dvh] animated-gradient overflow-hidden flex flex-col items-center px-6 pt-safe pb-safe">
      {/* Ambient depth behind the content. Decorative only. */}
      <div className="ambient-blob w-72 h-72 bg-primary/25 -top-16 -left-20" aria-hidden="true" />
      <div
        className="ambient-blob w-80 h-80 bg-secondary/20 -bottom-24 -right-24"
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

      <SignInSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
