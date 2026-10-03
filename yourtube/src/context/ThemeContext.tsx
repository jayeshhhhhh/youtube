import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: (theme: string) => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState("dark");

  const getAutoTheme = () => {
    try {
      // Convert current time to IST (UTC + 5:30)
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      const hours = istDate.getUTCHours();

      // Light theme between 10:00 AM and 12:00 PM IST
      if (hours >= 10 && hours < 12) {
        return "light";
      }
    } catch (e) {
      console.error("Error calculating IST time:", e);
    }
    return "dark";
  };

  useEffect(() => {
    const applyTheme = (mode: string) => {
      if (mode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("app-theme", mode);
    };

    // Determine initial theme
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme && savedTheme !== "auto") {
      applyTheme(savedTheme);
      setTheme(savedTheme);
    } else {
      const auto = getAutoTheme();
      applyTheme(auto);
      setTheme(auto);
    }
  }, []);

  const toggleTheme = (mode: string) => {
    setTheme(mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("app-theme", mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
