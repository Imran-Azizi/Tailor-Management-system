import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuDownload,
  LuFileText,
  LuPhone,
  LuPrinter,
  LuScissors,
} from "react-icons/lu";
import AfCurrencyIcon from "../ui/AfCurrencyIcon.jsx";
import {
  SHOP_CONFIG,
  getLocalizedShopValue,
} from "../../config/shopConfig.js";
import { assetUrl } from "../../lib/assets.js";
import { toAsciiDigits } from "../../lib/normalize.js";
import { formatCurrency } from "../../lib/currency.js";
import {
  getOrderGrossTotal,
  getOrderNetTotal,
} from "../../lib/orderFinancials.js";
import { formatMeters } from "../../lib/meters.js";
import { resolveRakhtColorHex } from "../../lib/rakhtColors.js";
import {
  getMeasurementFieldLabel,
  getStyleFieldLabel,
} from "./measurementLabels.js";
import {
  MEASUREMENT_FIELDS,
  POCKET_FIELDS,
  STYLE_FIELDS,
} from "./measurementStepConfig.js";
import {
  getOrderDisplayName as getLocalizedOrderDisplayName,
  getOrderLabelParts as getLocalizedOrderLabelParts,
  getOrderTypeLabel as getLocalizedOrderTypeLabel,
} from "../../lib/orderType.js";
import { useAuth } from "../../context/AuthContext.jsx";

const SKIP_FIELDS = new Set(["id", "orderId", "__name"]);

const ORDER_TYPE_LABELS = {
  en: {
    OUTFIT: "Outfit",
    WASKAT: "Waskat",
    KORTY: "Korty",
    YAKHANQAQ: "Yakhan Qaq",
  },
  dari: {
    OUTFIT: "پیراهن تنبان",
    WASKAT: "واسکت",
    KORTY: "کرتی",
    YAKHANQAQ: "یخن‌قاق",
  },
  pashto: {
    OUTFIT: "پیراهن تنبان",
    WASKAT: "واسکټ",
    KORTY: "کورتي",
    YAKHANQAQ: "یخن‌قاق",
  },
};

const BILL_TEXT = {
  en: {
    customerBill: "Customer Bill",
    tailorCopy: "Tailor Shop Copy",
    customerName: "Customer Name",
    billNo: "Bill #",
    qty: "Qty",
    value: "Val.",
    financialSummary: "Financial Summary",
    totalPrice: "Total Price",
    discount: "Discount",
    paidAmount: "Paid Amount",
    remaining: "Remaining",
    paidInFull: "Completed",
    customerInformation: "Customer Information",
    measurementInformation: "Measurement Information",
    stylesInformation: "Styles Information",
    date: "Date",
    name: "Name",
    phone: "Phone",
    quantity: "Quantity",
    yes: "Yes",
    printBillForCustomer: "Print Bill for Customer",
    printBillForTailor: "Print Bill for Tailor Shop",
    customerBillCopy: "A5 receipt with bill summary and financial breakdown",
    tailorBillCopy: "Internal copy with measurements and style details",
    orderDocumentTitle: "Order Document",
    pdf: "PDF",
  },
  dari: {
    customerBill: "بل مشتری",
    tailorCopy: "کاپی خیاط",
    customerName: "نام مشتری",
    billNo: "شماره بل",
    qty: "تعداد",
    value: "مقدار",
    financialSummary: "خلاصه مالی",
    totalPrice: "قیمت مجموعی",
    discount: "تخفیف",
    paidAmount: "مبلغ پرداخت‌شده",
    remaining: "باقی‌مانده",
    paidInFull: "تکمیل‌شده",
    customerInformation: "معلومات مشتری",
    measurementInformation: "معلومات اندازه‌گیری",
    stylesInformation: "معلومات دیزاین",
    date: "تاریخ",
    name: "نام",
    phone: "شماره تماس",
    quantity: "تعداد",
    yes: "بلی",
    printBillForCustomer: "چاپ بل مشتری",
    printBillForTailor: "چاپ بل خیاط",
    customerBillCopy: "رسید A5 با خلاصه بل و جزئیات مالی",
    tailorBillCopy: "کاپی داخلی با اندازه‌ها و جزئیات دیزاین",
    orderDocumentTitle: "سند سفارش",
    pdf: "PDF",
  },
  pashto: {
    customerBill: "د پېرودونکي بل",
    tailorCopy: "د خیاط کاپي",
    customerName: "د پېرودونکي نوم",
    billNo: "د بل شمېره",
    qty: "شمېر",
    value: "ارزښت",
    financialSummary: "مالي لنډیز",
    totalPrice: "ټوله بیه",
    discount: "تخفیف",
    paidAmount: "ورکړل شوې پیسې",
    remaining: "پاتې",
    paidInFull: "بشپړ شوی",
    customerInformation: "د پېرودونکي معلومات",
    measurementInformation: "د اندازو معلومات",
    stylesInformation: "د ډیزاین معلومات",
    date: "نېټه",
    name: "نوم",
    phone: "د تماس شمېره",
    quantity: "شمېر",
    yes: "هو",
    printBillForCustomer: "د پېرودونکي بل چاپ",
    printBillForTailor: "د خیاط بل چاپ",
    customerBillCopy: "A5 رسید د بل لنډیز او مالي جزئیاتو سره",
    tailorBillCopy: "داخلي کاپي د اندازو او ډیزاین جزئیاتو سره",
    orderDocumentTitle: "د فرمایش سند",
    pdf: "PDF",
  },
};

const BILL_EXTRA_TEXT = {
  en: {
    box: "Box",
    itemPrice: "Item Price",
    totalAllClothes: "Total Amount",
    totalDiscountAllClothes: "Discount",
    totalPaidAllClothes: "Paid Amount",
    totalRemainingAllClothes: "Remaining",
    notAssigned: "Not Assigned",
  },
  dari: {
    box: "صندوق",
    itemPrice: "قیمت هر مورد",
    totalAllClothes: "مبلغ مجموعی",
    totalDiscountAllClothes: "تخفیف",
    totalPaidAllClothes: "مبلغ پرداخت‌شده",
    totalRemainingAllClothes: "باقی‌مانده",
    notAssigned: "تعیین نشده",
  },
  pashto: {
    box: "بکس",
    itemPrice: "د هر توکي بیه",
    totalAllClothes: "ټول مبلغ",
    totalDiscountAllClothes: "تخفیف",
    totalPaidAllClothes: "ورکړل شوې پیسې",
    totalRemainingAllClothes: "پاتې",
    notAssigned: "نه دی ټاکل شوی",
  },
};
const PRINT_SHOP_HEADER_NAME = "Hoshmand Safi";
const AFGHANISTAN_TIMEZONE = "Asia/Kabul";

export function getBillLanguageSettings(language) {
  const lang = String(language || "en").toLowerCase();
  const langCode =
    lang.startsWith("pashto") || lang.startsWith("ps")
      ? "pashto"
      : lang.startsWith("dari") || lang.startsWith("fa")
        ? "dari"
        : "en";

  const isRtl = langCode === "dari" || langCode === "pashto";
  const locale =
    langCode === "en" ? "en-US" : langCode === "dari" ? "fa-AF" : "ps-AF";

  return {
    langCode,
    locale,
    htmlLang: locale,
    dir: isRtl ? "rtl" : "ltr",
    isRtl,
    fontFamily: "'Inter','Noto Naskh Arabic','Noto Sans Arabic',sans-serif",
    text: BILL_TEXT[langCode],
  };
}

export function getOrderTypeLabel(type, language) {
  return getLocalizedOrderTypeLabel(type, language);
}

export function getOrderDisplayName(order, language, options) {
  return getLocalizedOrderDisplayName(order, language, options);
}

function getOrderLabelParts(order, language, options) {
  return getLocalizedOrderLabelParts(order, language, options);
}

function getCustomerDisplayName(customer) {
  return String(customer?.firstName || "").trim() || "-";
}

function formatMoney(amount, language) {
  return formatCurrency(amount, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));
}

function toEnglishDigits(value) {
  if (value === null || value === undefined || value === "") return "-";
  return toAsciiDigits(String(value));
}

function normalizeShopPrintStyleValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  return text.replace(/^(?:دیزاین|ډیزاین|Design|Style)\s+/i, "").trim();
}

function withLatinDigitsLocale(locale) {
  const base = String(locale || "en-US");
  if (/-u-/.test(base)) {
    return /\bnu-latn\b/.test(base) ? base : `${base}-nu-latn`;
  }
  return `${base}-u-nu-latn`;
}

function getPrintDateLocale(settings) {
  if (settings?.langCode === "dari") return "fa-AF-u-ca-persian";
  if (settings?.langCode === "pashto") return "ps-AF-u-ca-persian";
  return settings?.locale || "en-US";
}

function formatMeasurementValue(value) {
  if (value === null || value === undefined || value === "") return "";
  return toEnglishDigits(String(value).trim());
}

function formatMetersWithUnit(value) {
  const formatted = formatMeters(value);
  return formatted === "-" ? "-" : `${formatted}m`;
}

