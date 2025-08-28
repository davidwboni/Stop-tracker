import React, { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Always use dark theme
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove light class and add dark class
    root.classList.remove("light");
    root.classList.add("dark");
    
    // Store user preference as dark
    localStorage.setItem("theme", "dark");
  }, []);

  // Keep toggle function as a no-op to avoid breaking existing code
  const toggleTheme = () => {
    // No operation - we always stay in dark mode
  };

  return (
    <ThemeContext.Provider value={{ theme: "dark", toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};