import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import JsBarcode from "jsbarcode";
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
import { toAsciiDigits } from "../../lib/normalize.js";
import { formatCurrency } from "../../lib/currency.js";
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
  getOrderPrimaryDisplayName as getLocalizedOrderPrimaryDisplayName,
  getOrderTypeLabel as getLocalizedOrderTypeLabel,
} from "../../lib/orderType.js";

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

function getOrderPrimaryDisplayName(order, customerName, language, options) {
  return getLocalizedOrderPrimaryDisplayName(
    order,
    customerName,
    language,
    options,
  );
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
  if (!text) return "-";

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
  if (value === null || value === undefined || value === "") return "-";
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
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
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

function PrintBillHeader({ settings, title, date, time }) {
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const rowDirClass = settings.isRtl ? "flex-row-reverse" : "flex-row";
  const shopInfoAlignClass = settings.isRtl
    ? "items-end text-right"
    : "items-start text-left";
  const logoUrl = SHOP_CONFIG.logoUrl || SHOP_CONFIG.logo || "";
  const shopAddress = getPrintableText(SHOP_CONFIG.address, settings, "");
  const shopInitials = String(PRINT_SHOP_HEADER_NAME || "KR")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const safeTitle = getPrintableText(title, settings, "");

  return (
    <div className="print-bill-header relative overflow-hidden border-b-2 border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-3 py-2.5 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.18),transparent_58%)]" />
      <div className={`flex items-center justify-between gap-3 ${rowDirClass}`}>
        <div className={`flex min-w-0 items-center gap-2.5 ${rowDirClass}`}>
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/35 bg-white shadow-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={PRINT_SHOP_HEADER_NAME}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-black text-slate-700">
                {shopInitials || "KR"}
              </div>
            )}
          </div>
          <div
            className={`flex min-w-0 flex-col ${shopInfoAlignClass}`}
            style={{ textAlign: settings.isRtl ? "right" : "left" }}
          >
            <p className="truncate text-[14px] font-black text-white">
              {PRINT_SHOP_HEADER_NAME}
            </p>
            <p className="print-shop-meta truncate text-[10px] text-white/90">
              {shopAddress}
            </p>
            <p
              className="print-shop-meta text-[10px] text-white/90 [direction:ltr] [unicode-bidi:embed]"
              style={{ textAlign: settings.isRtl ? "right" : "left" }}
            >
              {(SHOP_CONFIG.phones || []).join(" | ")}
            </p>
          </div>
        </div>
        <div className={`shrink-0 ${alignClass}`}>
          <p className="inline-flex rounded-full border border-white/35 bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white/95">
            {safeTitle}
          </p>
          <p className="mt-1 text-[10px] font-semibold text-white/90 [direction:ltr] [unicode-bidi:embed]">
            {date} | {time}
          </p>
        </div>
      </div>
    </div>
  );
}

