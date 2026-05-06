import { createContext, useContext, useEffect, useMemo, useState } from "react";

const Ctx = createContext();
const THEME_STORAGE_KEY = "theme";

function getInitialDarkMode() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
  } catch {
    // ignore storage errors
  }
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (root.classList.contains("dark")) return true;
    if (root.dataset.theme === "light") return false;
  }
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(getInitialDarkMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.dataset.theme = dark ? "dark" : "light";
    root.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      // ignore storage errors
    }
  }, [dark]);

  const value = useMemo(
    () => ({
      dark,
      setTheme: (mode) => setDark(mode === "dark"),
      toggle: () => setDark((prev) => !prev),
    }),
    [dark],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
