import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext();

const STORAGE_KEY = "theme-preference";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference) {
  return preference === "system" ? getSystemTheme() : preference;
}

function readStoredPreference() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStoredPreference);
  const [theme, setTheme] = useState(() => resolveTheme(preference));

  // Apply the resolved theme to the DOM whenever it changes.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Re-resolve whenever the preference changes, and (only for "system")
  // keep listening for live OS-level changes while that preference is active.
  useEffect(() => {
    setTheme(resolveTheme(preference));

    if (preference !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setTheme(getSystemTheme());
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [preference]);

  const setThemePreference = useCallback((newPreference) => {
    setPreference(newPreference);
    localStorage.setItem(STORAGE_KEY, newPreference);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themePreference: preference, setThemePreference }}>
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