function formatDateWithEnglishDigits(dateInput, settings, timeZone) {
  const value = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(value.getTime())) return "-";
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  if (timeZone) options.timeZone = timeZone;
  const fmt = new Intl.DateTimeFormat(
    withLatinDigitsLocale(getPrintDateLocale(settings)),
    options,
  );
  return fmt.format(value);
}

function formatTimeWithEnglishDigits(dateInput, settings, timeZone) {
  const value = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(value.getTime())) return "-";
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  };
  if (timeZone) options.timeZone = timeZone;
  const fmt = new Intl.DateTimeFormat(
    withLatinDigitsLocale(getPrintDateLocale(settings)),
    options,
  );
  return fmt.format(value);
}

function hasBillFieldValue(value) {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") return hasPrintableBillValue(value);
  if (Array.isArray(value)) return value.some((item) => hasBillFieldValue(item));
  return true;
}

const EMPTY_BILL_TEXT_VALUES = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "null",
  "undefined",
]);

export function hasPrintableBillValue(value) {
  if (value === null || value === undefined || value === false) return false;
  if (Array.isArray(value)) return value.some((item) => hasPrintableBillValue(item));
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value;
  const text = String(value).trim();
  return !EMPTY_BILL_TEXT_VALUES.has(text.toLowerCase());
}

function hasPositiveNumber(value) {
  if (value === null || value === undefined || value === "") return false;
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function getBorderClass(index, items, includeBottom = true) {
  const border = includeBottom ? "border-b" : "";
  const inline = index < items.length - 1 ? "border-r" : "";
  return `${border} ${inline} border-slate-800`.trim();
}

export function getRakhtDetails(order) {
  const color = hasPrintableBillValue(order?.rakhtColor)
    ? String(order.rakhtColor).trim()
    : "";
  const colorHex = hasPrintableBillValue(order?.rakhtColorHex)
    ? order.rakhtColorHex
    : null;
  const brand = hasPrintableBillValue(order?.rakhtBrandName)
    ? String(order.rakhtBrandName).trim()
    : "";
  const company = hasPrintableBillValue(order?.rakhtCompanyName)
    ? String(order.rakhtCompanyName).trim()
    : "";
  const meters = hasPositiveNumber(order?.rakhtRequiredMeters)
    ? formatMetersWithUnit(order.rakhtRequiredMeters)
    : "";
  const hasData = [color, colorHex, brand, company, meters].some(
    hasPrintableBillValue,
  );

  return {
    color,
    colorHex,
    brand,
    company,
    meters,
    hasData,
  };
}

function RakhtSummary({ details }) {
  if (!details?.hasData) return null;
  const swatchHex = resolveRakhtColorHex(details.color, details.colorHex);
  const metaParts = [details.brand, details.company, details.meters].filter(
    hasPrintableBillValue,
  );

  return (
    <>
      {hasPrintableBillValue(details.color) ? (
        <p className="inline-flex items-center gap-1 font-semibold text-slate-900">
          {swatchHex ? (
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                border: "1px solid rgba(15,23,42,0.16)",
                background: swatchHex,
                flexShrink: 0,
              }}
            />
          ) : null}
          <span>{details.color}</span>
        </p>
      ) : null}
      {metaParts.length > 0 ? (
        <p className="mt-0.5 text-[8px] text-slate-600 [direction:ltr] [unicode-bidi:embed]">
          {metaParts.join(" - ")}
        </p>
      ) : null}
    </>
  );
}

function getPrintDateTime(settings, timestamp) {
  const isAfghanLocale =
    settings.langCode === "dari" || settings.langCode === "pashto";
  const source = timestamp || Date.now();
  const zone = isAfghanLocale ? AFGHANISTAN_TIMEZONE : undefined;
  return {
    date: formatDateWithEnglishDigits(source, settings, zone),
    time: formatTimeWithEnglishDigits(source, settings, zone),
  };
}

function getPrintableText(value, settings, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => getPrintableText(item, settings, ""))
      .filter(Boolean)
      .join(" | ");
    return text || fallback;
  }

  if (typeof value === "object") {
    const localized = getLocalizedShopValue(value, settings?.langCode || "en");
    if (
      typeof localized === "string" ||
      typeof localized === "number" ||
      typeof localized === "boolean"
    ) {
      const text = String(localized);
      if (text) return text;
    }

    for (const key of ["label", "name", "title", "value", "text"]) {
      if (value[key] !== undefined) {
        const text = getPrintableText(value[key], settings, "");
        if (text) return text;
      }
    }
  }

  return fallback;
}

function resolvePrintShop(...sources) {
  return (
    sources.find((source) => source && typeof source === "object") || null
  );
}

function PrintBillHeader({ settings, title, date, time, shop }) {
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const rowDirClass = settings.isRtl ? "flex-row-reverse" : "flex-row";
  const shopInfoAlignClass = settings.isRtl
    ? "items-end text-right"
    : "items-start text-left";
  const shopName = shop?.businessName || shop?.systemName || PRINT_SHOP_HEADER_NAME;
  const tenantLogoUrl = String(shop?.logoUrl || "").trim();
  const defaultLogoUrl = SHOP_CONFIG.logoUrl || SHOP_CONFIG.logo || "";
  const logoUrl = assetUrl(tenantLogoUrl || defaultLogoUrl);
  const shopAddress = shop?.address || getPrintableText(SHOP_CONFIG.address, settings, "");
  const shopPhones = [shop?.phone, shop?.mobile].filter(Boolean);
  const fallbackPhones = SHOP_CONFIG.phones || [];
  const shopInitials = String(shopName || "KR")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const safeTitle = getPrintableText(title, settings, "");

  return (
    <header
      className={`print-bill-header ${settings.isRtl ? "print-bill-header--rtl" : ""}`}
    >
      <div className={`print-bill-header-body ${rowDirClass}`}>
        <div className={`print-bill-header-brand ${rowDirClass}`}>
          <div className="print-bill-header-logo">
            {logoUrl ? (
              <img src={logoUrl} alt={shopName} className="print-bill-header-logo-img" />
            ) : (
              <div className="print-bill-header-logo-fallback">
                {shopInitials || "KR"}
              </div>
            )}
          </div>
          <div className={`print-bill-header-shop ${shopInfoAlignClass}`}>
            <p className="print-bill-header-name">{shopName}</p>
            {shopAddress ? (
              <p className="print-bill-header-meta print-shop-meta">{shopAddress}</p>
            ) : null}
            <p
              className="print-bill-header-meta print-bill-header-meta--ltr print-shop-meta"
              dir="ltr"
            >
              {(shopPhones.length ? shopPhones : fallbackPhones).join(" | ")}
            </p>
          </div>
        </div>
        <div className={`print-bill-header-meta-block ${alignClass}`}>
          <span className="print-bill-header-badge">{safeTitle}</span>
          <p className="print-bill-header-datetime" dir="ltr">
            {date} | {time}
          </p>
        </div>
      </div>
    </header>
  );
}

export function getMeasurementsFromOrder(order) {
  if (!order) return {};

  const normalizeMeasurementObject = (value) => {
    if (!value) return {};
    if (Array.isArray(value)) {
      const firstObject = value.find(
        (entry) => entry && typeof entry === "object" && !Array.isArray(entry),
      );
      return firstObject || {};
    }
    return typeof value === "object" ? value : {};
  };

  const hasValues = (obj) =>
    Object.keys(obj || {}).some((key) => !SKIP_FIELDS.has(key));

  const inputMeasurements = normalizeMeasurementObject(order.measurements);

  let persistedMeasurements = {};
  if (order.type === "OUTFIT") persistedMeasurements = order.outfit || {};
  else if (order.type === "WASKAT") persistedMeasurements = order.waskat || {};
  else if (order.type === "KORTY") persistedMeasurements = order.korty || {};
  else if (order.type === "YAKHANQAQ")
    persistedMeasurements = order.yakhanQaq || {};
  else if (order.type === "READY_MADE")
    persistedMeasurements = order.readyMadeOrder || {};

  // Merge both sources so print bills always include all provided values.
  const merged = {
    ...normalizeMeasurementObject(persistedMeasurements),
    ...inputMeasurements,
  };

  if (hasValues(merged)) return merged;
  if (hasValues(normalizeMeasurementObject(persistedMeasurements))) {
    return normalizeMeasurementObject(persistedMeasurements);
  }
  if (hasValues(inputMeasurements)) return inputMeasurements;
  return {};
}

