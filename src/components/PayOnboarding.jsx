import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Package } from "lucide-react";
import PayStructureAISetup from "./PayStructureAISetup";
import { useAuth } from "../contexts/AuthContext";
import { describePayStructure } from "../features/payperiod/payStructure";
import { trackEvent } from "../services/productAnalytics";
import Logo from "./Logo";

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
          className="absolute w-24 h-24 rounded-full border-2 border-primary/50"
          initial={{ scale: 0.72, opacity: 0.5 }}
          animate={{ scale: 1.75, opacity: 0 }}
          transition={{ duration: 1.05, delay: 0.12, ease: "easeOut" }}
        />
        <Logo variant="icon" className="w-20 h-20" />
      </div>

      <motion.h1 variants={rise} custom={0} initial="hidden" animate="show" className="text-3xl font-bold">
        You're all set, {firstName}
      </motion.h1>
      <motion.p variants={rise} custom={1} initial="hidden" animate="show" className="text-muted-foreground leading-relaxed">
        Welcome to Stop Tracker. Just log your day, we'll do the maths.
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

  React.useEffect(() => {
    trackEvent("pay_setup_started", { surface: "onboarding" });
  }, []);

  return (
    <div className="min-h-[100dvh] animated-gradient flex flex-col items-center justify-center px-4 py-10 pt-safe">
      {confirmed ? (
        <WelcomeStep
          firstName={firstName}
          config={confirmed}
          onStart={() => {
            trackEvent("pay_setup_completed", {
              surface: "onboarding",
              pay_model: confirmed?.model || "unknown",
            });
            onComplete(confirmed);
          }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="flex justify-center mb-2">
            <Logo />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Welcome, {firstName} 👋</h1>
            <p className="text-muted-foreground">
              Let's set up how you get paid, so your daily totals are always spot on.
            </p>
          </div>

          <div className="rounded-[18px] border border-border bg-card p-5 shadow-sm">
            <PayStructureAISetup
              onConfirm={(config) => {
                trackEvent("pay_setup_interpreted", {
                  surface: "onboarding",
                  pay_model: config?.model || "unknown",
                });
                setConfirmed(config);
              }}
            />
          </div>

          <p className="text-center text-xs text-muted-foreground px-6">
            This takes a few seconds and makes every daily total accurate. You can change it
            anytime in Profile &rsaquo; Pay Structure.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default PayOnboarding;
