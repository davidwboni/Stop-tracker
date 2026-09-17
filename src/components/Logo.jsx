import React from "react";

const Mark = ({ className = "w-10 h-10" }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="stopTrackerMark" x1="13" y1="8" x2="51" y2="55" gradientUnits="userSpaceOnUse">
        <stop stopColor="#14D9D1" />
        <stop offset="1" stopColor="#06B6C4" />
      </linearGradient>
    </defs>
    <path
      d="M32 4C19.2 4 10 13.1 10 25.5C10 40 25.4 54.1 30.4 58.3C31.3 59.1 32.7 59.1 33.6 58.3C38.6 54.1 54 40 54 25.5C54 13.1 44.8 4 32 4Z"
      fill="url(#stopTrackerMark)"
    />
    <path
      d="M32 12.5C23.8 12.5 17.5 18.2 17.5 26C17.5 33.8 23.8 39.5 32 39.5C40.2 39.5 46.5 33.8 46.5 26C46.5 18.2 40.2 12.5 32 12.5Z"
      fill="#081F2B"
      fillOpacity="0.92"
    />
    <path
      d="M24 26.5L29.4 31.8L40.5 20.8"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Logo = ({ className = "", variant = "full" }) => {
  if (variant === "icon") {
    return <Mark className={className || "w-10 h-10"} />;
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Mark className="w-10 h-10 shrink-0" />
      <span className="text-xl font-extrabold tracking-[-0.03em] text-foreground">
        Stop <span className="text-primary">Tracker</span>
      </span>
    </div>
  );
};

export default Logo;
