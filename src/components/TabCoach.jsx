import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X } from "lucide-react";

// A one-time, non-blocking coach hint shown the first time a user visits a tab.
// Sits above the bottom nav; dismisses on "Got it" / ✕ and never returns.
const TabCoach = ({ id, title, body }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(`coach_${id}`);
    } catch (e) {
      /* ignore */
    }
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(t);
    }
  }, [id]);

  const dismiss = () => {
    try {
      localStorage.setItem(`coach_${id}`, "1");
    } catch (e) {
      /* ignore */
    }
    setVisible(false);
  };

  // Portaled to document.body: page content sits inside a Framer Motion
  // transform wrapper (tab animations), which makes position:fixed anchor to
  // that column instead of the viewport. The full-width flex row + px-4 centers
  // the card on ANY screen size with no transform math, so it never clips and
  // the buttons are always reachable. pointer-events keep it non-blocking:
  // taps outside the card pass through, the card itself stays interactive.
  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 pointer-events-none"
        >
          <div className="w-full max-w-sm bg-card border border-primary/30 rounded-[16px] shadow-xl p-4 pointer-events-auto">
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-primary/10 h-fit shrink-0">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm mb-0.5">{title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground h-fit shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={dismiss}
                className="text-xs font-medium text-primary-foreground bg-primary rounded-full px-4 py-1.5 active:scale-95 transition-transform"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default TabCoach;
