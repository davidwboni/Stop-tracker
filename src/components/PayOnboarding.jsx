import React from "react";
import { motion } from "framer-motion";
import PayStructureAISetup from "./PayStructureAISetup";
import { useAuth } from "../contexts/AuthContext";

// First-run screen shown to a brand-new user before they reach the app. Reuses
// the same AI describe/upload panel as Settings; on confirm it hands the config
// up to completeOnboarding. "Set up later" completes with no config (keeps the
// sensible DPD default) so nobody is trapped on this screen.
const PayOnboarding = ({ onComplete }) => {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] || "there";

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/20 flex flex-col items-center justify-center px-4 py-10 pt-safe">
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
          <PayStructureAISetup onConfirm={(config) => onComplete(config)} />
        </div>

        <button
          onClick={() => onComplete()}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 touch-manipulation"
        >
          I'll set this up later
        </button>
      </motion.div>
    </div>
  );
};

export default PayOnboarding;
