import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ theme: "light", toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children, initialTheme = "light" }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("convs-theme");
    if (saved) return saved;
    // Detect system preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return initialTheme;
  });

  // Listen for system dark mode changes (only when user hasn't manually set a preference)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      // Only follow system if no explicit user choice stored
      if (!localStorage.getItem("convs-theme-manual")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("convs-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    localStorage.setItem("convs-theme-manual", "true");
    setTheme(t => t === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}