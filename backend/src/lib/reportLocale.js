export function normalizeReportLanguage(language = "en") {
  const lang = String(language || "en").toLowerCase();
  if (lang.startsWith("dari") || lang.startsWith("fa")) return "dari";
  if (lang.startsWith("pashto") || lang.startsWith("ps")) return "pashto";
  return "en";
}

const AFGHANISTAN_TIMEZONE = "Asia/Kabul";

const WEEKDAY_MAP_DARI = {
  Sun: "یکشنبه",
  Mon: "دوشنبه",
  Tue: "سه‌شنبه",
  Wed: "چهارشنبه",
  Thu: "پنجشنبه",
  Fri: "جمعه",
  Sat: "شنبه",
};

const WEEKDAY_MAP_PASHTO = {
  Sun: "یکشنبې",
  Mon: "دوشنبې",
  Tue: "سې شنبې",
  Wed: "څلورشنبې",
  Thu: "پنجشنبې",
  Fri: "جمعه",
  Sat: "شنبه",
};

const JALALI_MONTHS_DARI = [
  "حمل",
  "ثور",
  "جوزا",
  "سرطان",
  "اسد",
  "سنبله",
  "میزان",
  "عقرب",
  "قوس",
  "جدی",
  "دلو",
  "حوت",
];

const JALALI_MONTHS_PASHTO = [
  "وری",
  "غویی",
  "غبرګولی",
  "چنګاښ",
  "زمری",
  "وږی",
  "تله",
  "لړم",
  "لیندۍ",
  "مرغومی",
  "سلواغه",
  "کب",
];

export function getReportLocaleTag(language = "en") {
  const normalized = normalizeReportLanguage(language);
  if (normalized === "dari") return "fa-AF-u-ca-persian-nu-latn";
  if (normalized === "pashto") return "ps-AF-u-ca-persian-nu-latn";
  return "en-US-u-nu-latn";
}

export function isRtlReportLanguage(language = "en") {
  const normalized = normalizeReportLanguage(language);
  return normalized === "dari" || normalized === "pashto";
}

function hasTimeParts(options = {}) {
  return (
    options.hour !== undefined ||
    options.minute !== undefined ||
    options.second !== undefined ||
    options.dayPeriod !== undefined
  );
}

function withReportDateDefaults(language = "en", options = {}) {
  const next = { ...options };

  if (!next.timeZone) {
    next.timeZone = AFGHANISTAN_TIMEZONE;
  }

  if (
    hasTimeParts(next) &&
    next.hour12 === undefined &&
    next.hourCycle === undefined
  ) {
    next.hourCycle = "h23";
  }

  return next;
}

export function formatReportDateTime(value, language = "en", options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(getReportLocaleTag(language), {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...withReportDateDefaults(language, options),
  }).format(date);
}

export function formatMonthlyReportHeaderDateTime(value, language = "en") {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const normalized = normalizeReportLanguage(language);
  if (normalized === "en") {
    return formatReportDateTime(date, language);
  }

  try {
    const locale = getReportLocaleTag(language);
    const weekdayShort = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: AFGHANISTAN_TIMEZONE,
    }).format(date);

    const jalaliParts = new Intl.DateTimeFormat("fa-AF-u-ca-persian-nu-latn", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone: AFGHANISTAN_TIMEZONE,
    }).formatToParts(date);

    const day = jalaliParts.find((part) => part.type === "day")?.value;
    const monthRaw = jalaliParts.find((part) => part.type === "month")?.value;
    const year = jalaliParts.find((part) => part.type === "year")?.value;

    const monthIndex = Math.max(1, Math.min(12, Number(monthRaw || 1))) - 1;
    const monthName =
      normalized === "pashto"
        ? JALALI_MONTHS_PASHTO[monthIndex]
        : JALALI_MONTHS_DARI[monthIndex];

    const weekdayName =
      normalized === "pashto"
        ? WEEKDAY_MAP_PASHTO[weekdayShort] || weekdayShort
        : WEEKDAY_MAP_DARI[weekdayShort] || weekdayShort;

    const timePart = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: AFGHANISTAN_TIMEZONE,
    }).format(date);

    if (!day || !year) {
      return formatReportDateTime(date, language);
    }

    const datePart = `${weekdayName}، ${day} ${monthName} ${year}`;
    return `${datePart} — ${timePart}`;
  } catch {
    return formatReportDateTime(date, language);
  }
}

export function formatReportNumber(value, language = "en", options = {}) {
  const num = Number(value || 0);
  const safeNum = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat(getReportLocaleTag(language), options).format(
    safeNum,
  );
}

