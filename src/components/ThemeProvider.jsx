import React, { useEffect, useState } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

const themeConfig = {
  light: {
    '--background': '#ffffff',
    '--text': '#1f2937',
    '--primary': '#2563eb', // Vibrant blue
    '--secondary': '#94a3b8', // Cool gray
    '--accent': '#fbbf24', // Bold yellow
  },
  dark: {
    '--background': '#1f2937',
    '--text': '#e5e7eb',
    '--primary': '#7c3aed', // Neon purple
    '--secondary': '#4b5563', // Muted gray
    '--accent': '#0ea5e9', // Vibrant teal
  },
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  const themeVars = themeConfig[theme] || themeConfig.light;
  Object.entries(themeVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

export function ThemeProvider({ children }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Apply theme on mount
    applyTheme(theme || 'light');
  }, [theme]);

  if (!mounted) return null;

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      value={{
        light: 'light',
        dark: 'dark',
      }}
    >
      {children}
    </NextThemesProvider>
  );
}