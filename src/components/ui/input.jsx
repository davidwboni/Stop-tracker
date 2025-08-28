import React from "react";

// The Input component now properly supports TypeScript
const Input = React.forwardRef(({ 
  className = "", 
  type = "text", 
  error = false, 
  ...props 
}, ref) => {
  return (
    <input
      type={type}
      className={`
        flex h-10 w-full rounded-md border px-3 py-2 text-sm 
        bg-white dark:bg-gray-800 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        disabled:cursor-not-allowed disabled:opacity-50
        placeholder:text-gray-400 dark:placeholder:text-gray-500
        ${error 
          ? "border-red-500 focus:ring-red-500" 
          : "border-gray-300 dark:border-gray-700"
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