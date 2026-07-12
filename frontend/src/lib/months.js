export const MONTHS = [
  { value: 1, labelEn: "Hamal", labelDari: "حمل", labelPashto: "وری" },
  { value: 2, labelEn: "Sawr", labelDari: "ثور", labelPashto: "غویی" },
  { value: 3, labelEn: "Jawza", labelDari: "جوزا", labelPashto: "غبرګولی" },
  { value: 4, labelEn: "Saratan", labelDari: "سرطان", labelPashto: "چنګاښ" },
  { value: 5, labelEn: "Asad", labelDari: "اسد", labelPashto: "زمری" },
  { value: 6, labelEn: "Sunbula", labelDari: "سنبله", labelPashto: "وږی" },
  { value: 7, labelEn: "Mizan", labelDari: "میزان", labelPashto: "تله" },
  { value: 8, labelEn: "Aqrab", labelDari: "عقرب", labelPashto: "لړم" },
  { value: 9, labelEn: "Qaws", labelDari: "قوس", labelPashto: "لیندۍ" },
  { value: 10, labelEn: "Jadi", labelDari: "جدی", labelPashto: "مرغومی" },
  { value: 11, labelEn: "Dalwa", labelDari: "دلو", labelPashto: "سلواغه" },
  { value: 12, labelEn: "Hut", labelDari: "حوت", labelPashto: "کب" },
];

const AFGHANISTAN_TIMEZONE = "Asia/Kabul";

const normalizeNumber = (value) => {
  if (typeof value !== "string") return String(value || "");
  const map = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  return value.replace(/[۰-۹٠-٩]/g, (char) => map[char] || char);
};

/**
 * Returns the localized month label for a given month value (1-12) and language.
 * @param {number} monthValue
 * @param {string} language  - "en" | "dari" | "pashto"
 * @returns {string}
 */
export function getMonthLabel(monthValue, language) {
  const m = MONTHS.find((x) => x.value === monthValue);
  if (!m) return "";
  if (language === "dari") return m.labelDari;
  if (language === "pashto") return m.labelPashto;
  return m.labelEn;
}

export function getCurrentAfghanMonthYear(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("fa-AF-u-ca-persian", {
      timeZone: AFGHANISTAN_TIMEZONE,
      month: "numeric",
      year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const month = Number(
      normalizeNumber(parts.find((part) => part.type === "month")?.value),
    );
    const year = Number(
      normalizeNumber(parts.find((part) => part.type === "year")?.value),
    );

    if (
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      month >= 1 &&
      month <= 12
    ) {
      return { month, year };
    }
  } catch {
    // Fall back to Gregorian if Persian calendar is unavailable.
  }

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function getDisplayMonthYearForLanguage(month, year, language) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(m) || !Number.isFinite(y)) return { month: m, year: y };
  return { month: m, year: y };
}

export function getDisplayMonthLabelForLanguage(month, year, language) {
  const { month: displayMonth } = getDisplayMonthYearForLanguage(
    month,
    year,
    language,
  );
  return getMonthLabel(displayMonth, language) || String(displayMonth);
}

export function formatMonthYearLabel(month, year, language) {
  const { month: displayMonth, year: displayYear } =
    getDisplayMonthYearForLanguage(month, year, language);
  const label = getMonthLabel(displayMonth, language) || String(displayMonth);
  const yearLabel = new Intl.NumberFormat("en-US", {
    useGrouping: false,
    maximumFractionDigits: 0,
  }).format(displayYear);
  return `${label} ${yearLabel}`;
}

export function getDisplayYearForLanguage(year, month, language) {
  return getDisplayMonthYearForLanguage(month, year, language).year;
}

export function getPreviousMonthYear(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(m) || !Number.isFinite(y)) {
    return { month: 1, year: y || new Date().getFullYear() };
  }
  if (m <= 1) return { month: 12, year: y - 1 };
  return { month: m - 1, year: y };
}

