import React from "react";

const Card = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`bg-card text-card-foreground rounded-[18px] shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`p-6 border-b border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardTitle = ({ className = "", children, ...props }) => {
  return (
    <h3
      className={`text-xl font-bold text-card-foreground ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

const CardDescription = ({ className = "", children, ...props }) => {
  return (
    <p
      className={`mt-1 text-sm text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

const CardContent = ({ className = "", children, ...props }) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`p-6 border-t border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };