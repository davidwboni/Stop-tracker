import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, User, Loader2, X, Apple } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// Apple sign-in needs an Apple Developer account and the Sign in with Apple
// provider enabled in Firebase. Until both exist, showing the button would be a
// dead end, so it stays off. Flip this to true once configured, and it will only
// appear on iOS (Apple only requires it where other social sign-ins are offered).
const APPLE_SIGN_IN_ENABLED = false;

const isIOS = () =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent || "");

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z" />
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C2.9 17.3 2 20.5 2 24s.9 6.7 2.5 9.9l7.3-5.7z" />
    <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
  </svg>
);

// Bottom sheet offering every way into the app. Portaled to body so it is fixed
// to the viewport rather than any transformed ancestor.
const SignInSheet = ({ open, onClose }) => {
  const { loginWithGoogle, loginAsGuest } = useAuth();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const run = async (id, fn) => {
    setBusy(id);
    setError(null);
    try {
      const ok = await fn();
      if (ok) {
        window.location.href = "/app/dashboard";
        return;
      }
      setError("That didn't work. Try another way to sign in.");
    } catch (err) {
      console.error(`${id} sign-in failed:`, err);
      setError("That didn't work. Try another way to sign in.");
    }
    setBusy(null);
  };

  const Row = ({ id, icon, label, onClick, primary }) => (
    <button
      onClick={onClick}
      disabled={!!busy}
      className={`w-full min-h-[52px] rounded-[16px] flex items-center justify-center gap-2.5 font-medium text-sm touch-manipulation active:scale-[0.98] transition-transform disabled:opacity-60 ${
        primary
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card hover:border-primary/40"
      }`}
    >
      {busy === id ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {busy === id ? "Signing you in" : label}
    </button>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative w-full max-w-sm bg-background rounded-t-[24px] px-6 pt-5 pb-8 pb-safe"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold">Get started</h2>
              <button onClick={onClose} disabled={!!busy} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Pick how you'd like to sign in. You can change this later.
            </p>

            <div className="space-y-2.5">
              <Row
                id="google"
                primary
                icon={<GoogleMark />}
                label="Continue with Google"
                onClick={() => run("google", loginWithGoogle)}
              />

              {APPLE_SIGN_IN_ENABLED && isIOS() && (
                <Row
                  id="apple"
                  icon={<Apple className="w-4 h-4" />}
                  label="Continue with Apple"
                  onClick={() => run("apple", async () => false)}
                />
              )}

              <Row
                id="email"
                icon={<Mail className="w-4 h-4" />}
                label="Continue with email"
                onClick={() => { window.location.href = "/login"; }}
              />

              <Row
                id="guest"
                icon={<User className="w-4 h-4" />}
                label="Have a look around first"
                onClick={() => run("guest", loginAsGuest)}
              />
            </div>

            {error && <p className="text-sm text-destructive text-center mt-4">{error}</p>}

            <p className="text-[11px] text-muted-foreground text-center mt-5 leading-relaxed">
              By continuing you agree to our Terms and Privacy Policy.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SignInSheet;
