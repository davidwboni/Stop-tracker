import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) return storedTheme;

    // Default to system preference if no theme is stored
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return systemPreference;
  });

  useEffect(() => {
    const root = document.documentElement;

    // Apply theme class to <html>
    root.classList.remove("light", "dark");
    root.classList.add(theme);

    // Store user preference
    localStorage.setItem("theme", theme);

    // Listener for system theme changes
    const systemThemeChangeHandler = (e) => {
      if (localStorage.getItem("theme") === "system") {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    darkMediaQuery.addEventListener("change", systemThemeChangeHandler);

    return () => {
      darkMediaQuery.removeEventListener("change", systemThemeChangeHandler);
    };
  }, [theme]);

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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