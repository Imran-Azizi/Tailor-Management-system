import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { normalizeDigits } from "../lib/normalize.js";
import { applyDocumentLocale, normalizeLanguage } from "../lib/locale.js";
import { LOCALE_PATCHES } from "./patches.js";
import en from "./locales/en.json";
import dari from "./locales/dari.json";
import pashto from "./locales/pashto.json";

const resources = {
  en: { translation: en },
  dari: { translation: dari },
  pashto: { translation: pashto },
};

const RBAC_LOCALE_PATCHES = {
  dari: {
    accessDenied: {
      kicker: "ساحه محدود",
      title: "دسترسی رد شد",
      message: "حساب شما اجازه باز کردن این صفحه را ندارد.",
      signedInAs: "وارد شده به نام",
      back: "برگشت",
    },
    permissions: {
      title: "اجازه‌ها",
      subtitle: "دسترسی صفحات و عملیات را برای کاربران دوکان و مالی مدیریت کنید.",
      searchPlaceholder: "جستجوی کاربر با نام یا تلفن...",
      selectedUser: "کاربر انتخاب‌شده",
      enableAll: "فعال‌سازی همه",
      disableAll: "غیرفعال‌سازی همه",
      enabledCount: "{{count}} از {{total}} اجازه فعال است",
      saving: "در حال ذخیره...",
      saved: "اجازه‌ها به‌روز شد.",
      saveFailed: "اجازه‌ها ذخیره نشد.",
      loadFailed: "اجازه‌ها بار نشد.",
      unknown: "اجازه",
      noUsers: "کاربر دوکان یا مالی یافت نشد.",
      searchPermissionsPlaceholder: "جستجوی اجازه‌ها...",
      expandAll: "باز کردن همه",
      collapseAll: "بستن همه",
      selectAll: "انتخاب همه",
      groupCount: "{{count}} از {{total}} فعال",
      userCount: "{{count}}/{{total}}",
      unsavedChanges: "تغییرات ذخیره‌نشده دارید.",
      unsavedBadge: "تغییرات ذخیره‌نشده",
      discard: "لغو تغییرات",
      save: "ذخیره تغییرات",
      noMatches: "هیچ اجازه‌ای با جستجوی شما مطابقت ندارد.",
      selfEditBlocked: "شما نمی‌توانید اجازه‌های خود را تغییر دهید.",
      pagesHeading: "دسترسی صفحات",
      actionsHeading: "اجازه‌های عملیاتی",
      groups: {
        dashboard: "داشبورد",
        orders: "سفارش‌ها",
        customers: "مشتریان",
        finance: "مالی",
        inventory: "موجودی / دوکان",
        reports: "گزارش‌ها",
        users: "کاربران",
        settings: "تنظیمات",
        other: "دیگر",
      },
      labels: {
        "dashboard.view": "دیدن داشبورد",
        "orders.view": "دیدن سفارش‌ها",
        "orders.create": "ساخت سفارش",
        "orders.edit": "ویرایش سفارش",
        "orders.delete": "حذف سفارش",
        "orders.print": "چاپ بل",
        "orders.deliver": "تحویل سفارش",
        "orders.assign": "سپردن سفارش به کارگر",
        "customers.view": "دیدن مشتریان",
        "customers.create": "ساخت مشتری",
        "customers.edit": "ویرایش مشتری",
        "customers.delete": "حذف مشتری",
        "permissions.manage": "مدیریت اجازه‌ها",
        "finance.view": "دیدن مالی",
        "finance.expenses.add": "افزودن مصرف",
        "finance.expenses.edit": "ویرایش مصرف",
        "finance.expenses.delete": "حذف مصرف",
        "finance.revenue.view": "دیدن عاید",
        "finance.profit.view": "دیدن مفاد",
        "finance.debtRecords.view": "دیدن قرض‌ها",
        "finance.payments.manage": "مدیریت پرداخت‌ها",
        "inventory.view": "دیدن موجودی",
        "inventory.products.add": "افزودن جنس",
        "inventory.products.edit": "ویرایش جنس",
        "inventory.products.delete": "حذف جنس",
        "inventory.products.sell": "فروش جنس",
        "inventory.categories.manage": "مدیریت دسته‌ها",
        "reports.view": "دیدن گزارش‌ها",
        "reports.export": "خروجی گزارش",
        "reports.print": "چاپ گزارش",
        "users.view": "دیدن کاربران",
        "users.create": "ساخت کاربر",
        "users.edit": "ویرایش کاربر",
        "users.delete": "حذف کاربر",
        "settings.view": "دیدن تنظیمات",
        "settings.update": "به‌روزرسانی تنظیمات",
      },
    },
  },
  pashto: {
    accessDenied: {
      kicker: "محدوده برخه",
      title: "لاسرسی رد شو",
      message: "ستاسو حساب د دې پاڼې د پرانیستلو اجازه نه لري.",
      signedInAs: "ننوتی د",
      back: "بېرته",
    },
    permissions: {
      title: "اجازې",
      subtitle: "د دوکان او مالي کاروونکو د پاڼو او عملونو لاسرسی اداره کړئ.",
      searchPlaceholder: "کاروونکي د نوم یا ټیلیفون له مخې ولټوئ...",
      selectedUser: "ټاکل شوی کاروونکی",
      enableAll: "ټولې فعالې کړئ",
      disableAll: "ټولې غیرفعالې کړئ",
      enabledCount: "{{count}} له {{total}} اجازو فعالې دي",
      saving: "خوندي کېږي...",
      saved: "اجازې تازه شوې.",
      saveFailed: "اجازې خوندي نه شوې.",
      loadFailed: "اجازې پورته نه شوې.",
      unknown: "اجازه",
      noUsers: "د دوکان یا مالي کاروونکی ونه موندل شو.",
      searchPermissionsPlaceholder: "اجازې ولټوئ...",
      expandAll: "ټولې پرانیستل",
      collapseAll: "ټولې بندول",
      selectAll: "ټولې ټاکل",
      groupCount: "{{count}} له {{total}} فعالې",
      userCount: "{{count}}/{{total}}",
      unsavedChanges: "ناخوندي بدلونونه لرئ.",
      unsavedBadge: "ناخوندي بدلونونه",
      discard: "بدلونونه لغوه کول",
      save: "بدلونونه خوندي کول",
      noMatches: "ستاسو له لټون سره هیڅ اجازه سمون نه خوري.",
      selfEditBlocked: "تاسو نشئ کولی خپلې اجازې بدلې کړئ.",
      pagesHeading: "پاڼو ته لاسرسی",
      actionsHeading: "عملیاتي اجازې",
      groups: {
        dashboard: "ډشبورډ",
        orders: "فرمایشونه",
        customers: "پیرودونکي",
        finance: "مالي",
        inventory: "موجودي / دوکان",
        reports: "راپورونه",
        users: "کاروونکي",
        settings: "تنظیمات",
        other: "نور",
      },
      labels: {
        "dashboard.view": "ډشبورډ لیدل",
        "orders.view": "فرمایشونه لیدل",
        "orders.create": "فرمایش جوړول",
        "orders.edit": "فرمایش سمول",
        "orders.delete": "فرمایش حذفول",
        "orders.print": "بل چاپول",
        "orders.deliver": "فرمایش سپارل",
        "orders.assign": "فرمایش کارګر ته سپارل",
        "customers.view": "پیرودونکي لیدل",
        "customers.create": "پیرودونکی جوړول",
        "customers.edit": "پیرودونکی سمول",
        "customers.delete": "پیرودونکی حذفول",
        "permissions.manage": "اجازې اداره کول",
        "finance.view": "مالي لیدل",
        "finance.expenses.add": "مصرف زیاتول",
        "finance.expenses.edit": "مصرف سمول",
        "finance.expenses.delete": "مصرف حذفول",
        "finance.revenue.view": "عاید لیدل",
        "finance.profit.view": "مفاد لیدل",
        "finance.debtRecords.view": "قرضونه لیدل",
        "finance.payments.manage": "پرداختونه اداره کول",
        "inventory.view": "موجودي لیدل",
        "inventory.products.add": "جنس زیاتول",
        "inventory.products.edit": "جنس سمول",
        "inventory.products.delete": "جنس حذفول",
        "inventory.products.sell": "جنس پلورل",
        "inventory.categories.manage": "دسته‌بندۍ اداره کول",
        "reports.view": "راپورونه لیدل",
        "reports.export": "راپور صادرول",
        "reports.print": "راپور چاپول",
        "users.view": "کاروونکي لیدل",
        "users.create": "کاروونکی جوړول",
        "users.edit": "کاروونکی سمول",
        "users.delete": "کاروونکی حذفول",
        "settings.view": "تنظیمات لیدل",
        "settings.update": "تنظیمات تازه کول",
      },
    },
  },
};

const englishDigitPostProcessor = {
  type: "postProcessor",
  name: "englishDigits",
  process(value) {
    return normalizeDigits(value);
  },
};

i18n
  .use(englishDigitPostProcessor)
  .use(initReactI18next)
  .init({
    resources,
    lng: normalizeLanguage(localStorage.getItem("lang") || "dari"),
    fallbackLng: "en",
    supportedLngs: ["en", "dari", "pashto"],
    nonExplicitSupportedLngs: true,
    returnNull: false,
    postProcess: ["englishDigits"],
    interpolation: { escapeValue: false },
  });

for (const [lang, bundle] of Object.entries(LOCALE_PATCHES)) {
  i18n.addResourceBundle(lang, "translation", bundle, true, true);
}

for (const [lang, bundle] of Object.entries(RBAC_LOCALE_PATCHES)) {
  i18n.addResourceBundle(lang, "translation", bundle, true, true);
}

applyDocumentLocale(i18n.resolvedLanguage || i18n.language || "en");
i18n.on("languageChanged", (lang) => {
  applyDocumentLocale(lang);
});

export default i18n;
