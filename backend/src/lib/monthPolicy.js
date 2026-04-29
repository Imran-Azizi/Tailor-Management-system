import { prisma } from "./prisma.js";

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

export const getCurrentAfghanMonthYear = (date = new Date()) => {
  // Project policy: month gating uses Gregorian month/year.
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
};

export const getNextMonthYear = ({ month, year }) => {
  const safeMonth = Number(month);
  const safeYear = Number(year);
  if (!Number.isFinite(safeMonth) || !Number.isFinite(safeYear)) {
    return { month: 1, year: safeYear || new Date().getFullYear() };
  }
  if (safeMonth >= 12) return { month: 1, year: safeYear + 1 };
  return { month: safeMonth + 1, year: safeYear };
};

export const isMonthSelectable = ({ month, year, allowedUntil }) => {
  const safeMonth = Number(month);
  const safeYear = Number(year);
  const limitMonth = Number(allowedUntil?.month);
  const limitYear = Number(allowedUntil?.year);

  if (
    !Number.isFinite(safeMonth) ||
    !Number.isFinite(safeYear) ||
    !Number.isFinite(limitMonth) ||
    !Number.isFinite(limitYear)
  ) {
    return false;
  }

  if (safeYear < limitYear) return true;
  if (safeYear > limitYear) return false;
  return safeMonth <= limitMonth;
};

/**
 * Determines the status of a month relative to the current Afghan month
 * Returns: "current" | "past" | "future"
 */
export const getMonthStatus = (month, year, currentMonth, currentYear) => {
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
};

export const getMonthPolicy = async ({ tx = prisma } = {}) => {
  const current = getCurrentAfghanMonthYear();

  const [totalCurrentOrders, pendingCurrentOrders] = await Promise.all([
    tx.order.count({
      where: {
        entryMonth: current.month,
        entryYear: current.year,
      },
    }),
    tx.order.count({
      where: {
        entryMonth: current.month,
        entryYear: current.year,
        isCompleted: false,
      },
    }),
  ]);

  const isCurrentMonthCompleted =
    totalCurrentOrders > 0 && pendingCurrentOrders === 0;
  const allowedUntil = isCurrentMonthCompleted
    ? getNextMonthYear(current)
    : current;

  return {
    calendar: "GREGORIAN",
    currentMonth: current.month,
    currentYear: current.year,
    isCurrentMonthCompleted,
    activeMonth: allowedUntil.month,
    activeYear: allowedUntil.year,
    allowedUntilMonth: allowedUntil.month,
    allowedUntilYear: allowedUntil.year,
  };
};

export const assertMonthWritable = ({ month, year, policy }) => {
  const selectable = isMonthSelectable({
    month,
    year,
    allowedUntil: {
      month: policy.allowedUntilMonth,
      year: policy.allowedUntilYear,
    },
  });

  if (!selectable) {
    throw Object.assign(
      new Error(
        "Selected month is locked. Future months are enabled only after current month is fully completed.",
      ),
      {
        status: 403,
        code: "MONTH_LOCKED",
        allowedUntilMonth: policy.allowedUntilMonth,
        allowedUntilYear: policy.allowedUntilYear,
      },
    );
  }
};
