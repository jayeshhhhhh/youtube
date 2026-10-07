import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";

type ThemePreference = "light" | "dark" | "auto";
type ActualTheme = "light" | "dark";

interface ThemeContextType {
  theme: ActualTheme;
  preference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  preference: "auto",
  setThemePreference: () => {},
});

const getAutoTheme = (): ActualTheme => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);

    const totalMinutes = hour * 60 + minute;

    // 10:00 AM (600 min) to 11:59 AM (719 min) -> Light
    // Otherwise -> Dark
    return totalMinutes >= 600 && totalMinutes < 720 ? "light" : "dark";
  } catch (e) {
    console.error("Error calculating IST theme:", e);
    return "dark";
  }
};

const applyThemeToDOM = (theme: ActualTheme) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  root.style.colorScheme = theme;
};

export const ThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "auto";
    return (localStorage.getItem("app-theme") as ThemePreference) || "auto";
  });

  // Derive actual theme based on preference
  const theme = useMemo((): ActualTheme => {
    if (preference === "auto") {
      return getAutoTheme();
    }
    return preference as ActualTheme;
  }, [preference]);

  // Sync DOM whenever theme changes
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Timer for auto-theme switching
  useEffect(() => {
    const timer = setInterval(() => {
      if (preference === "auto") {
        // We force a re-render to re-calculate derived 'theme'
        setPreferenceState("auto");
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [preference]);

  const setThemePreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    localStorage.setItem("app-theme", pref);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        preference,
        setThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
