import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const formatMoney = (amount, whole) => {
  const n = Number(amount) || 0;
  return whole
    ? `£${Math.round(n).toLocaleString("en-GB")}`
    : `£${n.toFixed(2)}`;
};

const AnimatedMoney = ({ amount, className = "", whole = false, duration = 320 }) => {
  const reduceMotion = useReducedMotion();
  const target = Number(amount) || 0;
  const previous = useRef(target);
  const frame = useRef(null);
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (frame.current) cancelAnimationFrame(frame.current);

    const from = previous.current;
    const to = target;
    previous.current = target;

    if (reduceMotion || duration <= 0 || Math.abs(to - from) < 0.005) {
      setDisplay(to);
      return undefined;
    }

    const startedAt = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setDisplay(from + (to - from) * easeOutCubic(progress));

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        frame.current = null;
      }
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration, reduceMotion]);

  return (
    <span className={`tabular-nums ${className}`} aria-label={formatMoney(target, whole)}>
      {formatMoney(display, whole)}
    </span>
  );
};

export { AnimatedMoney };
