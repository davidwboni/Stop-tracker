import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

// A one-time animated cue telling the user they can swipe between tabs.
// Appears shortly after first app entry, auto-hides, and never shows again.
const SwipeHint = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem("swipe_hint_seen");
    } catch (e) {
      /* ignore */
    }
    if (seen) return;

    const markSeen = () => {
      try {
        localStorage.setItem("swipe_hint_seen", "1");
      } catch (e) {
        /* ignore */
      }
    };
    const show = setTimeout(() => setVisible(true), 1400);
    const hide = setTimeout(() => {
      markSeen();
      setVisible(false);
    }, 6500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem("swipe_hint_seen", "1");
    } catch (e) {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          onClick={dismiss}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed inset-x-0 bottom-24 z-[55] flex justify-center px-4"
        >
          <div className="bg-foreground/85 text-background rounded-full px-4 py-2 flex items-center gap-2 text-sm shadow-lg backdrop-blur">
            <motion.span animate={{ x: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 1.2 }}>
              <ChevronLeft className="w-4 h-4" />
            </motion.span>
            Swipe to switch tabs
            <motion.span animate={{ x: [3, -3, 3] }} transition={{ repeat: Infinity, duration: 1.2 }}>
              <ChevronRight className="w-4 h-4" />
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SwipeHint;
