import React, { createContext, useContext, useState } from "react";

// Create context for tabs
const TabsContext = createContext({
  value: "",
  onValueChange: () => {},
});

// Main Tabs container
const Tabs = ({
  value,
  onValueChange,
  children,
  className = "",
  defaultValue,
  ...props
}) => {
  // State if controlled from outside
  const [tabValue, setTabValue] = useState(defaultValue || value);
  
  // Determine if this is a controlled or uncontrolled component
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : tabValue;
  
  // Handle value change
  const handleValueChange = (newValue) => {
    if (!isControlled) {
      setTabValue(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };
  
  return (
    <TabsContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
      }}
    >
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// Tab list container
const TabsList = ({ children, className = "", ...props }) => {
  return (
    <div
      role="tablist"
      className={`flex space-x-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Individual tab trigger
const TabsTrigger = ({ children, value, className = "", disabled = false, ...props }) => {
  const { value: selectedValue, onValueChange } = useContext(TabsContext);
  const isSelected = selectedValue === value;
  
  const handleClick = () => {
    if (!disabled) {
      onValueChange(value);
    }
  };
  
  return (
    <button
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      disabled={disabled}
      onClick={handleClick}
      className={`px-3 py-1.5 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Tab content
const TabsContent = ({ children, value, className = "", ...props }) => {
  const { value: selectedValue } = useContext(TabsContext);
  const isSelected = selectedValue === value;
  
  if (!isSelected) return null;
  
  return (
    <div
      role="tabpanel"
      data-state={isSelected ? "active" : "inactive"}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };