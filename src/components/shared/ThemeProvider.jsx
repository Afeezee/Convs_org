import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ theme: "light", toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children, initialTheme = "light" }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("convs-theme");
    return saved || initialTheme;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("convs-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}