export const REPORT_TEXT = {
  en: {
    monthly: {
      title: "Monthly Report",
      generatedAt: "Generated",
      totalOrders: "Total Orders",
      summary: "Summary",
      completedPending: "Completed / Pending",
      grossRevenue: "Gross Revenue",
      totalDiscounts: "Total Discounts",
      totalPaid: "Total Paid",
      totalRemaining: "Total Remaining (Outstanding)",
      orderRecords: "Order Records",
      noOrders: "No orders found for this month.",
      continued: "continued",
      footerPrefix: "Hoshmand Safi Tailor System",
      totals: "TOTALS",
      columns: {
        num: "#",
        bill: "Bill#",
        customer: "Customer",
        type: "Type",
        qty: "Qty",
        total: "Total",
        discount: "Discount",
        paid: "Paid",
        remaining: "Remaining",
        status: "Status",
      },
      statusDone: "Done",
      statusPending: "Pending",
      dashboardStatsTitle: "Dashboard Snapshot",
      statGroups: {
        revenue: "Revenue & Profit",
        expenses: "Expenses",
        workers: "Worker Earnings",
        orders: "Orders",
      },
      stats: {
        totalRakhtRevenue: "Total Rakht Revenue",
        totalOrderBenefit: "Total Order Benefit",
        totalOrders: "Total Orders",
        totalAmount: "Total Amount",
        collected: "Collected",
        outstanding: "Outstanding",
        totalDailyExpenses: "Total Daily Expenses",
        totalRakhtPrice: "Total Rakht Price",
        totalLoan: "Total Loan",
        totalQichikarUsersMoney: "Total Qichikar Users Money",
        totalDokhtUsersMoney: "Total Dokht Users Money",
        emergency: "Emergency Orders",
        thisYear: "This Year Orders",
      },
    },
    daily: {
      title: "Daily Tasks Report",
      generatedAt: "Generated at",
      reportType: "Report type",
      dateRange: "Date range",
      totalTasks: "Total tasks",
      totalAmount: "Total amount / expenses",
      highestExpense: "Highest expense",
      averageExpense: "Average expense",
      records: "Daily Task Records",
      continued: "continued",
      noRecords: "No daily task records found for the selected period.",
      footer: "Tailor System - Daily Tasks Report",
      columns: {
        num: "#",
        date: "Date",
        from: "From",
        recipient: "Recipient",
        amount: "Amount",
        note: "Note",
      },
      reportTypes: {
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly",
        yearly: "Yearly",
        custom: "Custom",
      },
    },
  },
  dari: {
    monthly: {
      title: "گزارش ماهانه",
      generatedAt: "زمان تولید",
      totalOrders: "مجموع سفارش‌ها",
      summary: "خلاصه",
      completedPending: "تکمیل شده / در انتظار",
      grossRevenue: "درآمد ناخالص",
      totalDiscounts: "مجموع تخفیف‌ها",
      totalPaid: "مجموع پرداخت شده",
      totalRemaining: "مجموع باقی مانده",
      orderRecords: "فهرست سفارش‌ها",
      noOrders: "برای این ماه سفارشی ثبت نشده است.",
      continued: "ادامه",
      footerPrefix: "سیستم خیاطی هوشمند صافی",
      totals: "مجموع",
      columns: {
        num: "#",
        bill: "بل#",
        customer: "مشتری",
        type: "نوع",
        qty: "تعداد",
        total: "مجموع",
        discount: "تخفیف",
        paid: "پرداخت",
        remaining: "باقی مانده",
        status: "وضعیت",
      },
      statusDone: "تکمیل",
      statusPending: "در انتظار",
      dashboardStatsTitle: "نمای کلی داشبورد",
      statGroups: {
        revenue: "عواید و فایده",
        expenses: "مصارف",
        workers: "درآمد کارگران",
        orders: "سفارش ها",
      },
      stats: {
        totalRakhtRevenue: "مجموع عاید رخت",
        totalOrderBenefit: "مجموع فایده سفارش‌ها",
        totalOrders: "مجموع سفارش‌ها",
        totalAmount: "مجموع مبلغ",
        collected: "مجموع پرداخت شده",
        outstanding: "مجموع باقی مانده",
        totalDailyExpenses: "مجموع مصارف روزانه",
        totalRakhtPrice: "مجموع قیمت رخت ها",
        totalLoan: "مجموع قرض",
        totalQichikarUsersMoney: "مجموع پول قیچی‌کاران",
        totalDokhtUsersMoney: "مجموع پول دوخت‌کاران",
        emergency: "سفارش‌های عاجل",
        thisYear: "سفارش‌های امسال",
      },
    },
    daily: {
      title: "گزارش مصارف روزانه",
      generatedAt: "زمان تولید",
      reportType: "نوع گزارش",
      dateRange: "بازه تاریخ",
      totalTasks: "مجموع مصارف",
      totalAmount: "مجموع مبلغ / مصرف",
      highestExpense: "بیشترین مصرف",
      averageExpense: "میانگین مصرف",
      records: "فهرست مصارف روزانه",
      continued: "ادامه",
      noRecords: "برای بازه انتخاب شده مصرفی یافت نشد.",
      footer: "سیستم خیاطی - گزارش مصارف روزانه",
      columns: {
        num: "#",
        date: "تاریخ",
        from: "از",
        recipient: "گیرنده",
        amount: "مبلغ",
        note: "یادداشت",
      },
      reportTypes: {
        daily: "روزانه",
        weekly: "هفته وار",
        monthly: "ماهانه",
        yearly: "سالانه",
        custom: "دلخواه",
      },
    },
  },
  pashto: {
    monthly: {
      title: "میاشتنی راپور",
      generatedAt: "د جوړېدو وخت",
      totalOrders: "ټول فرمایشونه",
      summary: "لنډیز",
      completedPending: "بشپړ شوي / ناتکمیل",
      grossRevenue: "ټول ناخالص عاید",
      totalDiscounts: "ټول تخفیفونه",
      totalPaid: "ټول ورکړل شوي",
      totalRemaining: "ټول پاتې",
      orderRecords: "د فرمایشونو جدول",
      noOrders: "د دې میاشتې لپاره فرمایش ونه موندل شو.",
      continued: "دوام",
      footerPrefix: "هوشمند صافي خیاطي سیستم",
      totals: "ټول",
      columns: {
        num: "#",
        bill: "بل#",
        customer: "پېرودونکی",
        type: "ډول",
        qty: "شمېر",
        total: "ټول",
        discount: "تخفیف",
        paid: "ورکړل شوي",
        remaining: "پاتې",
        status: "حالت",
      },
      statusDone: "بشپړ",
      statusPending: "په تمه",
      dashboardStatsTitle: "د ډشبورډ لنډه کتنه",
      statGroups: {
        revenue: "عاید او ګټه",
        expenses: "مصارف",
        workers: "د کارګرانو عاید",
        orders: "فرمایشونه",
      },
      stats: {
        totalRakhtRevenue: "د رخت ټول عاید",
        totalOrderBenefit: "د فرمایشونو ټول ګټه",
        totalOrders: "ټول فرمایشونه",
        totalAmount: "ټول مقدار",
        collected: "ټول ترلاسه شوي",
        outstanding: "ټول پاتې",
        totalDailyExpenses: "د ورځنیو مصارفو ټول مقدار",
        totalRakhtPrice: "د ټولو رختونو ټول قیمت",
        totalLoan: "ټول قرض",
        totalQichikarUsersMoney: "د قیچي کارانو ټولې پیسې",
        totalDokhtUsersMoney: "د دوخت‌کارانو ټولې پیسې",
        emergency: "بیړني فرمایشونه",
        thisYear: "د دې کال فرمایشونه",
      },
    },
    daily: {
      title: "د ورځنيو مصارفو راپور",
      generatedAt: "د جوړېدو وخت",
      reportType: "د راپور ډول",
      dateRange: "د نېټې موده",
      totalTasks: "ټول مصارف",
      totalAmount: "ټول مقدار / مصرف",
      highestExpense: "تر ټولو لوړ مصرف",
      averageExpense: "اوسط مصرف",
      records: "د ورځنيو مصارفو جدول",
      continued: "دوام",
      noRecords: "د ټاکل شوې مودې لپاره معلومات نشته.",
      footer: "خیاطي سیستم - د ورځنيو مصارفو راپور",
      columns: {
        num: "#",
        date: "نېټه",
        from: "له",
        recipient: "اخیستونکی",
        amount: "مقدار",
        note: "یادښت",
      },
      reportTypes: {
        daily: "ورځنی",
        weekly: "اوونیز",
        monthly: "مياشتنی",
        yearly: "کلنی",
        custom: "ځانګړی",
      },
    },
  },
};

export function resolveReportText(language = "en") {
  const normalized = normalizeReportLanguage(language);
  return REPORT_TEXT[normalized] || REPORT_TEXT.en;
}