/**
 * Returns the current Gregorian (English calendar) month and year
 * @param {Date} date
 * @returns {{month: number, year: number}}
 */
export function getCurrentGregorianMonthYear(date = new Date()) {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

/**
 * Determines the status of a month: "current" | "past" | "future"
 * Based on Gregorian calendar
 * @param {number} month - 1-12
 * @param {number} year
 * @param {number} currentMonth - current Gregorian month
 * @param {number} currentYear - current Gregorian year
 * @returns {string}
 */
export function getMonthStatus(month, year, currentMonth, currentYear) {
  const m = Number(month);
  const y = Number(year);
  const cm = Number(currentMonth);
  const cy = Number(currentYear);

  if (
    !Number.isFinite(m) ||
    !Number.isFinite(y) ||
    !Number.isFinite(cm) ||
    !Number.isFinite(cy)
  ) {
    return "unknown";
  }

  if (y < cy) return "past";
  if (y > cy) return "future";
  if (m < cm) return "past";
  if (m > cm) return "future";
  return "current";
}

/**
 * Converts Gregorian month/year to Afghan Solar Hijri month/year
 * Uses Intl Persian calendar conversion to avoid arithmetic drift.
 * @param {number} gregorianMonth - 1-12
 * @param {number} gregorianYear
 * @returns {{month: number, year: number}}
 */
export function gregorianToAfghanMonthYear(gregorianMonth, gregorianYear) {
  const gm = Number(gregorianMonth);
  const gy = Number(gregorianYear);

  if (!Number.isFinite(gm) || !Number.isFinite(gy)) {
    return { month: gm, year: gy };
  }

  try {
    // Use mid-month date to avoid edge behavior at month boundaries.
    const date = new Date(gy, gm - 1, 15);
    const formatter = new Intl.DateTimeFormat("fa-AF-u-ca-persian", {
      month: "numeric",
      year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const month = Number(
      normalizeNumber(parts.find((part) => part.type === "month")?.value),
    );
    const year = Number(
      normalizeNumber(parts.find((part) => part.type === "year")?.value),
    );

    if (
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      month >= 1 &&
      month <= 12
    ) {
      return { month, year };
    }
  } catch {
    // Fall back below if Intl conversion fails.
  }

  // Safe fallback if Intl calendar is unavailable.
  return {
    month: gm,
    year: gy,
  };
}

/**
 * Converts Afghan Solar Hijri month/year to Gregorian month/year
 * Uses Intl Persian calendar matching for better correctness.
 * @param {number} afghanMonth - 1-12
 * @param {number} afghanYear
 * @returns {{month: number, year: number}}
 */
export function afghanToGregorianMonthYear(afghanMonth, afghanYear) {
  const am = Number(afghanMonth);
  const ay = Number(afghanYear);

  if (!Number.isFinite(am) || !Number.isFinite(ay)) {
    return { month: am, year: ay };
  }

  try {
    const formatter = new Intl.DateTimeFormat("fa-AF-u-ca-persian", {
      month: "numeric",
      year: "numeric",
    });

    // Search around the likely Gregorian range for the first matching month/year.
    const start = new Date(ay + 620, 0, 1);
    for (let i = 0; i < 500; i += 1) {
      const candidate = new Date(start);
      candidate.setDate(start.getDate() + i);
      const parts = formatter.formatToParts(candidate);
      const month = Number(
        normalizeNumber(parts.find((part) => part.type === "month")?.value),
      );
      const year = Number(
        normalizeNumber(parts.find((part) => part.type === "year")?.value),
      );
      if (month === am && year === ay) {
        return {
          month: candidate.getMonth() + 1,
          year: candidate.getFullYear(),
        };
      }
    }
  } catch {
    // Fall back below if Intl conversion fails.
  }

  // Safe fallback if Intl calendar is unavailable.
  return {
    month: am,
    year: ay,
  };
}