export function CustomerBill({ customer, order, shop }) {
  const { i18n, t } = useTranslation();
  const settings = getBillLanguageSettings(
    i18n.resolvedLanguage || i18n.language,
  );
  const grossTotal = getOrderGrossTotal(order);
  const netTotal = getOrderNetTotal(order);
  const discount = order?.discount || 0;
  const paid = order?.paidAmount || 0;
  const remaining = Math.max(0, order?.remaining ?? netTotal - paid);
  const qty = order?.quantity || 1;
  const orderLabelParts = getOrderLabelParts(order, settings.langCode);
  const orderTypeLabel = orderLabelParts.typeWithSequenceLabel;
  const customerNameLabel = getCustomerDisplayName(customer);
  const { date, time } = getPrintDateTime(
    settings,
    order?.createdAt || Date.now(),
  );
  const txt = settings.text;
  const extraTxt = BILL_EXTRA_TEXT[settings.langCode] || BILL_EXTRA_TEXT.en;
  const safeTxt = (key) => getPrintableText(txt[key], settings, key);
  const boxName =
    order?.box?.boxName || order?.foreignBox?.boxName || "";
  const rakhtDetails = getRakhtDetails(order);
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const tableHeadClass = settings.isRtl
    ? "print-bill-th"
    : "print-bill-th print-bill-th--upper";
  const billNo = hasPrintableBillValue(customer?.billNumber)
    ? toEnglishDigits(customer.billNumber)
    : "";
  const customerPhone = hasPrintableBillValue(customer?.phoneNumber)
    ? toEnglishDigits(customer.phoneNumber)
    : "";
  const isEmergency = order?.isEmergency;
  const billTypographyStyle = {
    fontFamily: settings.fontFamily,
    ...(settings.isRtl
      ? {
          textAlign: "right",
          letterSpacing: "0",
          wordSpacing: "0",
          fontFeatureSettings: '"rlig" 1, "liga" 1, "calt" 1',
        }
      : {}),
  };
  const rakhtInfoFields = [
    {
      key: "color",
      label: t("rakht.color", { defaultValue: "Color" }),
      value: rakhtDetails.color,
      show: hasPrintableBillValue(rakhtDetails.color),
      render: () =>
        renderRakhtColorValue(rakhtDetails.color, rakhtDetails.colorHex),
    },
    {
      key: "brand",
      label: t("rakht.brandName", { defaultValue: "Brand" }),
      value: rakhtDetails.brand,
      show: hasPrintableBillValue(rakhtDetails.brand),
      render: () => rakhtDetails.brand,
    },
    {
      key: "company",
      label: t("rakht.companyName", { defaultValue: "Company" }),
      value: rakhtDetails.company,
      show: hasPrintableBillValue(rakhtDetails.company),
      render: () => rakhtDetails.company,
    },
    {
      key: "meters",
      label: t("rakht.requiredMeters", { defaultValue: "Meters" }),
      value: rakhtDetails.meters,
      show: hasPrintableBillValue(rakhtDetails.meters),
      className: "[direction:ltr] [unicode-bidi:embed]",
      render: () => rakhtDetails.meters,
    },
  ].filter((field) => field.show);
  const detailColumns = [
    {
      key: "billNo",
      header: txt.billNo,
      width: "10%",
      align: alignClass,
      show: hasPrintableBillValue(billNo),
      render: () => (
        <span className="print-bill-number [direction:ltr] [unicode-bidi:embed]">
          #{billNo}
        </span>
      ),
    },
    {
      key: "customerName",
      header: txt.customerName,
      width: "14%",
      align: alignClass,
      show: hasPrintableBillValue(customerNameLabel),
      className: "font-semibold",
      render: () => customerNameLabel,
    },
    {
      key: "phone",
      header: txt.phone,
      width: "17%",
      align: "[direction:ltr]",
      show: hasPrintableBillValue(customerPhone),
      className: "font-semibold [direction:ltr] [unicode-bidi:embed]",
      render: () => customerPhone,
    },
    {
      key: "orderType",
      header: t("orders.orderType"),
      width: "14%",
      align: alignClass,
      show: hasPrintableBillValue(orderTypeLabel),
      className: "font-semibold",
      render: () => orderTypeLabel,
    },
    {
      key: "qty",
      header: txt.qty,
      width: "7%",
      align: "[direction:ltr]",
      show: hasPrintableBillValue(qty),
      className: "text-center font-bold [direction:ltr] [unicode-bidi:embed]",
      render: () => formatNumber(qty),
    },
    {
      key: "box",
      header: extraTxt.box,
      width: "11%",
      align: alignClass,
      show: hasPrintableBillValue(boxName),
      render: () => boxName,
    },
    {
      key: "itemPrice",
      header: extraTxt.itemPrice,
      width: "16%",
      align: "[direction:ltr]",
      show: hasPrintableBillValue(grossTotal),
      className:
        "text-center font-black text-slate-900 [direction:ltr] [unicode-bidi:embed]",
      render: () => formatMoney(grossTotal, settings.langCode),
    },
  ].filter((column) => column.show);
  const financeColumns = [
    {
      key: "total",
      header: txt.totalPrice,
      colorClass: "text-blue-900",
      show: true,
      render: () => formatMoney(grossTotal, settings.langCode),
    },
    {
      key: "discount",
      header: txt.discount,
      colorClass: "text-rose-700",
      show: hasPositiveNumber(discount),
      render: () => formatMoney(discount, settings.langCode),
    },
    {
      key: "paid",
      header: txt.paidAmount,
      colorClass: "text-emerald-700",
      show: hasPrintableBillValue(paid),
      render: () => formatMoney(paid, settings.langCode),
    },
    {
      key: "remaining",
      header: txt.remaining,
      colorClass: remaining > 0 ? "text-amber-700" : "text-emerald-700",
      show: true,
      final: true,
      render: () =>
        remaining > 0 ? formatMoney(remaining, settings.langCode) : txt.paidInFull,
    },
  ].filter((column) => column.show);

  return (
    <div
      lang={settings.htmlLang}
      dir={settings.dir}
      className="print-a6-sheet print-bill-sheet print-customer-bill overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md"
      style={billTypographyStyle}
    >
      <PrintBillHeader
        settings={settings}
        title={safeTxt("customerBill")}
        date={date}
        time={time}
        shop={shop}
      />

      {isEmergency && (
        <div
          className={`border-b border-slate-800 bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700 ${alignClass}`}
        >
          {t("createOrder.emergencyOrder")}
        </div>
      )}

      <div className="print-customer-combined-wrap print-bill-table-wrap">
        <table className="print-customer-combined-table print-reference-detail-table w-full border-collapse table-fixed text-[9px] text-slate-800">
          <thead>
            <tr>
              {detailColumns.map((column, index) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={`${getBorderClass(index, detailColumns)} px-1.5 py-1 ${tableHeadClass} ${column.align}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {detailColumns.map((column, index) => (
                <td
                  key={column.key}
                  className={`${getBorderClass(index, detailColumns)} px-1.5 py-1 align-top ${column.align} ${column.className || ""}`}
                >
                  {column.render()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {rakhtInfoFields.length > 0 ? (
        <div className="print-customer-rakht-section border-b border-slate-800">
          <div
            className={`${
              settings.isRtl
                ? "print-bill-section-head"
                : "print-bill-section-head print-bill-section-head--upper"
            } ${alignClass}`}
          >
            {t("createOrder.rakhtSelection", {
              defaultValue: "Rakht / Fabric",
            })}
          </div>
          <div
            className="print-customer-rakht-grid grid text-[9px] text-slate-800"
            style={{
              gridTemplateColumns: `repeat(${rakhtInfoFields.length}, minmax(0, 1fr))`,
            }}
          >
            {rakhtInfoFields.map((field, index) => (
              <div
                key={field.key}
                className={`${getBorderClass(index, rakhtInfoFields)} px-2 py-1.5 ${alignClass}`}
              >
                <p className={tableHeadClass}>{field.label}</p>
                <p
                  className={`print-bill-kv-value mt-0.5 ${
                    field.className || ""
                  }`}
                >
                  {field.render()}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`print-bill-section-head ${alignClass}`}>
        {txt.financialSummary}
      </div>
      <table className="print-customer-finance-table print-bill-closing-table w-full border-collapse table-fixed text-[9px] text-slate-800">
        <thead>
          <tr>
            {financeColumns.map((column, index) => (
              <th
                key={column.key}
                className={`${getBorderClass(index, financeColumns)} px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white">
            {financeColumns.map((column, index) => (
              <td
                key={column.key}
                className={`${getBorderClass(index, financeColumns)} px-2 py-3 text-center text-[11px] font-black ${column.colorClass} [direction:ltr] [unicode-bidi:embed]`}
              >
                <span
                  className={`print-customer-amount ${
                    column.final ? "print-customer-amount--final" : ""
                  }`}
                >
                  {column.render()}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
export function CustomerCombinedBill({ customer, orders = [], shop }) {
  const { i18n, t } = useTranslation();
  const settings = getBillLanguageSettings(
    i18n.resolvedLanguage || i18n.language,
  );
  let txt = settings.text;
  let extraTxt = BILL_EXTRA_TEXT[settings.langCode] || BILL_EXTRA_TEXT.en;
  const safeTxt = (key) => getPrintableText(txt[key], settings, key);
  const safeExtraTxt = (key) =>
    getPrintableText(extraTxt[key], settings, key);
  const timestamp =
    orders?.[0]?.createdAt ||
    customer?.updatedAt ||
    customer?.createdAt ||
    Date.now();
  const { date, time } = getPrintDateTime(settings, timestamp);
  const safeOrders = Array.isArray(orders) ? orders : [];
  const billNo = hasPrintableBillValue(customer?.billNumber)
    ? toEnglishDigits(customer.billNumber)
    : "";
  const customerName = getCustomerDisplayName(customer);
  const customerPhone = hasPrintableBillValue(customer?.phoneNumber)
    ? toEnglishDigits(customer.phoneNumber)
    : "";
  const typeIndex = {};
  const typeCountTotals = safeOrders.reduce((acc, order) => {
    const typeKey = order?.type || "ITEM";
    acc[typeKey] = (acc[typeKey] || 0) + 1;
    return acc;
  }, {});

  const rowItems = safeOrders.map((order, index) => {
    const typeKey = order?.type || "ITEM";
    typeIndex[typeKey] = (typeIndex[typeKey] || 0) + 1;
    const { typeWithSequenceLabel } = getOrderLabelParts(
      order,
      settings.langCode,
      {
        totalByType: typeCountTotals[typeKey],
        sequenceByType: typeIndex[typeKey],
      },
    );
    const grossTotal = getOrderGrossTotal(order);
    return {
      order,
      index,
      typeKey,
      itemLabel: typeWithSequenceLabel,
      customerNameLabel: customerName,
      qty: Number(order?.quantity || 1),
      amount: grossTotal,
      boxName:
        order?.box?.boxName ||
        order?.foreignBox?.boxName ||
        "",
      rakhtDetails: getRakhtDetails(order),
    };
  });

  const totals = safeOrders.reduce(
    (acc, item) => {
      acc.grossTotal += getOrderGrossTotal(item);
      acc.netTotal += getOrderNetTotal(item);
      acc.discount += Number(item?.discount || 0);
      acc.paid += Number(item?.paidAmount || 0);
      return acc;
    },
    { grossTotal: 0, netTotal: 0, discount: 0, paid: 0 },
  );
  const remaining = Math.max(0, totals.netTotal - totals.paid);
  const billIsEmergency = safeOrders.some((order) => order?.isEmergency);
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const tableHeadClass = settings.isRtl
    ? "print-bill-th"
    : "print-bill-th print-bill-th--upper";
  const billTypographyStyle = {
    fontFamily: settings.fontFamily,
    ...(settings.isRtl
      ? {
          textAlign: "right",
          letterSpacing: "0",
          wordSpacing: "0",
          fontFeatureSettings: '"rlig" 1, "liga" 1, "calt" 1',
        }
      : {}),
  };
  const rakhtInfoRows = rowItems
    .filter((row) => row.rakhtDetails?.hasData)
    .map((row) => {
      const details = row.rakhtDetails;
      const fields = [
        {
          key: "color",
          label: t("rakht.color", { defaultValue: "Color" }),
          value: details.color,
          show: hasPrintableBillValue(details.color),
          render: () => renderRakhtColorValue(details.color, details.colorHex),
        },
        {
          key: "brand",
          label: t("rakht.brandName", { defaultValue: "Brand" }),
          value: details.brand,
          show: hasPrintableBillValue(details.brand),
          render: () => details.brand,
        },
        {
          key: "company",
          label: t("rakht.companyName", { defaultValue: "Company" }),
          value: details.company,
          show: hasPrintableBillValue(details.company),
          render: () => details.company,
        },
        {
          key: "meters",
          label: t("rakht.requiredMeters", { defaultValue: "Meters" }),
          value: details.meters,
          show: hasPrintableBillValue(details.meters),
          className: "[direction:ltr] [unicode-bidi:embed]",
          render: () => details.meters,
        },
      ].filter((field) => field.show);

      return {
        key: row.order?.id || `${row.typeKey}-${row.index}`,
        itemLabel: row.itemLabel,
        fields,
      };
    })
    .filter((row) => row.fields.length > 0);
  const detailColumns = [
    {
      key: "billNo",
      header: safeTxt("billNo"),
      width: "10%",
      align: alignClass,
      show: hasPrintableBillValue(billNo),
      render: () => (
        <span className="print-bill-number [direction:ltr] [unicode-bidi:embed]">
          #{billNo}
        </span>
      ),
    },
    {
      key: "customerName",
      header: safeTxt("customerName"),
      width: "14%",
      align: alignClass,
      show: rowItems.some((row) => hasPrintableBillValue(row.customerNameLabel)),
      className: "font-semibold",
      render: (row) => <div>{row.customerNameLabel}</div>,
    },
    {
      key: "phone",
      header: safeTxt("phone"),
      width: "17%",
      align: "[direction:ltr]",
      show: hasPrintableBillValue(customerPhone),
      className: "font-semibold [direction:ltr] [unicode-bidi:embed]",
      render: () => customerPhone,
    },
    {
      key: "orderType",
      header: t("orders.orderType"),
      width: "14%",
      align: alignClass,
      show: rowItems.some((row) => hasPrintableBillValue(row.itemLabel)),
      className: "font-semibold",
      render: (row) => row.itemLabel,
    },
    {
      key: "qty",
      header: safeTxt("qty"),
      width: "7%",
      align: "[direction:ltr]",
      show: rowItems.some((row) => hasPrintableBillValue(row.qty)),
      className: "text-center font-bold [direction:ltr] [unicode-bidi:embed]",
      render: (row) => formatNumber(row.qty),
    },
    {
      key: "box",
      header: safeExtraTxt("box"),
      width: "11%",
      align: alignClass,
      show: rowItems.some((row) => hasPrintableBillValue(row.boxName)),
      render: (row) => row.boxName,
    },
    {
      key: "itemPrice",
      header: safeExtraTxt("itemPrice"),
      width: "16%",
      align: "[direction:ltr]",
      show: rowItems.some((row) => hasPrintableBillValue(row.amount)),
      className:
        "text-center font-black text-slate-900 [direction:ltr] [unicode-bidi:embed]",
      render: (row) => formatMoney(row.amount, settings.langCode),
    },
  ].filter((column) => column.show);
  const financeColumns = [
    {
      key: "total",
      header: safeExtraTxt("totalAllClothes"),
      colorClass: "text-blue-900",
      show: true,
      render: () => formatMoney(totals.grossTotal, settings.langCode),
    },
    {
      key: "discount",
      header: safeExtraTxt("totalDiscountAllClothes"),
      colorClass: "text-rose-800",
      show: hasPositiveNumber(totals.discount),
      render: () => formatMoney(totals.discount, settings.langCode),
    },
    {
      key: "paid",
      header: safeExtraTxt("totalPaidAllClothes"),
      colorClass: "text-emerald-800",
      show: hasPrintableBillValue(totals.paid),
      render: () => formatMoney(totals.paid, settings.langCode),
    },
    {
      key: "remaining",
      header: safeExtraTxt("totalRemainingAllClothes"),
      colorClass: remaining > 0 ? "text-amber-800" : "text-emerald-800",
      show: true,
      final: true,
      render: () =>
        remaining > 0
          ? formatMoney(remaining, settings.langCode)
          : safeTxt("paidInFull"),
    },
  ].filter((column) => column.show);

  return (
    <div
      lang={settings.htmlLang}
      dir={settings.dir}
      className="print-a6-sheet print-bill-sheet print-customer-bill print-customer-bill--combined overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md"
      style={billTypographyStyle}
    >
      <PrintBillHeader
        settings={settings}
        title={safeTxt("customerBill")}
        date={date}
        time={time}
        shop={shop}
      />

      {billIsEmergency ? (
        <div
          className={`border-b border-slate-800 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 ${alignClass}`}
        >
          {t("createOrder.emergencyOrder")}
        </div>
      ) : null}

      <div className="print-customer-combined-wrap print-bill-table-wrap">
        <table className="print-customer-combined-table print-reference-detail-table w-full border-collapse table-fixed text-[9px] text-slate-800">
          <thead>
            <tr>
              {detailColumns.map((column, index) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={`${getBorderClass(index, detailColumns)} px-1.5 py-1 ${tableHeadClass} ${column.align}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowItems.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(detailColumns.length, 1)}
                  className={`border-b border-slate-800 px-2 py-2 text-[10px] ${alignClass}`}
                >
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              rowItems.map((row) => (
                <tr key={row.order?.id || `${row.order?.type}-${row.index}`}>
                  {detailColumns.map((column, index) => (
                    <td
                      key={column.key}
                      className={`${getBorderClass(index, detailColumns)} px-1.5 py-1 align-top ${column.align} ${column.className || ""}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rakhtInfoRows.length > 0 ? (
        <div className="print-customer-rakht-section border-b border-slate-800">
          <div
            className={`${
              settings.isRtl
                ? "print-bill-section-head"
                : "print-bill-section-head print-bill-section-head--upper"
            } ${alignClass}`}
          >
            {t("createOrder.rakhtSelection", {
              defaultValue: "Rakht / Fabric",
            })}
          </div>
          <div className="print-customer-rakht-stack">
            {rakhtInfoRows.map((row) => (
              <div key={row.key} className="print-customer-rakht-row">
                {rakhtInfoRows.length > 1 ? (
                  <div
                    className={`border-b border-slate-800 bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-800 ${alignClass}`}
                  >
                    {row.itemLabel}
                  </div>
                ) : null}
                <div
                  className="print-customer-rakht-grid grid text-[9px] text-slate-800"
                  style={{
                    gridTemplateColumns: `repeat(${row.fields.length}, minmax(0, 1fr))`,
                  }}
                >
                  {row.fields.map((field, index) => (
                    <div
                      key={field.key}
                      className={`${getBorderClass(index, row.fields, false)} px-2 py-1.5 ${alignClass}`}
                    >
                      <p className={tableHeadClass}>{field.label}</p>
                      <p
                        className={`print-bill-kv-value mt-0.5 ${
                          field.className || ""
                        }`}
                      >
                        {field.render()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`print-bill-section-head ${alignClass}`}>
        {safeTxt("financialSummary")}
      </div>
      <table className="print-customer-finance-table print-bill-closing-table w-full border-collapse table-fixed text-[10px] text-slate-800">
        <thead>
          <tr>
            {financeColumns.map((column, index) => (
              <th
                key={column.key}
                className={`${getBorderClass(index, financeColumns)} px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white">
            {financeColumns.map((column, index) => (
              <td
                key={column.key}
                className={`${getBorderClass(index, financeColumns, false)} px-2 py-2 text-center font-black ${column.colorClass} [direction:ltr] [unicode-bidi:embed]`}
              >
                <span
                  className={`print-customer-amount ${
                    column.final ? "print-customer-amount--final" : ""
                  }`}
                >
                  {column.render()}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
function getMeasurementStepRows(entries, fieldDefinitions, labelResolver) {
  const map = new Map(entries.map((entry) => [entry[0], entry]));

  return fieldDefinitions.reduce((rows, [key, labelKey]) => {
    const item = map.get(key);
    if (item) rows.push([labelResolver(labelKey), item[1]]);
    return rows;
  }, []);
}

function getLabeledRemainingRows(entries, usedKeys, t) {
  return entries.reduce((rows, [key, value]) => {
    if (usedKeys.has(key)) return rows;
    const styleLabel = t(`createOrder.styleFields.${key}`, {
      defaultValue: "",
    });
    const fieldLabel = t(`createOrder.fields.${key}`, {
      defaultValue: "",
    });
    const label = styleLabel || fieldLabel;
    if (label) rows.push([label, value]);
    return rows;
  }, []);
}

function renderRakhtColorValue(colorName, colorHex) {
  const swatchHex = resolveRakhtColorHex(colorName, colorHex);
  const safeColorName = hasPrintableBillValue(colorName)
    ? String(colorName).trim()
    : "";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {swatchHex ? (
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "1px solid rgba(15,23,42,0.18)",
            background: swatchHex,
            flexShrink: 0,
          }}
        />
      ) : null}
      {safeColorName ? <span>{safeColorName}</span> : null}
    </span>
  );
}

function FullWidthBillNote({ label, text, alignClass, className = "" }) {
  if (!hasPrintableBillValue(text)) return null;

  return (
    <div
      className={`print-tailor-ledger-note-standalone border-b border-slate-800 ${alignClass} ${className}`.trim()}
    >
      <div className="print-tailor-ledger-note-box">
        {hasPrintableBillValue(label) ? (
          <div className="print-tailor-ledger-note-label">{label}</div>
        ) : null}
        <div className="print-tailor-ledger-note-text">{text}</div>
      </div>
    </div>
  );
}

export function TailorBill({ customer, order, measurements, itemLabel, shop }) {
  const { i18n, t } = useTranslation();
  const settings = getBillLanguageSettings(
    i18n.resolvedLanguage || i18n.language,
  );
  let txt = settings.text;
  let extraTxt = BILL_EXTRA_TEXT[settings.langCode] || BILL_EXTRA_TEXT.en;
  const safeTxt = (key) => getPrintableText(txt[key], settings, key);
  const safeExtraTxt = (key) =>
    getPrintableText(extraTxt[key], settings, key);
  const dateValue = order?.createdAt || Date.now();
  const { date, time } = getPrintDateTime(settings, dateValue);
  const orderLabelParts = getOrderLabelParts(order, settings.langCode);
  const orderTypeLabel = orderLabelParts.typeWithSequenceLabel;
  const customerNameLabel = getCustomerDisplayName(customer);
  const orderBoxName = order?.box?.boxName || order?.foreignBox?.boxName || "";
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const tableHeadClass = settings.isRtl
    ? "print-bill-th"
    : "print-bill-th print-bill-th--upper";
  const orderType = order?.type;
  const isReadyMadeClothes =
    orderType === "READY_MADE" || orderType === "READY_MADE_CLOTHES";
  const additionalStyleInfoIsFullWidth =
    orderType === "OUTFIT" || isReadyMadeClothes;

  const allEntries = Object.entries(measurements || {}).filter(
    ([key, value]) => !SKIP_FIELDS.has(key) && hasBillFieldValue(value),
  );

  const designNoteEntry = allEntries.find(
    ([key, value]) =>
      additionalStyleInfoIsFullWidth &&
      key === "additionalStyleInfo" &&
      hasPrintableBillValue(value),
  );
  const designNoteText = designNoteEntry
    ? toEnglishDigits(String(designNoteEntry[1]).trim())
    : "";
  const designNoteLabel = isReadyMadeClothes
    ? t("createOrder.fields.additionalStyleInfo")
    : t("createOrder.additionalNotes");
  const kortyDesignEntry = allEntries.find(
    ([key, value]) =>
      orderType === "KORTY" && key === "style" && hasPrintableBillValue(value),
  );
  const kortyDesignText = kortyDesignEntry
    ? normalizeShopPrintStyleValue(toEnglishDigits(String(kortyDesignEntry[1])))
    : "";
  const kortyDesignLabel = getStyleFieldLabel(t, "style");
  const hiddenFullWidthKeys = new Set([
    ...(additionalStyleInfoIsFullWidth ? ["additionalStyleInfo"] : []),
    ...(orderType === "KORTY" ? ["style"] : []),
  ]);
  const visibleEntries = allEntries.filter(
    ([key]) => !hiddenFullWidthKeys.has(key),
  );

  const measurementFieldDefinitions = MEASUREMENT_FIELDS[orderType] || [];
  const styleFieldDefinitions = STYLE_FIELDS[orderType] || [];
  const pocketFieldDefinitions = POCKET_FIELDS[orderType] || [];
  const measurementFieldKeys = new Set(
    measurementFieldDefinitions.map(([key]) => key),
  );
  const styleFieldKeys = new Set([
    ...styleFieldDefinitions.map(([key]) => key),
    ...pocketFieldDefinitions.map(([key]) => key),
    ...hiddenFullWidthKeys,
  ]);

  const measRows = [
    ...getMeasurementStepRows(
      visibleEntries,
      measurementFieldDefinitions,
      (labelKey) => getMeasurementFieldLabel(t, labelKey),
    ),
    ...getLabeledRemainingRows(
      visibleEntries.filter(([, value]) => typeof value !== "boolean"),
      new Set([...measurementFieldKeys, ...styleFieldKeys]),
      t,
    ),
  ]
    .map(([label, value]) => [label, formatMeasurementValue(value)])
    .filter(
      ([label, value]) =>
        hasPrintableBillValue(label) && hasPrintableBillValue(value),
    );

  const styleRows = [
    ...getMeasurementStepRows(
      visibleEntries,
      styleFieldDefinitions,
      (labelKey) => getStyleFieldLabel(t, labelKey),
    ),
    ...getMeasurementStepRows(
      visibleEntries,
      pocketFieldDefinitions,
      (labelKey) => getMeasurementFieldLabel(t, labelKey),
    ),
    ...getLabeledRemainingRows(
      visibleEntries.filter(([, value]) => typeof value === "boolean"),
      new Set([...measurementFieldKeys, ...styleFieldKeys]),
      t,
    ),
  ]
    .map(([label, value]) => [
      label,
      typeof value === "boolean"
        ? safeTxt("yes")
        : normalizeShopPrintStyleValue(toEnglishDigits(String(value))),
    ])
    .filter(
      ([label, value]) =>
        hasPrintableBillValue(label) && hasPrintableBillValue(value),
    );

  const hasMeasurementRows = measRows.length > 0;
  const hasStyleRows = styleRows.length > 0;
  const hasDetailRows = hasMeasurementRows || hasStyleRows;
  const hasFullWidthNotes =
    hasPrintableBillValue(designNoteText) ||
    hasPrintableBillValue(kortyDesignText);
  const showLedgerSection = hasDetailRows || hasFullWidthNotes;
  const rakhtDetails = getRakhtDetails(order);
  const rakhtFields = [
    {
      key: "color",
      label: t("rakht.color", { defaultValue: "Color" }),
      value: rakhtDetails.color,
      show: hasPrintableBillValue(rakhtDetails.color),
      render: () => (
        <p className="mt-0.5 flex items-center gap-1 font-bold text-slate-900">
          {renderRakhtColorValue(rakhtDetails.color, rakhtDetails.colorHex)}
        </p>
      ),
    },
    {
      key: "brand",
      label: t("rakht.brandName", { defaultValue: "Brand" }),
      value: rakhtDetails.brand,
      show: hasPrintableBillValue(rakhtDetails.brand),
      render: () => (
        <p className="print-bill-kv-value mt-0.5">{rakhtDetails.brand}</p>
      ),
    },
    {
      key: "company",
      label: t("rakht.companyName", { defaultValue: "Company" }),
      value: rakhtDetails.company,
      show: hasPrintableBillValue(rakhtDetails.company),
      render: () => (
        <p className="print-bill-kv-value mt-0.5">{rakhtDetails.company}</p>
      ),
    },
    {
      key: "meters",
      label: t("rakht.requiredMeters", { defaultValue: "Meters" }),
      value: rakhtDetails.meters,
      show: hasPrintableBillValue(rakhtDetails.meters),
      render: () => (
        <p className="print-bill-kv-value mt-0.5 [direction:ltr] [unicode-bidi:embed]">
          {rakhtDetails.meters}
        </p>
      ),
    },
  ].filter((field) => field.show);

  const sectionHeadClass = settings.isRtl
    ? "print-bill-section-head"
    : "print-bill-section-head print-bill-section-head--upper";
  const billTypographyStyle = {
    fontFamily: settings.fontFamily,
    ...(settings.isRtl
      ? {
          textAlign: "right",
          letterSpacing: "0",
          wordSpacing: "0",
          fontFeatureSettings: '"rlig" 1, "liga" 1, "calt" 1',
        }
      : {}),
  };
  const tailorInfoItems = [
    {
      key: "billNo",
      label: safeTxt("billNo"),
      value: hasPrintableBillValue(customer?.billNumber)
        ? `#${toEnglishDigits(customer.billNumber)}`
        : "",
      valueClass: "print-bill-number mt-0.5 [direction:ltr] [unicode-bidi:embed]",
    },
    {
      key: "name",
      label: safeTxt("name"),
      value: customerNameLabel,
      valueClass: "print-bill-kv-value mt-0.5",
    },
    {
      key: "orderType",
      label: t("orders.orderType"),
      value: orderTypeLabel,
      valueClass: "print-bill-kv-value mt-0.5",
    },
    {
      key: "box",
      label: safeExtraTxt("box"),
      value: orderBoxName,
      valueClass: "print-bill-kv-value mt-0.5",
    },
    {
      key: "qty",
      label: safeTxt("qty"),
      value: formatNumber(order?.quantity || 1),
      valueClass:
        "print-bill-kv-value print-bill-kv-value--qty mt-0.5 [direction:ltr] [unicode-bidi:embed]",
    },
  ].filter((item) => hasPrintableBillValue(item.label) && hasPrintableBillValue(item.value));

  return (
    <div
      lang={settings.htmlLang}
      dir={settings.dir}
      className="print-a6-sheet print-bill-sheet print-shop-bill overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md"
      style={billTypographyStyle}
    >
      <PrintBillHeader
        settings={settings}
        title={safeTxt("tailorCopy")}
        date={date}
        time={time}
        shop={shop}
      />

      {order?.isEmergency && (
        <div
          className={`border-b border-slate-800 bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700 ${alignClass}`}
        >
          {t("createOrder.emergencyOrder")}
        </div>
      )}

      {tailorInfoItems.length > 0 ? (
        <div
          className="print-tailor-info-strip print-bill-kv-strip grid text-[9px] text-slate-800"
          style={{
            gridTemplateColumns: `repeat(${tailorInfoItems.length}, minmax(0, 1fr))`,
          }}
        >
          {tailorInfoItems.map((item, index) => (
            <div
              key={item.key}
              className={`print-bill-kv-cell ${getBorderClass(index, tailorInfoItems)} px-2 py-1.5 ${alignClass}`}
            >
              <p className={tableHeadClass}>{item.label}</p>
              <p className={item.valueClass}>{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {showLedgerSection ? (
        <div
          className={`print-tailor-ledger-wrap print-bill-table-wrap ${
            orderType === "READY_MADE" && !rakhtDetails.hasData
              ? "print-bill-closing-section"
              : ""
          }`}
        >
          {hasDetailRows ? (
            <div
              className={`print-tailor-detail-grid ${
                hasMeasurementRows && hasStyleRows
                  ? "print-tailor-detail-grid--split"
                  : ""
              }`}
            >
              {hasMeasurementRows ? (
                <table className="print-tailor-ledger-table w-full border-collapse table-fixed text-slate-800">
                  <colgroup>
                    <col style={{ width: "68%" }} />
                    <col style={{ width: "32%" }} />
                  </colgroup>
                  <thead>
                    <tr className="print-tailor-ledger-headrow">
                      <th
                        className={`print-tailor-ledger-headcell ${alignClass}`}
                      >
                        {t("createOrder.measurements")}
                      </th>
                      <th className="print-tailor-ledger-headcell text-center">
                        {safeTxt("value")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {measRows.map(([label, value]) => (
                      <tr key={label} className="print-tailor-ledger-row">
                        <td
                          className={`print-tailor-ledger-cell print-tailor-ledger-cell--label ${alignClass}`}
                        >
                          <span className="print-tailor-ledger-text">
                            {label}
                          </span>
                        </td>
                        <td className="print-tailor-ledger-cell print-tailor-ledger-cell--measure text-center [direction:ltr] [unicode-bidi:embed]">
                          <span className="print-tailor-ledger-text">
                            {value}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {hasStyleRows ? (
                <table className="print-tailor-ledger-table w-full border-collapse table-fixed text-slate-800">
                  <colgroup>
                    <col style={{ width: "58%" }} />
                    <col style={{ width: "42%" }} />
                  </colgroup>
                  <thead>
                    <tr className="print-tailor-ledger-headrow">
                      <th
                        className={`print-tailor-ledger-headcell ${alignClass}`}
                      >
                        {t("createOrder.styleOptions")}
                      </th>
                      <th
                        className={`print-tailor-ledger-headcell ${alignClass}`}
                      >
                        {safeTxt("value")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {styleRows.map(([label, value]) => (
                      <tr key={label} className="print-tailor-ledger-row">
                        <td
                          className={`print-tailor-ledger-cell print-tailor-ledger-cell--label ${alignClass}`}
                        >
                          <span className="print-tailor-ledger-text">
                            {label}
                          </span>
                        </td>
                        <td
                          className={`print-tailor-ledger-cell print-tailor-ledger-cell--value ${alignClass}`}
                        >
                          <span className="print-tailor-ledger-text">
                            {value}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          ) : null}

          <FullWidthBillNote
            label={kortyDesignLabel}
            text={kortyDesignText}
            alignClass={alignClass}
          />
          <FullWidthBillNote
            label={designNoteLabel}
            text={designNoteText}
            alignClass={alignClass}
            className={isReadyMadeClothes ? "print-ready-made-design-note" : ""}
          />
        </div>
      ) : null}

      {/* Rakht (Fabric) section */}
      {orderType !== "READY_MADE" && rakhtFields.length > 0 && (
        <div className="print-tailor-fabric-section print-bill-closing-section border-t border-slate-800">
          <div className={`${sectionHeadClass} ${alignClass}`}>
            {t("createOrder.rakhtSelection", {
              defaultValue: "Rakht / Fabric",
            })}
          </div>
          <div
            className="print-tailor-fabric-grid text-[10px]"
            style={{
              gridTemplateColumns: `repeat(${rakhtFields.length}, minmax(0, 1fr))`,
            }}
          >
            {rakhtFields.map((field, index) => (
              <div
                key={field.key}
                className={`print-bill-kv-cell ${getBorderClass(index, rakhtFields)} px-2 py-1.5 ${alignClass}`}
              >
                <p className="print-bill-th print-bill-th--upper text-[8px] text-slate-500">
                  {field.label}
                </p>
                {field.render()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export function printElement(id, options = {}) {
  const element = document.getElementById(id);
  if (!element) return false;

  const printWindow = window.open("", "_blank", "width=800,height=1000");
  if (!printWindow) return false;

  const dir =
    options.dir ||
    element.getAttribute("dir") ||
    document.documentElement.getAttribute("dir") ||
    "ltr";

  const lang =
    options.lang ||
    element.getAttribute("lang") ||
    document.documentElement.getAttribute("lang") ||
    "en";

  const title = options.title || "Order Document";
  const includeWrapper = options.includeWrapper !== false;
  const printMarkup = includeWrapper ? element.outerHTML : element.innerHTML;
  const isRtl = dir === "rtl";
  const bodyFont = isRtl
    ? "'Noto Naskh Arabic','Noto Sans Arabic','Inter',sans-serif"
    : "'Inter','Noto Sans Arabic',sans-serif";

  // Serialize accessible stylesheets so print styles still work if popup CSS links fail in production.
  const serializedCss = Array.from(document.styleSheets || [])
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || [])
          .filter((rule) => !rule.cssText?.trimStart().startsWith("@page"))
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("\n");

  const stylesheetLinks = Array.from(
    document.querySelectorAll("link[rel='stylesheet']"),
  )
    .map((link) => {
      const href = link.href;
      if (!href) return "";
      const media = link.media ? ` media=\"${link.media}\"` : "";
      const crossOrigin = link.crossOrigin
        ? ` crossorigin=\"${link.crossOrigin}\"`
        : "";
      return `<link rel=\"stylesheet\" href=\"${href}\"${media}${crossOrigin}>`;
    })
    .filter(Boolean)
    .join("\n");

  const inlineStyleNodes = Array.from(document.querySelectorAll("style"))
    .map((node) => node.outerHTML)
    .join("\n");

  const baseHref = options.baseHref || `${window.location.origin}/`;

  printWindow.document.write(`
    <html lang="${lang}" dir="${dir}">
      <head>
        <meta charset="UTF-8" />
        <base href="${baseHref}" />
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
        ${stylesheetLinks}
        ${inlineStyleNodes}
        <style>${serializedCss}</style>
        <style>
          *{box-sizing:border-box}
          @page{size:A6 portrait;margin:0}
          html{width:105mm;height:148mm;margin:0}
          body{
            margin:0;
            font-family:${bodyFont};
            line-height:1.4;
            background:#fff;
            width:105mm;
            height:148mm;
            min-height:148mm;
            max-height:148mm;
            padding:1.5mm;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#1e293b;
            direction:${dir};
            text-align:${isRtl ? "right" : "left"};
            -webkit-print-color-adjust:exact;
            print-color-adjust:exact;
            text-rendering:optimizeLegibility;
            overflow:hidden;
            box-sizing:border-box;
          }
          .print-a6-sheet,.print-bill-sheet{
            --bill-primary:#D97706;
            --bill-primary-dark:#B45309;
            --bill-primary-darker:#92400E;
            --bill-primary-light:#FFF7ED;
            --bill-primary-muted:#FFEDD5;
            --bill-border:#E2E8F0;
            --bill-border-strong:#CBD5E1;
            --bill-text:#1E293B;
            --bill-table-head:#FFFBEB;
            --bill-surface:#FFFFFF;
            --bill-surface-alt:#F8FAFC;
            width:100%;
            max-width:102mm;
            margin:0 auto;
            flex-shrink:0;
            box-sizing:border-box;
            transform:scale(var(--print-a6-scale,1));
            transform-origin:center center;
            page-break-inside:avoid;
            break-inside:avoid;
          }
          .print-bill-header{
            background:linear-gradient(180deg,#FFF7ED 0%,#fff 72%) !important;
            border-bottom:2px solid #D97706 !important;
            padding:6px 8px !important;
          }
          .print-bill-header::before{
            content:"";
            position:absolute;
            top:0;
            left:0;
            right:0;
            height:3px;
            background:linear-gradient(90deg,#B45309,#D97706,#B45309);
          }
          .print-bill-header-name{color:#92400E !important}
          .print-bill-header-badge{background:#D97706 !important;color:#fff !important}
          .print-bill-section-head{
            background:#FFF7ED !important;
            color:#92400E !important;
            border-color:#FFEDD5 !important;
          }
          .print-a6-sheet .border-slate-800{border-color:#CBD5E1 !important}
          .print-bill-header .print-shop-meta{line-height:1.3}
          .print-a6-sheet table th,.print-a6-sheet table td{vertical-align:top}
          .print-tailor-detail-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:0}
          .print-tailor-detail-grid--split{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
          .print-tailor-detail-grid--split .print-tailor-ledger-table:first-child{border-inline-end:1px solid #CBD5E1!important}
          .print-tailor-ledger-cell{vertical-align:top}
          .print-tailor-ledger-text{display:block;max-width:100%;overflow:visible;white-space:normal;overflow-wrap:anywhere;word-break:break-word;text-overflow:clip}
          .print-tailor-ledger-headcell--style,.print-tailor-ledger-cell--style-label{border-inline-start:2px solid #CBD5E1}
          .print-tailor-ledger-note-row{height:auto}
          .print-tailor-ledger-note-cell{padding:0!important;border-inline-end:0!important;vertical-align:top}
          .print-tailor-ledger-note-standalone{overflow:hidden;border-inline-start:1px solid #CBD5E1;border-inline-end:1px solid #CBD5E1;border-bottom:1px solid #CBD5E1}
          .print-tailor-ledger-note-standalone:last-child{border-bottom:0}
          .print-tailor-ledger-note-box{min-height:28px;padding:3px 4px;background:#f8fafc}
          .print-ready-made-design-note .print-tailor-ledger-note-box{min-height:36px;padding:5px 6px}
          .print-tailor-ledger-note-label{margin-bottom:2px;font-size:7px;font-weight:800;line-height:1.25;color:#64748b}
          .print-tailor-ledger-note-text{display:block;max-width:100%;font-size:8px;font-weight:700;line-height:1.3;color:#1e293b;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
          .print-ready-made-design-note .print-tailor-ledger-note-text{font-size:8.7px;line-height:1.4}
          .print-bill-table-wrap,.print-customer-combined-wrap,.print-tailor-ledger-wrap{
            overflow:hidden !important;
            overflow-x:hidden !important;
            overflow-y:hidden !important;
            max-width:100%;
            scrollbar-width:none !important;
            -ms-overflow-style:none !important;
            padding-bottom:0 !important;
          }
          .print-bill-table-wrap::-webkit-scrollbar,
          .print-customer-combined-wrap::-webkit-scrollbar,
          .print-tailor-ledger-wrap::-webkit-scrollbar{display:none;width:0!important;height:0!important}
          .print-bill-number{display:inline-block;font-size:9.5px;font-weight:800;color:#92400E;letter-spacing:.02em}
          .print-bill-th{font-size:8px;font-weight:800;color:#64748B;line-height:1.25}
          .print-bill-th--upper{text-transform:uppercase;letter-spacing:.05em}
          .print-bill-kv-strip{background:linear-gradient(180deg,#FFFBEB 0%,#fff 100%)}
          .print-bill-kv-value{font-weight:700;color:#1e293b;line-height:1.3}
          .print-bill-kv-value--qty{color:#92400E;font-weight:800}
          .print-tailor-fabric-grid{display:grid}
          .print-bill-closing-table tbody tr:last-child td,.print-bill-closing-section .print-tailor-fabric-grid > div:last-child{border-bottom:0!important}
          .print-customer-combined-table th,.print-customer-combined-table td{max-width:100%;overflow-wrap:anywhere;word-break:break-word}
          .print-customer-finance-table thead,.print-customer-finance-table th{background:#FFFBEB;color:#1e293b}
          .print-reference-detail-table thead,.print-reference-detail-table th{background:#FFFBEB !important}
          .print-customer-amount{display:inline-flex;align-items:center;justify-content:center;max-width:100%;min-width:0;padding:2px 5px;border-radius:4px;background:#f8fafc;box-shadow:inset 0 0 0 1px rgba(217,119,6,.12);line-height:1.35;white-space:normal;overflow-wrap:anywhere;word-break:break-word}
          .print-customer-amount--final{background:#FFF7ED;box-shadow:inset 0 0 0 1px rgba(217,119,6,.2)}
          .print-customer-combined-table{min-width:0!important;width:100%;background:#fff;font-size:7.4px}
          .print-customer-combined-table tbody tr:nth-child(even){background:#fafafa}
          .print-a6-sheet[dir="rtl"] .border-r{border-right-width:0;border-inline-end-width:1px}
          .print-a6-sheet[dir="rtl"] .border-r-2{border-right-width:0;border-inline-end-width:2px}
          .print-a6-sheet[dir="rtl"]{
            text-align:right;
            letter-spacing:normal;
            word-spacing:normal;
            font-feature-settings:"rlig" 1,"liga" 1,"calt" 1;
          }
          .print-a6-sheet[dir="rtl"] .print-bill-header-name,
          .print-a6-sheet[dir="rtl"] .print-bill-header-meta,
          .print-a6-sheet[dir="rtl"] .print-bill-section-head,
          .print-a6-sheet[dir="rtl"] .print-customer-combined-table th,
          .print-a6-sheet[dir="rtl"] .print-customer-combined-table td,
          .print-a6-sheet[dir="rtl"] .print-customer-finance-table th,
          .print-a6-sheet[dir="rtl"] .print-customer-finance-table td,
          .print-a6-sheet[dir="rtl"] .print-tailor-ledger-headcell,
          .print-a6-sheet[dir="rtl"] .print-tailor-ledger-cell,
          .print-a6-sheet[dir="rtl"] .print-tailor-ledger-note-text{
            direction:rtl;
            text-align:right;
          }
          .print-a6-sheet[dir="rtl"] .print-tailor-ledger-cell--measure,
          .print-a6-sheet[dir="rtl"] [dir="ltr"]{
            direction:ltr;
            unicode-bidi:embed;
          }
          .print-a6-sheet[dir="rtl"] .print-tailor-ledger-cell--measure{text-align:center}
          @media print{
            *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
            html,body{width:105mm;height:148mm;min-height:148mm;max-height:148mm}
            body{padding:1.5mm;margin:0;display:flex;align-items:center;justify-content:center}
            .print-a6-sheet,.print-bill-sheet{margin:0 auto;page-break-inside:avoid;break-inside:avoid}
            .print-a6-sheet *{page-break-inside:avoid;break-inside:avoid}
          }
        </style>
      </head>
      <body dir="${dir}">
        ${printMarkup}
      </body>
    </html>
  `);
  printWindow.document.close();

  const printNow = () => {
    try {
      const doc = printWindow.document;
      const sheet = doc.querySelector(".print-a6-sheet");
      if (sheet) {
        const probe = doc.createElement("div");
        probe.style.cssText =
          "position:absolute;visibility:hidden;pointer-events:none;width:102mm;height:145mm;inset:0";
        doc.body.appendChild(probe);
        const available = probe.getBoundingClientRect();
        probe.remove();

        const sheetRect = sheet.getBoundingClientRect();
        const heightScale =
          sheet.scrollHeight > 0 ? available.height / sheet.scrollHeight : 1;
        const widthScale =
          sheetRect.width > 0 ? available.width / sheetRect.width : 1;
        const nextScale = Math.min(1, Math.min(heightScale, widthScale));
        doc.documentElement.style.setProperty(
          "--print-a6-scale",
          String(nextScale),
        );
      }
    } catch {
      // Measurement is best-effort; static A6 CSS remains in place.
    }
    printWindow.print();
    printWindow.close();
  };

  const waitForStyles = () => {
    const links = Array.from(
      printWindow.document.querySelectorAll("link[rel='stylesheet']"),
    );
    if (!links.length) return Promise.resolve();

    return Promise.all(
      links.map(
        (link) =>
          new Promise((resolve) => {
            if (link.sheet) {
              resolve();
              return;
            }
            const done = () => {
              link.removeEventListener("load", done);
              link.removeEventListener("error", done);
              resolve();
            };
            link.addEventListener("load", done, { once: true });
            link.addEventListener("error", done, { once: true });
            setTimeout(done, 1600);
          }),
      ),
    );
  };

  const waitForImages = () => {
    const images = Array.from(printWindow.document.images || []);
    if (!images.length) return Promise.resolve();

    return Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            const done = () => {
              img.removeEventListener("load", done);
              img.removeEventListener("error", done);
              resolve();
            };
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 1200);
          }),
      ),
    );
  };

  const waitForFonts = () => {
    const fontsReady = printWindow.document.fonts?.ready;
    if (fontsReady && typeof fontsReady.then === "function") {
      return fontsReady.catch(() => undefined);
    }
    return Promise.resolve();
  };

  Promise.all([waitForStyles(), waitForFonts(), waitForImages()])
    .catch(() => undefined)
    .finally(() => setTimeout(printNow, 220));

  return true;
}

export function PrintSafeSheet({ id, children, className = "" }) {
  const baseClassName =
    "mx-auto w-full max-w-[560px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--sh-md)] dark:border-slate-700 dark:bg-slate-900 [&_.print-bill-table-wrap]:overflow-hidden print:max-w-[105mm] print:rounded-none print:border-slate-300 print:bg-white print:text-black print:shadow-none";

  return (
    <div
      id={id}
      data-print-safe="true"
      className={`${baseClassName} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export async function exportPdf(id, filename) {
  try {
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    const element = document.getElementById(id);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2.5,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a6",
    });
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
    pdf.save(filename);
  } catch (error) {
    toast.error(
      i18n.t("orders.pdfExportFailed", {
        defaultValue: "The PDF could not be created. Please try again.",
      }),
    );
  }
}

function DetailField({ label, value, Icon }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.06em] text-white/80">
          {label}
        </span>
        {Icon && <Icon size={15} className="text-sky-100" />}
      </div>
      <div className="flex min-h-[50px] items-center rounded-lg border border-white/25 bg-white/15 px-3.5 text-[15px] font-bold text-white">
        {value || "-"}
      </div>
    </div>
  );
}

export function OrderDocumentPack({ customer, order, previewId }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const shop = resolvePrintShop(customer?.tenant, order?.tenant, user?.tenant);
  const settings = getBillLanguageSettings(
    i18n.resolvedLanguage || i18n.language,
  );
  const measurements = getMeasurementsFromOrder(order);
  const customerId = `${previewId}-customer`;
  const tailorId = `${previewId}-tailor`;
  const orderTypeLabel = getOrderDisplayName(order, settings.langCode);
  const txt = settings.text;
  const isRtl = settings.isRtl;
  const headlineAlign = isRtl ? "text-right" : "text-left";
  const heroBillAlign = isRtl ? "text-left" : "text-right";
  const actionTextAlign = isRtl ? "text-right" : "text-left";

  return (
    <div className="grid gap-4">
      <div className="rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 text-white shadow-[0_20px_40px_rgba(15,23,42,.35)] dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className={headlineAlign}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-300/20 px-3 py-1 text-xs font-bold text-amber-100">
              {t("orders.professionalPrintPack")}
            </span>
            <h3 className="mt-2.5 text-2xl font-black leading-[1.15]">
              {t("orders.orderDocuments")}
            </h3>
            <p className="mt-2 max-w-[520px] text-sm text-white/85">
              {t("orders.printPackCopy")}
            </p>
          </div>
          <div className={heroBillAlign}>
            <div className="text-xs text-white/75">
              {t("orders.billNumber")}
            </div>
            <div className="text-[34px] font-black leading-none [direction:ltr] [unicode-bidi:embed]">
              #{toEnglishDigits(customer?.billNumber)}
            </div>
          </div>
        </div>

        <div className="mt-[18px] grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField
            label={t("common.phone", "Phone")}
            value={toEnglishDigits(customer?.phoneNumber)}
            Icon={LuPhone}
          />
          <DetailField
            label={t("orders.orderType")}
            value={orderTypeLabel}
            Icon={AfCurrencyIcon}
          />
          <DetailField
            label={t("common.status", "Status")}
            value={order?.isCompleted ? t("orders.done") : t("orders.pending")}
            Icon={LuFileText}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-[18px] dark:border-slate-700 dark:bg-slate-900">
          <div className={actionTextAlign}>
            <p className="text-[15px] font-bold text-gray-900 dark:text-slate-100">
              {txt.printBillForCustomer}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {txt.customerBillCopy}
            </p>
          </div>
          <div className="mt-[14px] grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <button
              type="button"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-md border-0 bg-amber-500 px-4 font-semibold text-white shadow-[0_8px_20px_rgba(180,120,24,.28)] transition duration-150 hover:-translate-y-[1px] hover:bg-amber-600"
              onClick={() =>
                printElement(customerId, {
                  dir: settings.dir,
                  lang: settings.htmlLang,
                  title: txt.orderDocumentTitle,
                })
              }
            >
              <LuPrinter size={16} />
              <span>{txt.printBillForCustomer}</span>
            </button>
            <button
              type="button"
              className="inline-flex min-h-[50px] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-[14px] font-semibold text-slate-700 transition duration-150 hover:-translate-y-[1px] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={() =>
                exportPdf(
                  customerId,
                  `bill-${customer?.billNumber}-${order?.id}-customer.pdf`,
                )
              }
            >
              <LuDownload size={15} />
              <span>{txt.pdf}</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-[18px] dark:border-slate-700 dark:bg-slate-900">
          <div className={actionTextAlign}>
            <p className="text-[15px] font-bold text-gray-900 dark:text-slate-100">
              {txt.printBillForTailor}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {txt.tailorBillCopy}
            </p>
          </div>
          <div className="mt-[14px] grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <button
              type="button"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-md border-0 bg-amber-500 px-4 font-semibold text-white shadow-[0_8px_20px_rgba(180,120,24,.28)] transition duration-150 hover:-translate-y-[1px] hover:bg-amber-600"
              onClick={() =>
                printElement(tailorId, {
                  dir: settings.dir,
                  lang: settings.htmlLang,
                  title: txt.orderDocumentTitle,
                })
              }
            >
              <LuScissors size={16} />
              <span>{txt.printBillForTailor}</span>
            </button>
            <button
              type="button"
              className="inline-flex min-h-[50px] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-[14px] font-semibold text-slate-700 transition duration-150 hover:-translate-y-[1px] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={() =>
                exportPdf(
                  tailorId,
                  `bill-${customer?.billNumber}-${order?.id}-tailor.pdf`,
                )
              }
            >
              <LuDownload size={15} />
              <span>{txt.pdf}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PrintSafeSheet id={customerId}>
          <CustomerBill customer={customer} order={order} shop={shop} />
        </PrintSafeSheet>
        <PrintSafeSheet id={tailorId}>
          <TailorBill
            customer={customer}
            order={order}
            measurements={measurements}
            shop={shop}
          />
        </PrintSafeSheet>
      </div>
    </div>
  );
}
