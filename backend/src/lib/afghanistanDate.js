const AFGHANISTAN_TIMEZONE = "Asia/Kabul";
const KABUL_OFFSET_MS = (4 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const PERSIAN_PARTS_FORMATTER = new Intl.DateTimeFormat(
  "fa-AF-u-ca-persian-nu-latn",
  {
    timeZone: AFGHANISTAN_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  },
);

const GREGORIAN_PARTS_FORMATTER = new Intl.DateTimeFormat(
  "en-US-u-ca-gregory-nu-latn",
  {
    timeZone: AFGHANISTAN_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  },
);

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

const formatPartsToDateObject = (formatter, date) => {
  const parts = formatter.formatToParts(date);
  const getPart = (type) =>
    Number(normalizeNumber(parts.find((part) => part.type === type)?.value));

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    throw new Error("Unable to resolve Afghanistan date parts.");
  }

  return { year, month, day };
};

export const getAfghanistanGregorianDateParts = (date = new Date()) =>
  formatPartsToDateObject(GREGORIAN_PARTS_FORMATTER, date);

export const getAfghanistanPersianDateParts = (date = new Date()) =>
  formatPartsToDateObject(PERSIAN_PARTS_FORMATTER, date);

export const getCurrentAfghanMonthYear = (date = new Date()) =>
  getAfghanistanPersianDateParts(date);

export const compareAfghanMonthYear = (left, right) => {
  const leftYear = Number(left?.year);
  const leftMonth = Number(left?.month);
  const rightYear = Number(right?.year);
  const rightMonth = Number(right?.month);

  if (
    !Number.isFinite(leftYear) ||
    !Number.isFinite(leftMonth) ||
    !Number.isFinite(rightYear) ||
    !Number.isFinite(rightMonth)
  ) {
    return NaN;
  }

  if (leftYear !== rightYear) return leftYear - rightYear;
  return leftMonth - rightMonth;
};

export const isFutureAfghanMonth = ({ month, year, now = new Date() }) =>
  compareAfghanMonthYear({ month, year }, getCurrentAfghanMonthYear(now)) > 0;

const incrementAfghanMonth = ({ month, year }) => {
  const safeMonth = Number(month);
  const safeYear = Number(year);

  if (safeMonth >= 12) {
    return { month: 1, year: safeYear + 1 };
  }

  return { month: safeMonth + 1, year: safeYear };
};

const searchAfghanMonthStartGregorianDate = ({ month, year }) => {
  const safeMonth = Number(month);
  const safeYear = Number(year);

  if (
    !Number.isFinite(safeMonth) ||
    !Number.isFinite(safeYear) ||
    safeMonth < 1 ||
    safeMonth > 12
  ) {
    throw Object.assign(new Error("Invalid Afghanistan month/year."), {
      status: 400,
      code: "INVALID_AFGHAN_MONTH",
    });
  }

  const startUtc = Date.UTC(safeYear + 620, 0, 1, 12, 0, 0, 0);
  for (let offset = 0; offset < 800; offset += 1) {
    const candidate = new Date(startUtc + offset * DAY_MS);
    const persian = getAfghanistanPersianDateParts(candidate);

    if (
      persian.year === safeYear &&
      persian.month === safeMonth &&
      persian.day === 1
    ) {
      return getAfghanistanGregorianDateParts(candidate);
    }
  }

  throw Object.assign(new Error("Unable to resolve Afghanistan month range."), {
    status: 500,
    code: "AFGHAN_MONTH_RANGE_RESOLUTION_FAILED",
  });
};

const createUtcDateFromKabulLocalDate = (
  { year, month, day },
  { hour = 0, minute = 0, second = 0, millisecond = 0 } = {},
) =>
  new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
      KABUL_OFFSET_MS,
  );

export const getAfghanMonthDateRange = ({ month, year }) => {
  const startGregorian = searchAfghanMonthStartGregorianDate({ month, year });
  const nextGregorian = searchAfghanMonthStartGregorianDate(
    incrementAfghanMonth({ month, year }),
  );

  const start = createUtcDateFromKabulLocalDate(startGregorian);
  const end = new Date(
    createUtcDateFromKabulLocalDate(nextGregorian).getTime() - 1,
  );

  return {
    start,
    end,
    startGregorian,
    endGregorianExclusive: nextGregorian,
  };
};

export const assertNotFutureAfghanMonth = ({
  month,
  year,
  now = new Date(),
}) => {
  if (isFutureAfghanMonth({ month, year, now })) {
    throw Object.assign(new Error("Future months cannot be selected."), {
      status: 400,
      code: "FUTURE_MONTH_NOT_ALLOWED",
    });
  }
};

export { AFGHANISTAN_TIMEZONE, KABUL_OFFSET_MS };
