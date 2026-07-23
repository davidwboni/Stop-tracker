// src/components/ui/money.jsx
import React from "react";

// `whole` renders rounded pounds with thousands separators (e.g. £1,064) -
// used in tight/compact stat grids where the pence cause layout overlap and
// aren't meaningful. Default keeps the precise 2-decimal amount.
const Money = ({ amount, className = "", whole = false }) => {
  const n = Number(amount) || 0;
  const text = whole ? `£${Math.round(n).toLocaleString("en-GB")}` : `£${n.toFixed(2)}`;
  return (
    <span className={`tabular-nums ${className}`}>
      {text}
    </span>
  );
};

export { Money };
