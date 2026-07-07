// src/components/ui/money.jsx
import React from "react";

const Money = ({ amount, className = "" }) => {
  return (
    <span className={`tabular-nums ${className}`}>
      £{amount.toFixed(2)}
    </span>
  );
};

export { Money };
