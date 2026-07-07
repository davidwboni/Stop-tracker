// src/components/ui/status-badge.jsx
import React from "react";

const STATUS_CONFIG = {
  match: {
    label: "Match",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400",
  },
  mismatch: {
    label: "Mismatch",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400",
  },
  "missing-from-log": {
    label: "Missing from your log",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400",
  },
  "missing-from-statement": {
    label: "Missing from statement",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400",
  },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.mismatch;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
};

export { StatusBadge };