function Barcode({
  value,
  width = 2,
  height = 36,
  displayValue = true,
  fontSize = 11,
  margin = 6,
  style,
}) {
  const ref = useRef();

  useEffect(() => {
    if (!value || !ref.current) return;
    try {
      JsBarcode(ref.current, String(value), {
        format: "CODE128",
        width,
        height,
        displayValue,
        fontSize,
        margin,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Barcode generation failed", error);
      }
    }
  }, [value, width, height, displayValue, fontSize, margin]);

  return <svg ref={ref} style={{ maxWidth: 140, width: "100%", ...style }} />;
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

export function CustomerBill({ customer, order }) {
  const { i18n, t } = useTranslation();
  const settings = getBillLanguageSettings(
    i18n.resolvedLanguage || i18n.language,
  );
  const total = order?.totalPrice || 0;
  const discount = order?.discount || 0;
  const paid = order?.paidAmount || 0;
  const remaining = Math.max(0, order?.remaining ?? total - discount - paid);
  const qty = order?.quantity || 1;
  const orderLabelParts = getOrderLabelParts(order, settings.langCode);
  const orderTypeLabel = orderLabelParts.typeWithSequenceLabel;
  const customerNameLabel = getOrderPrimaryDisplayName(
    order,
    customer?.firstName,
    settings.langCode,
  );
  const { date, time } = getPrintDateTime(
    settings,
    order?.createdAt || Date.now(),
  );
  const txt = settings.text;
  const extraTxt = BILL_EXTRA_TEXT[settings.langCode] || BILL_EXTRA_TEXT.en;
  const safeTxt = (key) => getPrintableText(txt[key], settings, key);
  const boxName =
    order?.box?.boxName || order?.foreignBox?.boxName || extraTxt.notAssigned;
  const typeKey = order?.type || "ITEM";
  const rakhtColor = order?.rakhtColor || "-";
  const rakhtColorHex = order?.rakhtColorHex || null;
  const rakhtBrandName = order?.rakhtBrandName || "-";
  const rakhtMeters =
    order?.rakhtRequiredMeters != null
      ? Number(order.rakhtRequiredMeters)
      : null;
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const rowDirClass = settings.isRtl ? "flex-row-reverse" : "flex-row";
  const tableHeadClass = settings.isRtl
    ? "text-[9px] font-extrabold text-slate-700"
    : "text-[9px] font-extrabold uppercase tracking-[0.06em] text-slate-700";
  const billNo = toEnglishDigits(customer?.billNumber);
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

  return (
    <div
      lang={settings.htmlLang}
      dir={settings.dir}
      className="print-a6-sheet print-customer-bill overflow-hidden rounded-[8px] border-2 border-slate-800 bg-white shadow-[0_10px_28px_rgba(15,23,42,.18)]"
      style={billTypographyStyle}
    >
      <PrintBillHeader
        settings={settings}
        title={safeTxt("customerBill")}
        date={date}
        time={time}
      />

      {isEmergency && (
        <div
          className={`border-b border-slate-800 bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700 ${alignClass}`}
        >
          {t("createOrder.emergencyOrder")}
        </div>
      )}

      {/* Customer info strip â€” 4 columns */}
      <div className="print-customer-combined-wrap overflow-x-auto">
        <table className="print-customer-combined-table print-reference-detail-table w-full min-w-[640px] border-collapse table-fixed text-[9px] text-slate-800 sm:min-w-0">
          <thead className="bg-slate-100/95">
            <tr>
              <th
                className={`w-[13%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {txt.billNo}
              </th>
              <th
                className={`w-[11%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {txt.customerName}
              </th>
              <th
                className={`w-[17%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} [direction:ltr]`}
              >
                {txt.phone}
              </th>
              <th
                className={`w-[11%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {t("orders.orderType")}
              </th>
              <th
                className={`w-[6%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} [direction:ltr]`}
              >
                {txt.qty}
              </th>
              <th
                className={`w-[9%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {extraTxt.box}
              </th>
              <th
                className={`w-[17%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {t("createOrder.rakhtSelection", { defaultValue: "Rakht" })}
              </th>
              <th
                className={`w-[16%] border-b border-slate-800 px-1.5 py-1 ${tableHeadClass} [direction:ltr]`}
              >
                {extraTxt.itemPrice}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                className={`border-b border-r border-slate-800 px-1.5 py-1 align-top ${alignClass}`}
              >
                <p className="font-black [direction:ltr] [unicode-bidi:embed]">
                  #{billNo}
                </p>
                <div className="print-barcode-wrap print-customer-barcode-card mt-1 rounded-md border border-slate-300 bg-white p-1">
                  <Barcode
                    value={customer?.billNumber || "0"}
                    width={1}
                    height={20}
                    displayValue={false}
                    margin={1}
                    style={{ maxWidth: 86 }}
                  />
                </div>
              </td>
              <td
                className={`border-b border-r border-slate-800 px-1.5 py-1 align-top font-semibold ${alignClass}`}
              >
                {customerNameLabel}
              </td>
              <td className="border-b border-r border-slate-800 px-1.5 py-1 align-top font-semibold [direction:ltr] [unicode-bidi:embed]">
                {toEnglishDigits(customer?.phoneNumber)}
              </td>
              <td
                className={`border-b border-r border-slate-800 px-1.5 py-1 align-top font-semibold ${alignClass}`}
              >
                {orderTypeLabel}
              </td>
              <td className="border-b border-r border-slate-800 px-1.5 py-1 text-center align-top font-bold [direction:ltr] [unicode-bidi:embed]">
                {formatNumber(qty)}
              </td>
              <td
                className={`border-b border-r border-slate-800 px-1.5 py-1 align-top ${alignClass}`}
              >
                {boxName}
              </td>
              <td
                className={`border-b border-r border-slate-800 px-1.5 py-1 align-top ${alignClass}`}
              >
                {typeKey === "READY_MADE" ? (
                  <span>-</span>
                ) : (
                  <>
                    <p className="inline-flex items-center gap-1 font-semibold text-slate-900">
                      {rakhtColorHex ? (
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            border: "1px solid rgba(15,23,42,0.16)",
                            background: resolveRakhtColorHex(
                              rakhtColor,
                              rakhtColorHex,
                            ),
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                      <span>{rakhtColor}</span>
                    </p>
                    <p className="mt-0.5 text-[8px] text-slate-600 [direction:ltr] [unicode-bidi:embed]">
                      {rakhtBrandName} -{" "}
                      {rakhtMeters != null
                        ? formatMetersWithUnit(rakhtMeters)
                        : "-"}
                    </p>
                  </>
                )}
              </td>
              <td className="border-b border-slate-800 px-1.5 py-1 text-center align-top font-black text-slate-900 [direction:ltr] [unicode-bidi:embed]">
                {formatMoney(total, settings.langCode)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="print-customer-info-strip grid grid-cols-4 bg-gradient-to-r from-slate-100 to-slate-50 text-[9px] text-slate-800">
        <div
          className={`print-customer-info-cell border-b border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
        >
          <p className={tableHeadClass}>{txt.billNo}</p>
          <p className="mt-0.5 font-black text-sky-700 [direction:ltr] [unicode-bidi:embed]">
            #{billNo}
          </p>
        </div>
        <div
          className={`print-customer-info-cell border-b border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
        >
          <p className={tableHeadClass}>{txt.name}</p>
          <p className="mt-0.5 font-semibold text-slate-900">
            {customerNameLabel}
          </p>
        </div>
        <div
          className={`print-customer-info-cell border-b border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
        >
          <p className={tableHeadClass}>{txt.phone}</p>
          <p className="mt-0.5 font-semibold text-slate-900 [direction:ltr] [unicode-bidi:embed]">
            {toEnglishDigits(customer?.phoneNumber)}
          </p>
        </div>
        <div
          className={`print-customer-info-cell border-b border-slate-800 px-2 py-1.5 ${alignClass}`}
        >
          <p className={tableHeadClass}>{t("orders.orderType")}</p>
          <p className="mt-0.5 font-semibold text-slate-900">
            {orderTypeLabel}
          </p>
        </div>
      </div>

      {/* Financial summary table */}
      <div
        className={`print-customer-section-title bg-slate-800 px-2 py-1 text-[8px] font-extrabold text-white ${alignClass}`}
      >
        {txt.financialSummary}
      </div>
      <table className="print-customer-finance-table w-full border-collapse table-fixed text-[9px] text-slate-800">
        <thead className="bg-slate-100/95">
          <tr>
            <th
              className={`border-b border-r border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {txt.totalPrice}
            </th>
            <th
              className={`border-b border-r border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {txt.discount}
            </th>
            <th
              className={`border-b border-r border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {txt.paidAmount}
            </th>
            <th
              className={`border-b border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {txt.remaining}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white">
            <td className="border-b border-r border-slate-800 px-2 py-3 text-center text-[11px] font-black text-blue-900 [direction:ltr] [unicode-bidi:embed]">
              <span className="print-customer-amount">
                {formatMoney(total, settings.langCode)}
              </span>
            </td>
            <td className="border-b border-r border-slate-800 px-2 py-3 text-center text-[11px] font-black text-rose-700 [direction:ltr] [unicode-bidi:embed]">
              <span className="print-customer-amount">
                {discount > 0 ? formatMoney(discount, settings.langCode) : "-"}
              </span>
            </td>
            <td className="border-b border-r border-slate-800 px-2 py-3 text-center text-[11px] font-black text-emerald-700 [direction:ltr] [unicode-bidi:embed]">
              <span className="print-customer-amount">
                {formatMoney(paid, settings.langCode)}
              </span>
            </td>
            <td
              className={`border-b border-slate-800 px-2 py-3 text-center text-[11px] font-black [direction:ltr] [unicode-bidi:embed] ${
                remaining > 0 ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              <span className="print-customer-amount print-customer-amount--final">
                {remaining > 0
                  ? formatMoney(remaining, settings.langCode)
                  : txt.paidInFull}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Barcode + Qty row */}
      <div className="print-customer-barcode-row grid grid-cols-2 border-b border-slate-800">
        <div
          className={`print-customer-barcode-cell border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
          style={{ display: "flex", flexDirection: "column", gap: 4 }}
        >
          <p className={tableHeadClass}>{txt.billNo}</p>
          <div className="print-barcode-wrap print-customer-barcode-card rounded-md border border-slate-300 bg-white p-1.5">
            <Barcode value={customer?.billNumber} style={{ maxWidth: 148 }} />
          </div>
        </div>
        <div
          className={`print-customer-detail-cell flex flex-col justify-center gap-2 px-2 py-1.5 ${alignClass}`}
        >
          <div>
            <p className={`${tableHeadClass}`}>{txt.qty}</p>
            <p className="print-customer-quantity mt-0.5 text-[13px] font-black text-slate-900 [direction:ltr] [unicode-bidi:embed]">
              {formatNumber(qty)}
            </p>
          </div>
          <div>
            <p className={`${tableHeadClass}`}>{extraTxt.box}</p>
            <p className="mt-0.5 font-semibold text-slate-800">
              {order?.box?.boxName ||
                order?.foreignBox?.boxName ||
                extraTxt.notAssigned}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className={`print-customer-footer grid grid-cols-2 bg-slate-100 text-[9px] text-slate-800`}
      >
        <div className={`border-r border-slate-800 px-2 py-1.5 ${alignClass}`}>
          <span className="font-extrabold">{txt.date}</span>:{" "}
          <span className="[direction:ltr] [unicode-bidi:embed]">
            {date} | {time}
          </span>
        </div>
        <div
          className={`px-2 py-1.5 ${rowDirClass === "flex-row-reverse" ? "text-left" : "text-right"}`}
        >
          <span className="font-black text-slate-700 [direction:ltr] [unicode-bidi:embed]">
            #{billNo}
          </span>
        </div>
      </div>
    </div>
  );
}
export function CustomerCombinedBill({ customer, orders = [] }) {
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
  const billNo = toEnglishDigits(customer?.billNumber);
  const customerName = customer?.firstName || "-";
  const customerPhone = toEnglishDigits(customer?.phoneNumber);
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
    const customerNameLabel = getOrderPrimaryDisplayName(
      order,
      customerName,
      settings.langCode,
      {
        totalByType: typeCountTotals[typeKey],
        sequenceByType: typeIndex[typeKey],
      },
    );
    const totalPrice = Number(order?.totalPrice || 0);
    return {
      order,
      index,
      typeKey,
      itemLabel: typeWithSequenceLabel,
      customerNameLabel,
      qty: Number(order?.quantity || 1),
      amount: totalPrice,
      boxName:
        order?.box?.boxName ||
        order?.foreignBox?.boxName ||
        extraTxt.notAssigned,
      rakhtColor: order?.rakhtColor || "-",
      rakhtColorHex: order?.rakhtColorHex || null,
      rakhtBrandName: order?.rakhtBrandName || "-",
      rakhtMeters:
        order?.rakhtRequiredMeters != null
          ? Number(order.rakhtRequiredMeters)
          : null,
    };
  });

  const totals = safeOrders.reduce(
    (acc, item) => {
      acc.total += Number(item?.totalPrice || 0);
      acc.discount += Number(item?.discount || 0);
      acc.paid += Number(item?.paidAmount || 0);
      return acc;
    },
    { total: 0, discount: 0, paid: 0 },
  );
  const remaining = Math.max(0, totals.total - totals.discount - totals.paid);
  const billIsEmergency = safeOrders.some((order) => order?.isEmergency);
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const rowDirClass = settings.isRtl ? "flex-row-reverse" : "flex-row";
  const tableHeadClass = settings.isRtl
    ? "text-[9px] font-extrabold text-slate-700"
    : "text-[9px] font-extrabold uppercase tracking-[0.06em] text-slate-700";
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

  return (
    <div
      lang={settings.htmlLang}
      dir={settings.dir}
      className="print-a6-sheet print-customer-bill print-customer-bill--combined overflow-hidden rounded-[8px] border-2 border-slate-800 bg-white shadow-[0_10px_28px_rgba(15,23,42,.18)]"
      style={billTypographyStyle}
    >
      <PrintBillHeader
        settings={settings}
        title={safeTxt("customerBill")}
        date={date}
        time={time}
      />

      {billIsEmergency ? (
        <div
          className={`border-b border-slate-800 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 ${alignClass}`}
        >
          {t("createOrder.emergencyOrder")}
        </div>
      ) : null}

      <div className="print-customer-combined-wrap overflow-x-auto">
        <table className="print-customer-combined-table print-reference-detail-table w-full min-w-[640px] border-collapse table-fixed text-[9px] text-slate-800 sm:min-w-0">
          <thead className="bg-slate-100/95">
            <tr>
              <th
                className={`w-[13%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {safeTxt("billNo")}
              </th>
              <th
                className={`w-[11%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {safeTxt("customerName")}
              </th>
              <th
                className={`w-[17%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} [direction:ltr]`}
              >
                {safeTxt("phone")}
              </th>
              <th
                className={`w-[11%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {t("orders.orderType")}
              </th>
              <th
                className={`w-[6%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} [direction:ltr]`}
              >
                {safeTxt("qty")}
              </th>
              <th
                className={`w-[9%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {safeExtraTxt("box")}
              </th>
              <th
                className={`w-[17%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
              >
                {t("createOrder.rakhtSelection", { defaultValue: "Rakht" })}
              </th>
              <th
                className={`w-[16%] border-b border-slate-800 px-1.5 py-1 ${tableHeadClass} [direction:ltr]`}
              >
                {safeExtraTxt("itemPrice")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rowItems.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className={`border-b border-slate-800 px-2 py-2 text-[10px] ${alignClass}`}
                >
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              rowItems.map((row) => (
                <tr key={row.order?.id || `${row.order?.type}-${row.index}`}>
                  <td
                    className={`border-b border-r border-slate-800 px-1.5 py-1 align-top ${alignClass}`}
                  >
                    <p className="font-black [direction:ltr] [unicode-bidi:embed]">
                      #{billNo}
                    </p>
                    <div className="print-barcode-wrap print-customer-barcode-card mt-1 rounded-md border border-slate-300 bg-white p-1">
                      <Barcode
                        value={customer?.billNumber || "0"}
                        width={1}
                        height={20}
                        displayValue={false}
                        margin={1}
                        style={{ maxWidth: 86 }}
                      />
                    </div>
                  </td>
                  <td
                    className={`border-b border-r border-slate-800 px-1.5 py-1 align-top font-semibold ${alignClass}`}
                  >
                    <div>{row.customerNameLabel}</div>
                  </td>
                  <td className="border-b border-r border-slate-800 px-1.5 py-1 align-top font-semibold [direction:ltr] [unicode-bidi:embed]">
                    {customerPhone}
                  </td>
                  <td
                    className={`border-b border-r border-slate-800 px-1.5 py-1 align-top font-semibold ${alignClass}`}
                  >
                    {row.itemLabel}
                  </td>
                  <td className="border-b border-r border-slate-800 px-1.5 py-1 text-center align-top font-bold [direction:ltr] [unicode-bidi:embed]">
                    {formatNumber(row.qty)}
                  </td>
                  <td
                    className={`border-b border-r border-slate-800 px-1.5 py-1 align-top ${alignClass}`}
                  >
                    {row.boxName}
                  </td>
                  <td
                    className={`border-b border-r border-slate-800 px-1.5 py-1 align-top ${alignClass}`}
                  >
                    {row.typeKey === "READY_MADE" ? (
                      <span>-</span>
                    ) : (
                      <>
                        <p className="inline-flex items-center gap-1 font-semibold text-slate-900">
                          {row.rakhtColorHex ? (
                            <span
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: "50%",
                                border: "1px solid rgba(15,23,42,0.16)",
                                background: resolveRakhtColorHex(
                                  row.rakhtColor,
                                  row.rakhtColorHex,
                                ),
                                flexShrink: 0,
                              }}
                            />
                          ) : null}
                          <span>{row.rakhtColor}</span>
                        </p>
                        <p className="mt-0.5 text-[8px] text-slate-600 [direction:ltr] [unicode-bidi:embed]">
                          {row.rakhtBrandName} -{" "}
                          {row.rakhtMeters != null
                            ? formatMetersWithUnit(row.rakhtMeters)
                            : "-"}
                        </p>
                      </>
                    )}
                  </td>
                  <td className="border-b border-slate-800 px-1.5 py-1 text-center align-top font-black text-slate-900 [direction:ltr] [unicode-bidi:embed]">
                    {formatMoney(row.amount, settings.langCode)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        className={`print-customer-section-title bg-slate-800 px-2 py-1 text-[8px] font-extrabold text-white ${alignClass}`}
      >
        {safeTxt("financialSummary")}
      </div>
      <table className="print-customer-finance-table w-full border-collapse table-fixed text-[10px] text-slate-800">
        <thead className="bg-slate-100">
          <tr>
            <th
              className={`w-1/4 border-b border-r border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {safeExtraTxt("totalAllClothes")}
            </th>
            <th
              className={`w-1/4 border-b border-r border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {safeExtraTxt("totalDiscountAllClothes")}
            </th>
            <th
              className={`w-1/4 border-b border-r border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {safeExtraTxt("totalPaidAllClothes")}
            </th>
            <th
              className={`w-1/4 border-b border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {safeExtraTxt("totalRemainingAllClothes")}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white">
            <td className="border-r border-slate-800 px-2 py-2 text-center font-black text-blue-900 [direction:ltr] [unicode-bidi:embed]">
              <span className="print-customer-amount">
                {formatMoney(totals.total, settings.langCode)}
              </span>
            </td>
            <td className="border-r border-slate-800 px-2 py-2 text-center font-black text-rose-800 [direction:ltr] [unicode-bidi:embed]">
              <span className="print-customer-amount">
                {formatMoney(totals.discount, settings.langCode)}
              </span>
            </td>
            <td className="border-r border-slate-800 px-2 py-2 text-center font-black text-emerald-800 [direction:ltr] [unicode-bidi:embed]">
              <span className="print-customer-amount">
                {formatMoney(totals.paid, settings.langCode)}
              </span>
            </td>
            <td
              className={`px-2 py-2 text-center font-black [direction:ltr] [unicode-bidi:embed] ${
                remaining > 0 ? "text-amber-800" : "text-emerald-800"
              }`}
            >
              <span className="print-customer-amount print-customer-amount--final">
                {remaining > 0
                  ? formatMoney(remaining, settings.langCode)
                  : safeTxt("paidInFull")}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="print-customer-footer border-t border-slate-800 bg-slate-50 px-2 py-1 text-[9px] text-slate-600">
        <div
          className={`flex items-center justify-between gap-2 ${rowDirClass}`}
        >
          <span>{getPrintableText(SHOP_CONFIG.tagline, settings)}</span>
          <span className="[direction:ltr] [unicode-bidi:embed]">
            #{billNo}
          </span>
        </div>
      </div>
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

function getOrderItemLabel(order, itemLabel, settings) {
  if (itemLabel?.trim()) return itemLabel.trim();
  return getOrderDisplayName(order, settings.langCode);
}

function renderRakhtColorValue(colorName, colorHex) {
  const swatchHex = resolveRakhtColorHex(colorName, colorHex);

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
      <span>{colorName || "-"}</span>
    </span>
  );
}

export function TailorBill({ customer, order, measurements, itemLabel }) {
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
  const billLabel = getOrderItemLabel(order, itemLabel, settings);
  const orderLabelParts = getOrderLabelParts(order, settings.langCode);
  const orderTypeLabel = orderLabelParts.typeWithSequenceLabel;
  const orderCustomName = orderLabelParts.customName;
  const customerNameLabel = getOrderPrimaryDisplayName(
    order,
    customer?.firstName,
    settings.langCode,
  );
  const orderBoxName =
    order?.box?.boxName || order?.foreignBox?.boxName || extraTxt.notAssigned;
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const tableHeadClass = settings.isRtl
    ? "text-[9px] font-extrabold text-slate-700"
    : "text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-700";
  const orderType = order?.type;

  const allEntries = Object.entries(measurements || {}).filter(
    ([key, value]) => !SKIP_FIELDS.has(key) && hasBillFieldValue(value),
  );

  const visibleEntries = allEntries.filter(
    ([key]) => !(orderType === "OUTFIT" && key === "additionalStyleInfo"),
  );
  const designNoteEntry = allEntries.find(
    ([key, value]) =>
      orderType === "OUTFIT" &&
      key === "additionalStyleInfo" &&
      value !== false &&
      String(value || "").trim(),
  );
  const designNoteText = designNoteEntry
    ? toEnglishDigits(String(designNoteEntry[1]).trim())
    : "";
  const designNoteLabel = t("createOrder.additionalNotes");

  const measurementFieldDefinitions = MEASUREMENT_FIELDS[orderType] || [];
  const styleFieldDefinitions = STYLE_FIELDS[orderType] || [];
  const pocketFieldDefinitions = POCKET_FIELDS[orderType] || [];
  const measurementFieldKeys = new Set(
    measurementFieldDefinitions.map(([key]) => key),
  );
  const styleFieldKeys = new Set([
    ...styleFieldDefinitions.map(([key]) => key),
    ...pocketFieldDefinitions.map(([key]) => key),
    ...(orderType === "OUTFIT" ? ["additionalStyleInfo"] : []),
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
  ].map(([label, value]) => [label, formatMeasurementValue(value)]);

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
  ].map(([label, value]) => [
    label,
    typeof value === "boolean"
      ? safeTxt("yes")
      : normalizeShopPrintStyleValue(toEnglishDigits(String(value))),
  ]);

  // Zip measurement and style rows, padding the shorter array with empty entries
  const maxRows = Math.max(measRows.length, styleRows.length);
  const zippedRows = Array.from({ length: maxRows }, (_, i) => ({
    mLabel: measRows[i]?.[0] ?? "",
    mValue: measRows[i]?.[1] ?? "",
    sLabel: styleRows[i]?.[0] ?? "",
    sValue: styleRows[i]?.[1] ?? "",
  }));

  // Rakht (fabric) details
  const rakhtColor = order?.rakhtColor || "-";
  const rakhtColorHex = order?.rakhtColorHex || null;
  const rakhtBrandName = order?.rakhtBrandName || "-";
  const rakhtMetersDisplay =
    order?.rakhtRequiredMeters != null
      ? formatMetersWithUnit(order.rakhtRequiredMeters)
      : "-";
  const swatchHex = resolveRakhtColorHex(rakhtColor, rakhtColorHex);

  const sectionHeadClass = settings.isRtl
    ? "text-[8px] font-extrabold text-white"
    : "text-[8px] font-extrabold uppercase tracking-[0.12em] text-white";
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

  return (
    <div
      lang={settings.htmlLang}
      dir={settings.dir}
      className="print-a6-sheet print-shop-bill overflow-hidden rounded-[8px] border-2 border-slate-800 bg-white shadow-[0_10px_28px_rgba(15,23,42,.18)]"
      style={billTypographyStyle}
    >
      <PrintBillHeader
        settings={settings}
        title={safeTxt("tailorCopy")}
        date={date}
        time={time}
      />

      {order?.isEmergency && (
        <div
          className={`border-b border-slate-800 bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700 ${alignClass}`}
        >
          {t("createOrder.emergencyOrder")}
        </div>
      )}

      {/* Customer info strip â€” 5 columns: Bill# | Name | Order Type | Box | Qty */}
      <div className="print-tailor-info-strip grid grid-cols-5 bg-gradient-to-r from-slate-100 to-slate-50 text-[9px] text-slate-800">
        <div
          className={`print-customer-info-cell border-b border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
        >
          <p className={tableHeadClass}>{safeTxt("billNo")}</p>
          <p className="mt-0.5 font-black text-sky-700 [direction:ltr] [unicode-bidi:embed]">
            #{toEnglishDigits(customer?.billNumber)}
          </p>
        </div>
        <div
          className={`border-b border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
        >
          <p className={tableHeadClass}>{safeTxt("name")}</p>
          <p className="mt-0.5 font-semibold text-slate-900">
            {customerNameLabel}
          </p>
        </div>
        <div
          className={`border-b border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
        >
          <p className={tableHeadClass}>{t("orders.orderType")}</p>
          <p className="mt-0.5 font-semibold text-slate-900">
            {orderTypeLabel}
          </p>
        </div>
        <div
          className={`border-b border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
        >
          <p className={tableHeadClass}>{safeExtraTxt("box")}</p>
          <p className="mt-0.5 font-semibold text-slate-900">{orderBoxName}</p>
        </div>
        <div
          className={`print-customer-info-cell border-b border-slate-800 px-2 py-1.5 ${alignClass}`}
        >
          <p className={tableHeadClass}>{safeTxt("qty")}</p>
          <p className="mt-0.5 font-extrabold text-slate-900 [direction:ltr] [unicode-bidi:embed]">
            {formatNumber(order?.quantity || 1)}
          </p>
        </div>
      </div>

      {/* Measurements + Styles table â€” 4 columns */}
      <div className="overflow-x-auto print-tailor-ledger-wrap">
        <table className="print-tailor-ledger-table w-full border-collapse table-fixed text-slate-800">
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "31%" }} />
            <col style={{ width: "25%" }} />
          </colgroup>
          <thead>
            <tr className="print-tailor-ledger-headrow">
              <th className={`print-tailor-ledger-headcell ${alignClass}`}>
                {t("createOrder.measurements")}
              </th>
              <th className="print-tailor-ledger-headcell text-center">
                {safeTxt("value")}
              </th>
              <th
                className={`print-tailor-ledger-headcell print-tailor-ledger-headcell--style ${alignClass}`}
              >
                {t("createOrder.styleOptions")}
              </th>
              <th className={`print-tailor-ledger-headcell ${alignClass}`}>
                {safeTxt("value")}
              </th>
            </tr>
          </thead>
          <tbody>
            {zippedRows.map(({ mLabel, mValue, sLabel, sValue }, i) => (
              <tr key={i} className="print-tailor-ledger-row">
                <td
                  className={`print-tailor-ledger-cell print-tailor-ledger-cell--label ${alignClass}`}
                >
                  <span className="print-tailor-ledger-text">
                    {mLabel || "-"}
                  </span>
                </td>
                <td className="print-tailor-ledger-cell print-tailor-ledger-cell--measure text-center [direction:ltr] [unicode-bidi:embed]">
                  <span className="print-tailor-ledger-text">
                    {mValue || "-"}
                  </span>
                </td>
                <td
                  className={`print-tailor-ledger-cell print-tailor-ledger-cell--label print-tailor-ledger-cell--style-label ${alignClass}`}
                >
                  <span className="print-tailor-ledger-text">
                    {sLabel || "-"}
                  </span>
                </td>
                <td
                  className={`print-tailor-ledger-cell print-tailor-ledger-cell--value ${alignClass}`}
                >
                  <span className="print-tailor-ledger-text">
                    {sValue || "-"}
                  </span>
                </td>
              </tr>
            ))}
            {designNoteText ? (
              <tr className="print-tailor-ledger-row print-tailor-ledger-note-row">
                <td
                  colSpan={4}
                  className={`print-tailor-ledger-cell print-tailor-ledger-note-cell ${alignClass}`}
                >
                  <div className="print-tailor-ledger-note-box">
                    <div className="print-tailor-ledger-note-label">
                      {designNoteLabel}
                    </div>
                    <div className="print-tailor-ledger-note-text">
                      {designNoteText}
                    </div>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Rakht (Fabric) section */}
      {orderType !== "READY_MADE" && (
        <div className="print-tailor-fabric-section border-t-2 border-slate-800">
          <div
            className={`bg-slate-800 px-2 py-1 ${sectionHeadClass} ${alignClass}`}
          >
            {t("createOrder.rakhtSelection", {
              defaultValue: "Rakht / Fabric",
            })}
          </div>
          <div className="print-tailor-fabric-grid grid grid-cols-3 bg-slate-50 text-[10px]">
            <div
              className={`border-b border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
            >
              <p className="text-[8px] font-extrabold uppercase tracking-wide text-slate-500">
                {t("rakht.color", { defaultValue: "Color" })}
              </p>
              <p className="mt-0.5 flex items-center gap-1 font-bold text-slate-900">
                {swatchHex && (
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      border: "1px solid rgba(15,23,42,0.2)",
                      background: swatchHex,
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                )}
                <span>{rakhtColor}</span>
              </p>
            </div>
            <div
              className={`border-b border-r border-slate-800 px-2 py-1.5 ${alignClass}`}
            >
              <p className="text-[8px] font-extrabold uppercase tracking-wide text-slate-500">
                {t("rakht.brandName", { defaultValue: "Brand" })}
              </p>
              <p className="mt-0.5 font-bold text-slate-900">
                {rakhtBrandName}
              </p>
            </div>
            <div
              className={`border-b border-slate-800 px-2 py-1.5 ${alignClass}`}
            >
              <p className="text-[8px] font-extrabold uppercase tracking-wide text-slate-500">
                {t("rakht.requiredMeters", { defaultValue: "Meters" })}
              </p>
              <p className="mt-0.5 font-bold text-slate-900 [direction:ltr] [unicode-bidi:embed]">
                {rakhtMetersDisplay}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="print-tailor-footer grid grid-cols-2 bg-slate-100 text-[9px] text-slate-800">
        <div className={`border-r border-slate-800 px-2 py-1.5 ${alignClass}`}>
          <span className="font-extrabold">{safeTxt("date")}</span>: {date}
        </div>
        <div
          className={`px-2 py-1.5 ${settings.isRtl ? "text-left" : "text-right"}`}
        >
          <span className="font-extrabold [direction:ltr] [unicode-bidi:embed]">
            {time}
          </span>
        </div>
      </div>
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
          html{
            width:105mm;
            min-height:148mm;
          }
          body{
            margin:0;
            font-family:${bodyFont};
            line-height:1.45;
            background:#fff;
            width:105mm;
            min-height:148mm;
            padding:2.5mm;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#0f172a;
            direction:${dir};
            text-align:${isRtl ? "right" : "left"};
            -webkit-print-color-adjust:exact;
            print-color-adjust:exact;
            text-rendering:optimizeLegibility;
            overflow:hidden;
          }
          .print-a6-sheet{width:100%;max-width:100%;margin:auto;box-sizing:border-box;transform:scale(var(--print-a6-scale,1));transform-origin:center center}
          .print-bill-header{border-bottom-width:2px !important}
          .print-bill-header .print-shop-meta{line-height:1.35}
          .print-a6-sheet table th,
          .print-a6-sheet table td{vertical-align:top}
          .print-tailor-ledger-cell{vertical-align:top}
          .print-tailor-ledger-text{display:block;max-width:100%;overflow:visible;white-space:normal;overflow-wrap:anywhere;word-break:break-word;text-overflow:clip}
          .print-tailor-ledger-headcell--style,
          .print-tailor-ledger-cell--style-label{border-inline-start:2px solid #374151}
          .print-tailor-ledger-note-row{height:auto}
          .print-tailor-ledger-note-cell{padding:0!important;border-inline-end:0!important;vertical-align:top}
          .print-tailor-ledger-note-box{min-height:30px;padding:3px 4.4px 3.5px;background:#f8fafc}
          .print-tailor-ledger-note-label{margin-bottom:2px;font-size:7.2px;font-weight:800;line-height:1.25;color:#475569}
          .print-tailor-ledger-note-text{display:block;max-width:100%;font-size:8.2px;font-weight:700;line-height:1.3;color:#111827;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
          .print-a6-sheet[dir="rtl"] .print-tailor-ledger-note-text{direction:rtl;text-align:right}
          .print-customer-bill{background:linear-gradient(180deg,#fff 0%,#f8fafc 100%)}
          .print-customer-info-strip{background:linear-gradient(135deg,#f8fafc 0%,#eef2f7 100%);grid-template-columns:17% 23% 38% 22%}
          .print-customer-info-cell,.print-customer-barcode-cell,.print-customer-detail-cell{min-width:0}
          .print-customer-info-cell p,.print-customer-detail-cell p,.print-customer-combined-table th,.print-customer-combined-table td{max-width:100%;overflow-wrap:anywhere;word-break:break-word}
          .print-customer-section-title{border-bottom:1px solid #1f2937;line-height:1.25;letter-spacing:0;text-transform:none}
          .print-customer-finance-table thead,.print-customer-finance-table th{background:#eef1f4;color:#111827}
          .print-customer-amount{display:inline-flex;align-items:center;justify-content:center;max-width:100%;min-width:0;padding:1px 4px;border-radius:4px;background:#f8fafc;box-shadow:inset 0 0 0 1px rgba(15,23,42,.09);line-height:1.35;white-space:normal;overflow-wrap:anywhere;word-break:break-word}
          .print-customer-amount--final{background:#fffbeb}
          .print-customer-barcode-row{background:linear-gradient(180deg,#fff 0%,#f8fafc 100%)}
          .print-customer-barcode-card{display:inline-flex;align-items:center;justify-content:center;max-width:100%;box-shadow:inset 0 0 0 1px rgba(15,23,42,.03)}
          .print-customer-barcode-card svg{max-width:100%;height:auto}
          .print-customer-quantity{display:inline-block;width:max-content;max-width:100%;padding:1px 7px;border-radius:5px;background:#e0f2fe;color:#075985}
          .print-customer-footer{background:#eef2f7}
          .print-customer-combined-wrap{max-width:100%}
          .print-customer-combined-table{min-width:0!important;background:#fff;font-size:7.6px}
          .print-customer-combined-table tbody tr:nth-child(even){background:#f8fafc}
          .print-barcode-wrap{box-shadow:inset 0 0 0 1px rgba(15,23,42,.02)}
          .print-a6-sheet[dir="rtl"] .border-r{border-right-width:0;border-inline-end-width:1px}
          .print-a6-sheet[dir="rtl"] .border-r-2{border-right-width:0;border-inline-end-width:2px}
          .print-a6-sheet[dir="rtl"]{
            text-align:right;
            letter-spacing:normal;
            word-spacing:normal;
            font-feature-settings:"rlig" 1,"liga" 1,"calt" 1;
          }
          .print-a6-sheet[dir="rtl"] .print-customer-combined-table th,
          .print-a6-sheet[dir="rtl"] .print-customer-combined-table td{
            direction:rtl;
            text-align:right;
          }
          @media (max-width:640px){
            body{padding:2.5mm}
            .print-a6-sheet{border-width:1.5px}
          }
          @media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}html,body{width:105mm;min-height:148mm}body{padding:2.5mm;margin:0;display:flex;align-items:center;justify-content:center}.print-a6-sheet{margin:auto}}
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
          "position:absolute;visibility:hidden;pointer-events:none;width:100mm;height:143mm;inset:0";
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
    "mx-auto w-full max-w-[560px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--sh-md)] dark:border-slate-700 dark:bg-slate-900 print:max-w-[148mm] print:rounded-none print:border-gray-300 print:bg-white print:text-black print:shadow-none";

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
    toast.error(`PDF export failed: ${error.message}`);
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
          <CustomerBill customer={customer} order={order} />
        </PrintSafeSheet>
        <PrintSafeSheet id={tailorId}>
          <TailorBill
            customer={customer}
            order={order}
            measurements={measurements}
          />
        </PrintSafeSheet>
      </div>
    </div>
  );
}
