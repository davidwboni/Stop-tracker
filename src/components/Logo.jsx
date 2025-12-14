import React from 'react';

const Logo = ({ className = "w-10 h-10", variant = "full" }) => {
  if (variant === "icon") {
    return (
      <svg
        className={className}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>

        {/* Circle background */}
        <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" />

        {/* Delivery truck icon */}
        <path
          d="M25 45 L45 45 L45 35 L55 35 L65 45 L65 55 L25 55 Z"
          fill="white"
          opacity="0.9"
        />
        <rect x="55" y="40" width="8" height="10" fill="white" opacity="0.6" />
        <circle cx="35" cy="60" r="5" fill="white" />
        <circle cx="60" cy="60" r="5" fill="white" />

        {/* Location pin overlay */}
        <path
          d="M72 28 C72 23 68 20 63 20 C58 20 54 23 54 28 C54 33 63 42 63 42 C63 42 72 33 72 28 Z"
          fill="#10B981"
        />
        <circle cx="63" cy="28" r="3" fill="white" />
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        className="w-10 h-10"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>

        {/* Circle background */}
        <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" />

        {/* Delivery truck icon */}
        <path
          d="M25 45 L45 45 L45 35 L55 35 L65 45 L65 55 L25 55 Z"
          fill="white"
          opacity="0.9"
        />
        <rect x="55" y="40" width="8" height="10" fill="white" opacity="0.6" />
        <circle cx="35" cy="60" r="5" fill="white" />
        <circle cx="60" cy="60" r="5" fill="white" />

        {/* Location pin overlay */}
        <path
          d="M72 28 C72 23 68 20 63 20 C58 20 54 23 54 28 C54 33 63 42 63 42 C63 42 72 33 72 28 Z"
          fill="#10B981"
        />
        <circle cx="63" cy="28" r="3" fill="white" />
      </svg>

      <div className="flex flex-col">
        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Stop Tracker
        </span>
        <span className="text-xs text-muted-foreground -mt-1">Delivery Management</span>
      </div>
    </div>
  );
};

export default Logo;
