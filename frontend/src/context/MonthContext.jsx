import { createContext, useContext, useState, useCallback } from "react";

const CURRENT_MONTH = new Date().getMonth() + 1; // 1-12
const CURRENT_YEAR = new Date().getFullYear();

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

const MonthContext = createContext(null);

export function MonthProvider({ children }) {
  const [viewMonth, setViewMonthState] = useState(() =>
    load("viewMonth", CURRENT_MONTH),
  );
  const [viewYear, setViewYearState] = useState(() =>
    load("viewYear", CURRENT_YEAR),
  );

  const setViewMonth = useCallback((month) => {
    setViewMonthState(month);
    save("viewMonth", month);
  }, []);

  const setViewYear = useCallback((year) => {
    setViewYearState(year);
    save("viewYear", year);
  }, []);

  return (
    <MonthContext.Provider
      value={{
        viewMonth,
        viewYear,
        setViewMonth,
        setViewYear,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth must be used inside MonthProvider");
  return ctx;
}
