export function normalizeReportLanguage(language = "en") {
  const lang = String(language || "en").toLowerCase();
  if (lang.startsWith("dari") || lang.startsWith("fa")) return "dari";
  if (lang.startsWith("pashto") || lang.startsWith("ps")) return "pashto";
  return "en";
}

const AFGHANISTAN_TIMEZONE = "Asia/Kabul";

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
  const normalized = normalizeReportLanguage(language);
  const next = { ...options };

  if (
    (normalized === "dari" || normalized === "pashto") &&
    !next.timeZone
  ) {
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
      totalOrders: "مجموع سفارش ها",
      summary: "خلاصه",
      completedPending: "تکمیل شده / در انتظار",
      grossRevenue: "درآمد ناخالص",
      totalDiscounts: "مجموع تخفیف ها",
      totalPaid: "مجموع پرداخت شده",
      totalRemaining: "مجموع باقی مانده",
      orderRecords: "فهرست سفارش ها",
      noOrders: "برای این ماه سفارشی ثبت نشده است.",
      continued: "ادامه",
      footerPrefix: "سیستم خیاطی خان رحیمی",
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
      title: "مياشتنی راپور",
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
      footerPrefix: "خان رحيمي خیاطي سیستم",
      totals: "ټول",
      columns: {
        num: "#",
        bill: "بل#",
        customer: "مشتری",
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
