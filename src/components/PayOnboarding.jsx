import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Package } from "lucide-react";
import PayStructureAISetup from "./PayStructureAISetup";
import { useAuth } from "../contexts/AuthContext";
import { describePayStructure } from "../features/payperiod/payStructure";

// Completion beat shown after the user confirms their pay setup: a spring-in
// check-mark, then a staggered welcome + pay summary + "Start tracking".
const WelcomeStep = ({ firstName, config, onStart }) => {
  const rise = {
    hidden: { opacity: 0, y: 12 },
    show: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.5 + i * 0.18, duration: 0.4 } }),
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-md flex flex-col items-center text-center space-y-5"
    >
      <div className="relative w-24 h-24 flex items-center justify-center">
        <motion.div
          className="absolute w-24 h-24 rounded-full border-2 border-primary"
          initial={{ scale: 0.7, opacity: 0.55 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 1.1, delay: 0.15, ease: "easeOut" }}
        />
        <motion.div
          className="w-20 h-20 rounded-full bg-primary flex items-center justify-center"
          initial={{ scale: 0.3 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
        >
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.3 }}
          >
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </motion.span>
        </motion.div>
      </div>

      <motion.h1 variants={rise} custom={0} initial="hidden" animate="show" className="text-3xl font-bold">
        You're all set, {firstName}
      </motion.h1>
      <motion.p variants={rise} custom={1} initial="hidden" animate="show" className="text-muted-foreground leading-relaxed">
        Welcome to Stop Tracker. Just log your day — we'll do the maths.
      </motion.p>

      <motion.div
        variants={rise}
        custom={2}
        initial="hidden"
        animate="show"
        className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2"
      >
        <Package className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">{describePayStructure(config)}</span>
      </motion.div>

      <motion.button
        variants={rise}
        custom={3}
        initial="hidden"
        animate="show"
        onClick={onStart}
        className="w-full h-12 rounded-[14px] bg-primary text-primary-foreground font-medium flex items-center justify-center touch-manipulation active:scale-[0.98] transition-transform"
      >
        Start tracking
        <ArrowRight className="w-5 h-5 ml-2" />
      </motion.button>
    </motion.div>
  );
};

// First-run screen for a brand-new user before they reach the app. Reuses the
// AI describe/upload panel; on confirm it shows the welcome beat, then hands the
// config up to completeOnboarding. "Set up later" completes with no config.
const PayOnboarding = ({ onComplete }) => {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] || "there";
  const [confirmed, setConfirmed] = useState(null); // the config once confirmed

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/20 flex flex-col items-center justify-center px-4 py-10 pt-safe">
      {confirmed ? (
        <WelcomeStep firstName={firstName} config={confirmed} onStart={() => onComplete(confirmed)} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Welcome, {firstName} 👋</h1>
            <p className="text-muted-foreground">
              Let's set up how you get paid, so your daily totals are always spot on.
            </p>
          </div>

          <div className="rounded-[18px] border border-border bg-card p-5 shadow-sm">
            <PayStructureAISetup onConfirm={(config) => setConfirmed(config)} />
          </div>

          <button
            onClick={() => onComplete()}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 touch-manipulation"
          >
            I'll set this up later
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default PayOnboarding;
