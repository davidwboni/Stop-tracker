import React from "react";

// Enhanced button component with different variants
const Button = ({
  children,
  className = "",
  variant = "primary",
  size = "default",
  loading = false,
  disabled = false,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-[14px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:opacity-90 focus:ring-ring",
    secondary: "bg-muted text-muted-foreground hover:opacity-80 focus:ring-ring",
    outline: "bg-transparent border border-border hover:bg-muted focus:ring-ring",
    ghost: "bg-transparent hover:bg-muted focus:ring-ring",
    link: "bg-transparent underline-offset-4 hover:underline text-primary hover:bg-transparent focus:ring-0",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90 focus:ring-destructive"
  };

  const sizeClasses = {
    sm: "text-xs px-3 py-1.5",
    default: "text-sm px-4 py-2",
    lg: "text-base px-5 py-2.5",
    icon: "p-2"
  };

  const disabledClasses = "opacity-50 cursor-not-allowed";

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled || loading ? disabledClasses : "",
    className
  ].join(" ");

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export { Button };