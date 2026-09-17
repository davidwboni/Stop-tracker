import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, X } from "lucide-react";
import { getAnalyticsConsent, setAnalyticsConsent } from "../services/productAnalytics";

const AnalyticsConsent = () => {
  const [choice, setChoice] = useState(() => getAnalyticsConsent());

  if (choice !== null) return null;

  const choose = async (granted) => {
    await setAnalyticsConsent(granted);
    setChoice(granted);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="fixed inset-x-3 bottom-24 z-[80] mx-auto max-w-md rounded-[18px] border border-border bg-card p-4 shadow-2xl"
        role="dialog"
        aria-label="Analytics preference"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-[12px] bg-primary/10 p-2">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Help improve Stop Tracker</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Share anonymous-style usage events such as which features are used and whether setup is completed.
                  We do not send earnings, pay rates, invoice contents, notes, addresses, names, emails, or AI prompts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => choose(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                aria-label="Decline analytics"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => choose(true)}
                className="flex-1 rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
              >
                Allow analytics
              </button>
              <button
                type="button"
                onClick={() => choose(false)}
                className="flex-1 rounded-[12px] border border-border px-4 py-2.5 text-sm font-medium active:scale-[0.98]"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnalyticsConsent;
