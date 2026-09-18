import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { CheckCircle2, Crown, Loader2, MapPin, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import { startProCheckout } from "../services/billing";

const UpgradeToPro = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isPro = user?.role === "pro";
  const isNative = Capacitor.isNativePlatform();
  const cancelled = searchParams.get("upgrade") === "cancelled";

  const upgrade = async () => {
    setError("");

    if (user?.isGuest) {
      navigate("/login");
      return;
    }

    if (isNative) {
      setError("Mobile in-app purchasing is not enabled yet. Use the Verso web app to manage Pro for now.");
      return;
    }

    setLoading(true);
    try {
      const result = await startProCheckout();
      if (result?.alreadyPro) navigate("/app/profile");
    } catch (err) {
      console.error("Pro checkout failed:", err);
      setError(
        String(err?.code || "").includes("failed-precondition")
          ? "Pro checkout is being configured. Please try again once billing is enabled."
          : "Could not start checkout. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="mx-auto max-w-2xl px-4 py-6 pb-24"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="rounded-[22px] border border-primary/20 bg-primary/5 p-5 sm:p-7">
        <div className="flex items-center gap-2 text-primary">
          <Crown className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Verso Pro</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          {isPro ? "Your Pro plan is active" : "Unlock the tools that cost us to run"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Core work logging, earnings calculations, entries, stats and manual Check Pay stay free.
          Pro covers paid routing and AI usage — and removes ads.
        </p>

        <div className="mt-6 flex items-end gap-1">
          <span className="text-4xl font-extrabold tracking-tight">£4.99</span>
          <span className="pb-1 text-sm text-muted-foreground">/ month</span>
        </div>

        <div className="mt-6 space-y-3">
          {[
            [MapPin, "Road-aware route optimisation", "Protected Google Routes calls with real road distance and traffic-aware ordering."],
            [ScanLine, "AI rate-sheet photo reading", "DeepSeek reads screenshots or photos and turns the rates into your pay setup."],
            [Sparkles, "Higher AI allowance", "More AI setup requests while keeping normal earnings calculations instant and deterministic."],
            [ShieldCheck, "Ad-free Verso", "No ad placements while your Pro subscription is active."],
          ].map(([Icon, title, body]) => (
            <div key={title} className="flex gap-3 rounded-[14px] border border-border bg-card p-3">
              <div className="mt-0.5 rounded-[10px] bg-primary/10 p-2 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</div>
              </div>
            </div>
          ))}
        </div>

        {cancelled && (
          <p className="mt-4 rounded-[12px] border border-border bg-card p-3 text-xs text-muted-foreground">
            Checkout was cancelled. Nothing was charged.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-[12px] border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {isPro ? (
          <Button className="mt-6 w-full h-12" onClick={() => navigate("/app/profile")}>
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Pro active
          </Button>
        ) : (
          <Button className="mt-6 w-full h-12" onClick={upgrade} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Crown className="mr-2 h-5 w-5" />}
            {user?.isGuest ? "Create an account to upgrade" : "Continue to secure checkout"}
          </Button>
        )}

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Web checkout is handled by Stripe. Mobile store billing is kept separate so the native apps can follow store purchase rules.
        </p>
      </div>
    </motion.div>
  );
};

export default UpgradeToPro;
