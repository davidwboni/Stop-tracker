import { ThemeProvider as NextThemeProvider } from "next-themes";
import React, { useEffect } from "react";

export function ThemeProvider({ children }) {
  useEffect(() => {
    // Define theme variables
    const themes = {
      light: {
        "--primary": "#4F46E5",
        "--primary-hover": "#4338CA",
        "--secondary": "#22C55E",
        "--secondary-hover": "#16A34A",
        "--accent": "#FACC15",
        "--background": "#F9FAFB",
        "--text": "#1F2937",
        "--card": "#FFFFFF",
        "--border": "#E5E7EB",
      },
      dark: {
        "--primary": "#4F46E5",
        "--primary-hover": "#4338CA",
        "--secondary": "#22C55E",
        "--secondary-hover": "#16A34A",
        "--accent": "#FACC15",
        "--background": "#1F2937",
        "--text": "#F9FAFB",
        "--card": "#1F2937",
        "--border": "#374151",
      },
    };

    // Apply theme variables
    const applyTheme = (theme) => {
      const root = document.documentElement;
      const themeVariables = themes[theme] || themes.light;
      Object.entries(themeVariables).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    };

    // Observe changes to the theme class
    let timer;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const theme = document.documentElement.classList.contains("dark")
          ? "dark"
          : "light";
        applyTheme(theme);
      }, 50); // Debounce to avoid rapid updates
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Initial theme application
    const initialTheme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    applyTheme(initialTheme);

    return () => observer.disconnect();
  }, []);

  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemeProvider>
  );
}