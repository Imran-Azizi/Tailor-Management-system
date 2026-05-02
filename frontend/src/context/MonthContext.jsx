import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import api from "../lib/api.js";
import { getCurrentAfghanMonthYear, getMonthStatus } from "../lib/months.js";

const { month: CURRENT_MONTH, year: CURRENT_YEAR } =
  getCurrentAfghanMonthYear();

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
  const [monthPolicy, setMonthPolicy] = useState({
    currentMonth: CURRENT_MONTH,
    currentYear: CURRENT_YEAR,
    activeMonth: CURRENT_MONTH,
    activeYear: CURRENT_YEAR,
    allowedUntilMonth: CURRENT_MONTH,
    allowedUntilYear: CURRENT_YEAR,
    isCurrentMonthCompleted: false,
  });

  const isSelectableMonth = useCallback(
    (month, year) => {
      const monthNumber = Number(month);
      const yearNumber = Number(year);
      const maxMonth = Number(monthPolicy.allowedUntilMonth);
      const maxYear = Number(monthPolicy.allowedUntilYear);

      if (
        !Number.isFinite(monthNumber) ||
        !Number.isFinite(yearNumber) ||
        !Number.isFinite(maxMonth) ||
        !Number.isFinite(maxYear)
      ) {
        return false;
      }

      if (monthNumber < 1 || monthNumber > 12) return false;

      if (yearNumber < maxYear) return true;
      if (yearNumber > maxYear) return false;
      return monthNumber <= maxMonth;
    },
    [monthPolicy.allowedUntilMonth, monthPolicy.allowedUntilYear],
  );

  useEffect(() => {
    let cancelled = false;

    const loadPolicy = async () => {
      try {
        const { data } = await api.get("/analytics/month-policy");
        if (cancelled || !data) return;

        setMonthPolicy({
          currentMonth: Number(data.currentMonth) || CURRENT_MONTH,
          currentYear: Number(data.currentYear) || CURRENT_YEAR,
          activeMonth: Number(data.activeMonth) || CURRENT_MONTH,
          activeYear: Number(data.activeYear) || CURRENT_YEAR,
          allowedUntilMonth: Number(data.allowedUntilMonth) || CURRENT_MONTH,
          allowedUntilYear: Number(data.allowedUntilYear) || CURRENT_YEAR,
          isCurrentMonthCompleted: Boolean(data.isCurrentMonthCompleted),
        });

        const selectedMonth = Number(load("viewMonth", CURRENT_MONTH));
        const selectedYear = Number(load("viewYear", CURRENT_YEAR));

        const maxMonth = Number(data.allowedUntilMonth) || CURRENT_MONTH;
        const maxYear = Number(data.allowedUntilYear) || CURRENT_YEAR;
        const activeMonth = Number(data.activeMonth) || CURRENT_MONTH;
        const activeYear = Number(data.activeYear) || CURRENT_YEAR;

        const isSelectedValid =
          selectedYear < maxYear ||
          (selectedYear === maxYear && selectedMonth <= maxMonth);

        if (!isSelectedValid) {
          setViewMonthState(activeMonth);
          setViewYearState(activeYear);
          save("viewMonth", activeMonth);
          save("viewYear", activeYear);
        }
      } catch (error) {
        // API may fail if not authenticated; gracefully continue with defaults
        // Month policy will be fetched again on page navigation once authenticated
        if (cancelled) return;
      }
    };

    // Only load policy if we have valid credentials (check for auth token)
    const authToken = localStorage.getItem("authToken");
    if (authToken) {
      loadPolicy();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const setViewMonth = useCallback(
    (month) => {
      const numericMonth = Number(month);
      if (!isSelectableMonth(numericMonth, viewYear)) return false;
      setViewMonthState(numericMonth);
      save("viewMonth", numericMonth);
      return true;
    },
    [isSelectableMonth, viewYear],
  );

  const setViewYear = useCallback(
    (year) => {
      const numericYear = Number(year);
      const candidateMonth = isSelectableMonth(viewMonth, numericYear)
        ? viewMonth
        : monthPolicy.activeYear === numericYear
          ? monthPolicy.activeMonth
          : 1;

      setViewYearState(numericYear);
      save("viewYear", numericYear);

      if (isSelectableMonth(candidateMonth, numericYear)) {
        setViewMonthState(candidateMonth);
        save("viewMonth", candidateMonth);
      }
      return true;
    },
    [
      isSelectableMonth,
      monthPolicy.activeMonth,
      monthPolicy.activeYear,
      viewMonth,
    ],
  );

  const getMonthDisabledReason = useCallback((month, year) => {
    const status = getMonthStatus(
      month,
      year,
      monthPolicy.currentMonth,
      monthPolicy.currentYear,
    );
    if (status === "future") return "future_month_locked";
    if (status === "past") return "past_month_readonly";
    return "";
  }, [monthPolicy.currentMonth, monthPolicy.currentYear]);

  const getMonthAccessMode = useCallback((month, year) => {
    const status = getMonthStatus(
      month,
      year,
      monthPolicy.currentMonth,
      monthPolicy.currentYear,
    );
    if (status === "current") return "editable";
    if (status === "past") return "readonly";
    return "disabled";
  }, [monthPolicy.currentMonth, monthPolicy.currentYear]);

  return (
    <MonthContext.Provider
      value={{
        viewMonth,
        viewYear,
        setViewMonth,
        setViewYear,
        monthPolicy,
        isSelectableMonth,
        getMonthDisabledReason,
        getMonthAccessMode,
        currentGregorianMonth: monthPolicy.currentMonth,
        currentGregorianYear: monthPolicy.currentYear,
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
