import React, {
  createContext,
  useContext,
  useEffect,
  useState,
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
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value || 0
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")?.value || 0
  );

  const totalMinutes = hour * 60 + minute;

  return totalMinutes >= 600 && totalMinutes < 720
    ? "light"
    : "dark";
};

const applyTheme = (theme: ActualTheme) => {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(theme);

  root.style.colorScheme = theme;
};

export const ThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [preference, setPreference] =
    useState<ThemePreference>(() => {
      if (typeof window === "undefined") {
        return "auto";
      }

      const saved =
        localStorage.getItem("app-theme");

      if (
        saved === "light" ||
        saved === "dark" ||
        saved === "auto"
      ) {
        return saved;
      }

      return "auto";
    });

  const [theme, setTheme] =
    useState<ActualTheme>(() => {
      if (typeof window === "undefined") {
        return "dark";
      }

      return getAutoTheme();
    });

  useEffect(() => {
    const updateTheme = () => {
      const actualTheme =
        preference === "auto"
          ? getAutoTheme()
          : preference;

      setTheme(actualTheme);
      applyTheme(actualTheme);
    };

    updateTheme();

    const timer = setInterval(
      updateTheme,
      60000
    );

    return () => clearInterval(timer);
  }, [preference]);

  const setThemePreference = (
    pref: ThemePreference
  ) => {
    setPreference(pref);
    localStorage.setItem(
      "app-theme",
      pref
    );

    const actualTheme =
      pref === "auto"
        ? getAutoTheme()
        : pref;

    setTheme(actualTheme);
    applyTheme(actualTheme);
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

export const useTheme = () =>
  useContext(ThemeContext);