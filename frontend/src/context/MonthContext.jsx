import {

  createContext,

  useContext,

  useState,

  useCallback,

  useEffect,

  useMemo,

} from "react";

import api from "../lib/api.js";

import {

  getCurrentAfghanMonthYear,

  getMonthStatus,

  getPreviousMonthYear,

} from "../lib/months.js";



const { month: CURRENT_MONTH, year: CURRENT_YEAR } =

  getCurrentAfghanMonthYear();



const FOLLOWS_CURRENT_KEY = "viewFollowsCurrent";



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



function loadFollowsCurrent() {

  return load(FOLLOWS_CURRENT_KEY, true);

}



function saveFollowsCurrent(value) {

  save(FOLLOWS_CURRENT_KEY, Boolean(value));

}



function syncViewToMonth(setViewMonthState, setViewYearState, month, year) {

  setViewMonthState(month);

  setViewYearState(year);

  save("viewMonth", month);

  save("viewYear", year);

}



const MonthContext = createContext(null);



export function MonthProvider({ children }) {

  const followsCurrentInitially = loadFollowsCurrent();

  const initialAfghan = getCurrentAfghanMonthYear();



  const [viewMonth, setViewMonthState] = useState(() =>

    followsCurrentInitially

      ? initialAfghan.month

      : load("viewMonth", initialAfghan.month),

  );

  const [viewYear, setViewYearState] = useState(() =>

    followsCurrentInitially

      ? initialAfghan.year

      : load("viewYear", initialAfghan.year),

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



      const nextMonth = maxMonth >= 12 ? 1 : maxMonth + 1;

      const nextYear = maxMonth >= 12 ? maxYear + 1 : maxYear;



      if (yearNumber < nextYear) return true;

      if (yearNumber > nextYear) return false;

      return monthNumber <= nextMonth;

    },

    [monthPolicy.allowedUntilMonth, monthPolicy.allowedUntilYear],

  );



  const applyFollowsCurrentSelection = useCallback(

    (month, year) => {

      const currentMonth = Number(monthPolicy.currentMonth);

      const currentYear = Number(monthPolicy.currentYear);

      const isCurrent =

        getMonthStatus(month, year, currentMonth, currentYear) === "current";

      saveFollowsCurrent(isCurrent);

      return isCurrent;

    },

    [monthPolicy.currentMonth, monthPolicy.currentYear],

  );



  const goToCurrentMonth = useCallback(() => {

    const month = Number(monthPolicy.currentMonth);

    const year = Number(monthPolicy.currentYear);

    if (!Number.isFinite(month) || !Number.isFinite(year)) return false;

    syncViewToMonth(setViewMonthState, setViewYearState, month, year);

    saveFollowsCurrent(true);

    return true;

  }, [monthPolicy.currentMonth, monthPolicy.currentYear]);



  const maybeAutoAdvanceMonth = useCallback(

    (policy, selectedMonth, selectedYear) => {

      if (loadFollowsCurrent()) {

        return {

          month: Number(policy.currentMonth),

          year: Number(policy.currentYear),

          advanced: true,

        };

      }



      const currentMonth = Number(policy.currentMonth);

      const currentYear = Number(policy.currentYear);

      const status = getMonthStatus(

        selectedMonth,

        selectedYear,

        currentMonth,

        currentYear,

      );



      if (status !== "past") {

        return { month: selectedMonth, year: selectedYear, advanced: false };

      }



      const previous = getPreviousMonthYear(currentMonth, currentYear);

      if (

        Number(selectedMonth) === previous.month &&

        Number(selectedYear) === previous.year

      ) {

        saveFollowsCurrent(true);

        return {

          month: currentMonth,

          year: currentYear,

          advanced: true,

        };

      }



      return { month: selectedMonth, year: selectedYear, advanced: false };

    },

    [],

  );



  useEffect(() => {

    let cancelled = false;



    const loadPolicy = async () => {

      try {

        const { data } = await api.get("/analytics/month-policy");

        if (cancelled || !data) return;



        const nextPolicy = {

          currentMonth: Number(data.currentMonth) || CURRENT_MONTH,

          currentYear: Number(data.currentYear) || CURRENT_YEAR,

          activeMonth: Number(data.activeMonth) || CURRENT_MONTH,

          activeYear: Number(data.activeYear) || CURRENT_YEAR,

          allowedUntilMonth: Number(data.allowedUntilMonth) || CURRENT_MONTH,

          allowedUntilYear: Number(data.allowedUntilYear) || CURRENT_YEAR,

          isCurrentMonthCompleted: Boolean(data.isCurrentMonthCompleted),

        };



        setMonthPolicy(nextPolicy);



        const selectedMonth = Number(load("viewMonth", CURRENT_MONTH));

        const selectedYear = Number(load("viewYear", CURRENT_YEAR));



        const maxMonth = Number(data.allowedUntilMonth) || CURRENT_MONTH;

        const maxYear = Number(data.allowedUntilYear) || CURRENT_YEAR;



        const isSelectedValid =

          selectedYear < maxYear ||

          (selectedYear === maxYear && selectedMonth <= maxMonth);



        let targetMonth = selectedMonth;

        let targetYear = selectedYear;



        if (!isSelectedValid) {

          targetMonth = nextPolicy.activeMonth;

          targetYear = nextPolicy.activeYear;

          saveFollowsCurrent(true);

        } else {

          const autoAdvance = maybeAutoAdvanceMonth(

            nextPolicy,

            selectedMonth,

            selectedYear,

          );

          targetMonth = autoAdvance.month;

          targetYear = autoAdvance.year;

        }



        syncViewToMonth(

          setViewMonthState,

          setViewYearState,

          targetMonth,

          targetYear,

        );

      } catch {

        if (cancelled) return;

      }

    };



    loadPolicy();



    return () => {

      cancelled = true;

    };

  }, [maybeAutoAdvanceMonth]);



  useEffect(() => {

    const refreshOnRollover = () => {

      const { month, year } = getCurrentAfghanMonthYear();

      const policyMonth = Number(monthPolicy.currentMonth);

      const policyYear = Number(monthPolicy.currentYear);



      if (month === policyMonth && year === policyYear) {

        if (!loadFollowsCurrent()) return;

        if (viewMonth !== month || viewYear !== year) {

          syncViewToMonth(setViewMonthState, setViewYearState, month, year);

        }

        return;

      }



      if (loadFollowsCurrent()) {

        syncViewToMonth(setViewMonthState, setViewYearState, month, year);

      } else {

        const previous = getPreviousMonthYear(month, year);

        if (viewMonth === previous.month && viewYear === previous.year) {

          syncViewToMonth(setViewMonthState, setViewYearState, month, year);

          saveFollowsCurrent(true);

        }

      }



      api

        .get("/analytics/month-policy")

        .then(({ data }) => {

          if (!data) return;

          setMonthPolicy({

            currentMonth: Number(data.currentMonth) || month,

            currentYear: Number(data.currentYear) || year,

            activeMonth: Number(data.activeMonth) || month,

            activeYear: Number(data.activeYear) || year,

            allowedUntilMonth: Number(data.allowedUntilMonth) || month,

            allowedUntilYear: Number(data.allowedUntilYear) || year,

            isCurrentMonthCompleted: Boolean(data.isCurrentMonthCompleted),

          });

        })

        .catch(() => {});

    };



    const interval = window.setInterval(refreshOnRollover, 60_000);

    const onVisible = () => {

      if (document.visibilityState === "visible") refreshOnRollover();

    };

    document.addEventListener("visibilitychange", onVisible);



    return () => {

      window.clearInterval(interval);

      document.removeEventListener("visibilitychange", onVisible);

    };

  }, [monthPolicy.currentMonth, monthPolicy.currentYear, viewMonth, viewYear]);



  const setViewMonth = useCallback(

    (month) => {

      const numericMonth = Number(month);

      if (!isSelectableMonth(numericMonth, viewYear)) return false;

      setViewMonthState(numericMonth);

      save("viewMonth", numericMonth);

      applyFollowsCurrentSelection(numericMonth, viewYear);

      return true;

    },

    [applyFollowsCurrentSelection, isSelectableMonth, viewYear],

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

        applyFollowsCurrentSelection(candidateMonth, numericYear);

      }

      return true;

    },

    [

      applyFollowsCurrentSelection,

      isSelectableMonth,

      monthPolicy.activeMonth,

      monthPolicy.activeYear,

      viewMonth,

    ],

  );



  const getMonthDisabledReason = useCallback(

    (month, year) => {

      const status = getMonthStatus(

        month,

        year,

        monthPolicy.currentMonth,

        monthPolicy.currentYear,

      );

      if (status === "future") return "future_month_locked";

      if (status === "past") return "past_month_readonly";

      return "";

    },

    [monthPolicy.currentMonth, monthPolicy.currentYear],

  );



  const getMonthAccessMode = useCallback(

    (month, year) => {

      const status = getMonthStatus(

        month,

        year,

        monthPolicy.currentMonth,

        monthPolicy.currentYear,

      );

      if (status === "current") return "editable";

      if (status === "past") return "readonly";

      return "disabled";

    },

    [monthPolicy.currentMonth, monthPolicy.currentYear],

  );



  const value = useMemo(

    () => ({

      viewMonth,

      viewYear,

      setViewMonth,

      setViewYear,

      goToCurrentMonth,

      monthPolicy,

      isSelectableMonth,

      getMonthDisabledReason,

      getMonthAccessMode,

      currentGregorianMonth: monthPolicy.currentMonth,

      currentGregorianYear: monthPolicy.currentYear,

    }),

    [

      viewMonth,

      viewYear,

      setViewMonth,

      setViewYear,

      goToCurrentMonth,

      monthPolicy,

      isSelectableMonth,

      getMonthDisabledReason,

      getMonthAccessMode,

    ],

  );



  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;

}



export function useMonth() {

  const ctx = useContext(MonthContext);

  if (!ctx) throw new Error("useMonth must be used inside MonthProvider");

  return ctx;

}


