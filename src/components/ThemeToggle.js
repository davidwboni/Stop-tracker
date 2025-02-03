import React from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "../components/ui/button";

export const ThemeToggle = () => {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    // Detect theme preference from localStorage or system settings
    const isDarkMode =
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkMode);
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newTheme);
  };

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        <Sun
          className={`h-5 w-5 text-yellow-500 transform transition-all ${
            isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          }`}
        />
        <Moon
          className={`h-5 w-5 text-purple-500 transform transition-all ${
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
          }`}
        />
        <span className="text-sm text-gray-800 dark:text-gray-200">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      </Button>
    </div>
  );
};