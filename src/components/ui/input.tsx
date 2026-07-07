import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ 
  className = "", 
  type = "text", 
  error = false, 
  ...props 
}, ref) => {
  return (
    <input
      type={type}
      className={`
        flex h-10 w-full rounded-[14px] border px-3 py-2 text-sm
        bg-input
        focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
        disabled:cursor-not-allowed disabled:opacity-50
        placeholder:text-muted-foreground
        ${error
          ? "border-destructive focus:ring-destructive"
          : "border-border"
        }
        ${className}
      `}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };