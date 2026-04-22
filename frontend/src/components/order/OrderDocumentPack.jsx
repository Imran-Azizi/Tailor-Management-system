import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import JsBarcode from "jsbarcode";
import {
  LuDownload,
  LuFileText,
  LuPhone,
  LuPrinter,
  LuReceipt,
  LuScissors,
} from "react-icons/lu";
import { SHOP_CONFIG } from "../../config/shopConfig.js";
import { toAsciiDigits } from "../../lib/normalize.js";
import { formatCurrency } from "../../lib/currency.js";
import { resolveRakhtColorHex } from "../../lib/rakhtColors.js";
import { getOrderTypeLabel as getLocalizedOrderTypeLabel } from "../../lib/orderType.js";

const NUMERIC_FIELDS = new Set([
  "height",
  "shoulder",
  "sleeve",
  "neck",
  "chest",
  "armpit",
  "waist",
  "skirt",
  "tenban",
  "pantLeg",
  "arm",
  "calf",
  "sorain",
  "patlonHeight",
  "kamerPatlon",
  "doroBaghlePatlon",
  "sorainPatlon",
  "patPatlon",
  "pachaPatlon",
]);

const SKIP_FIELDS = new Set(["id", "orderId", "__name"]);

const ORDER_TYPE_LABELS = {
  en: {
    OUTFIT: "Outfit",
    WASKAT: "Waskat",
    KORTY: "Korty",
    YAKHANQAQ: "YakhanQaq",
  },
  dari: {
    OUTFIT: "پیراهن تنبان",
    WASKAT: "واسکت",
    KORTY: "کُرتی",
    YAKHANQAQ: "یخن قاق",
  },
  pashto: {
    OUTFIT: "پيراهن تنبان",
    WASKAT: "واسکټ",
    KORTY: "کورتي",
    YAKHANQAQ: "یخن قاق",
  },
};

const BILL_TEXT = {
  en: {
    customerBill: "Customer Bill",
    tailorCopy: "Tailor Shop Copy",
    customerName: "Customer Name",
    billNo: "Bill #",
    qty: "Qty",
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
  },
  dari: {
    customerBill: "بل مشتری",
    tailorCopy: "کاپی خیاط",
    customerName: "نام مشتری",
    billNo: "شماره بل",
    qty: "تعداد",
    financialSummary: "خلاصه مالی",
    totalPrice: "قیمت مجموعی",
    discount: "تخفیف",
    paidAmount: "مبلغ پرداخت‌شده",
    remaining: "باقی‌مانده",
    paidInFull: "تکمیل شد",
    customerInformation: "معلومات مشتری",
    measurementInformation: "معلومات اندازه‌گیری",
    stylesInformation: "معلومات سبک",
    date: "تاریخ",
    name: "نام",
    phone: "شماره تماس",
    quantity: "تعداد",
    yes: "بلی",
    printBillForCustomer: "چاپ بل مشتری",
    printBillForTailor: "چاپ بل خیاط",
    customerBillCopy: "رسید A5 با خلاصه بل و تفکیک مالی",
    tailorBillCopy: "کاپی داخلی با اندازه‌ها و جزئیات سبک",
    orderDocumentTitle: "سند سفارش",
  },
  pashto: {
    customerBill: "د مشتری بل",
    tailorCopy: "د خياط کاپي",
    customerName: "د مشتری نوم",
    billNo: "د بل شمېره",
    qty: "تعداد",
    financialSummary: "مالي لنډيز",
    totalPrice: "ټوله بيه",
    discount: "تخفیف",
    paidAmount: "ورکړل شوې پیسې",
    remaining: "پاتې",
    paidInFull: "بشپړ شوی",
    customerInformation: "د مشتری معلومات",
    measurementInformation: "د اندازو معلومات",
    stylesInformation: "د سټایل معلومات",
    date: "نېټه",
    name: "نوم",
    phone: "د تماس شمېره",
    quantity: "تعداد",
    yes: "هو",
    printBillForCustomer: "د مشتری بل چاپ",
    printBillForTailor: "د خياط بل چاپ",
    customerBillCopy: "A5 رسيد د بل لنډيز او مالي جزیاتو سره",
    tailorBillCopy: "داخلي کاپي د اندازو او سټایل جزياتو سره",
    orderDocumentTitle: "د فرمایش سند",
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

const PRINT_SHOP_HEADER_NAME = "Khan Rahimi";
const AFGHANISTAN_TIMEZONE = "Asia/Kabul";

export function getBillLanguageSettings(language) {
  const lang = String(language || "en").toLowerCase();
  const langCode =
    lang.startsWith("pashto") || lang.startsWith("ps")
      ? "pashto"
      : lang.startsWith("dari") || lang.startsWith("fa")
        ? "dari"
        : "en";

  const isRtl = false;
  const locale =
    langCode === "en" ? "en-US" : langCode === "dari" ? "fa-AF" : "ps-AF";

  return {
    langCode,
    locale,
    htmlLang: locale,
    dir: "ltr",
    isRtl,
    fontFamily: "'Inter','Noto Naskh Arabic','Noto Sans Arabic',sans-serif",
    text: BILL_TEXT[langCode],
  };
}

export function getOrderTypeLabel(type, language) {
  return getLocalizedOrderTypeLabel(type, language);
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

function formatMeasurementValue(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return formatNumber(numeric);
  }
  return toEnglishDigits(value);
}

function formatDateWithEnglishDigits(dateInput, locale, timeZone) {
  const value = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(value.getTime())) return "-";
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  if (timeZone) options.timeZone = timeZone;
  const fmt = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, options);
  return fmt.format(value);
}

function formatTimeWithEnglishDigits(dateInput, locale, timeZone) {
  const value = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(value.getTime())) return "-";
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  if (timeZone) options.timeZone = timeZone;
  const fmt = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, options);
  return fmt.format(value);
}

function formatFieldKey(key, t) {
  return t(`createOrder.fields.${key}`, {
    defaultValue: key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim(),
  });
}

function getPrintDateTime(settings, timestamp) {
  const isAfghanNow =
    settings.langCode === "dari" || settings.langCode === "pashto";
  const source = isAfghanNow ? new Date() : timestamp || Date.now();
  const zone = isAfghanNow ? AFGHANISTAN_TIMEZONE : undefined;
  return {
    date: formatDateWithEnglishDigits(source, settings.locale, zone),
    time: formatTimeWithEnglishDigits(source, settings.locale, zone),
  };
}

function PrintBillHeader({ settings, title, date, time }) {
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const rowDirClass = settings.isRtl ? "flex-row-reverse" : "flex-row";
  const logoUrl = SHOP_CONFIG.logoUrl || SHOP_CONFIG.logo || "";
  const shopInitials = String(PRINT_SHOP_HEADER_NAME || "KR")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="border-b-2 border-slate-800 bg-slate-50 px-3 py-2.5">
      <div className={`flex items-center justify-between gap-3 ${rowDirClass}`}>
        <div className={`flex min-w-0 items-center gap-2.5 ${rowDirClass}`}>
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white">
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
          <div className={`min-w-0 ${alignClass}`}>
            <p className="truncate text-[14px] font-black text-slate-900">
              {PRINT_SHOP_HEADER_NAME}
            </p>
            <p className="truncate text-[10px] text-slate-600">
              {SHOP_CONFIG.address}
            </p>
            <p className="text-[10px] text-slate-600">
              {(SHOP_CONFIG.phones || []).join(" • ")}
            </p>
          </div>
        </div>
        <div className={`shrink-0 ${alignClass}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-600">
            {title}
          </p>
          <p className="text-[10px] font-semibold text-slate-700">
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
      console.error("Barcode generation failed", error);
    }
  }, [value, width, height, displayValue, fontSize, margin]);

  return <svg ref={ref} style={{ maxWidth: 140, width: "100%", ...style }} />;
}

export function getMeasurementsFromOrder(order) {
  if (!order) return {};
  if (order.measurements) return order.measurements;
  if (order.type === "OUTFIT") return order.outfit || {};
  if (order.type === "WASKAT") return order.waskat || {};
  if (order.type === "KORTY") return order.korty || {};
  if (order.type === "YAKHANQAQ") return order.yakhanQaq || {};
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
  const orderTypeLabel = getOrderTypeLabel(order?.type, settings.langCode);
  const { date, time } = getPrintDateTime(
    settings,
    order?.createdAt || Date.now(),
  );
  const txt = settings.text;
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const summaryBorderClass = settings.isRtl ? "sm:border-r-2" : "sm:border-l-2";
  const summaryOrderClass = settings.isRtl ? "sm:order-1" : "sm:order-2";
  const contentOrderClass = settings.isRtl ? "sm:order-2" : "sm:order-1";
  const headClass = settings.isRtl
    ? "text-[10px] font-bold text-slate-500"
    : "text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500";
  const summaryHeadClass = settings.isRtl
    ? "text-[10px] font-extrabold text-blue-800"
    : "text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-800";

  const moneyCells = [
    {
      label: txt.totalPrice,
      value: formatMoney(total, settings.langCode),
      tone: "text-slate-900",
    },
    {
      label: txt.discount,
      value:
        discount > 0 ? `-${formatMoney(discount, settings.langCode)}` : "-",
      tone: "text-rose-600",
    },
    {
      label: txt.paidAmount,
      value: formatMoney(paid, settings.langCode),
      tone: "text-emerald-700",
    },
    {
      label: txt.remaining,
      value:
        remaining > 0
          ? formatMoney(remaining, settings.langCode)
          : txt.paidInFull,
      tone: remaining > 0 ? "text-amber-600" : "text-emerald-700",
    },
  ];

  return (
    <div
      lang={settings.htmlLang}
      dir={settings.dir}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      style={{ fontFamily: settings.fontFamily }}
    >
      <PrintBillHeader
        settings={settings}
        title={txt.customerBill}
        date={date}
        time={time}
      />

      <div className="grid border-t border-slate-200 sm:grid-cols-[1fr_170px]">
        <div className={`${contentOrderClass} flex flex-col`}>
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-50">
              <tr>
                {[txt.billNo, t("orders.orderType"), txt.qty].map((header) => (
                  <th
                    key={header}
                    className={`border-b border-slate-200 px-3 py-2 ${headClass} ${alignClass}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-3 text-sm font-black text-sky-700 [direction:ltr] [unicode-bidi:embed]">
                  #{toEnglishDigits(customer?.billNumber)}
                </td>
                <td className={`px-3 py-3 ${alignClass}`}>
                  <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800">
                    {orderTypeLabel}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm font-bold [direction:ltr] [unicode-bidi:embed]">
                  {formatNumber(qty)}
                </td>
              </tr>
            </tbody>
          </table>
          <div
            className={`flex flex-1 items-center gap-3 border-t border-slate-100 px-4 py-3 ${settings.isRtl ? "flex-row-reverse" : "flex-row"}`}
          >
            <Barcode value={customer?.billNumber} />
            <div className="text-xs text-slate-500 [direction:ltr] [unicode-bidi:embed]">
              {toEnglishDigits(customer?.phoneNumber)}
            </div>
          </div>
        </div>

        <div
          className={`${summaryOrderClass} ${summaryBorderClass} flex flex-col border-blue-200 bg-blue-50`}
        >
          <div
            className={`border-b border-blue-200 bg-blue-100 px-3 py-2 ${summaryHeadClass} ${alignClass}`}
          >
            {txt.financialSummary}
          </div>
          {moneyCells.map((cell, index) => (
            <div
              key={cell.label}
              className={`flex-1 px-3 py-2.5 ${alignClass} ${index < moneyCells.length - 1 ? "border-b border-blue-200" : ""}`}
            >
              <p className="mb-1 text-[10px] font-semibold text-slate-500">
                {cell.label}
              </p>
              <p
                className={`text-base font-extrabold [direction:ltr] [unicode-bidi:embed] ${cell.tone}`}
              >
                {cell.value}
              </p>
            </div>
          ))}
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
  const txt = settings.text;
  const extraTxt = BILL_EXTRA_TEXT[settings.langCode] || BILL_EXTRA_TEXT.en;
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
    const typeLabel = getOrderTypeLabel(typeKey, settings.langCode);
    const itemLabel =
      (typeCountTotals[typeKey] || 0) > 1
        ? `${typeLabel} ${typeIndex[typeKey]}`
        : typeLabel;
    const totalPrice = Number(order?.totalPrice || 0);
    return {
      order,
      index,
      typeKey,
      itemLabel,
      qty: Number(order?.quantity || 1),
      amount: totalPrice,
      boxName: order?.box?.boxName || extraTxt.notAssigned,
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

  return (
    <div
      lang={settings.htmlLang}
      dir={settings.dir}
      className="print-a6-sheet overflow-hidden rounded-[6px] border-2 border-slate-800 bg-white"
      style={{ fontFamily: settings.fontFamily }}
    >
      <PrintBillHeader
        settings={settings}
        title={txt.customerBill}
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

      <table className="w-full border-collapse table-fixed text-[9px] text-slate-800">
        <thead className="bg-slate-100">
          <tr>
            <th
              className={`w-[15%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
            >
              {txt.billNo}
            </th>
            <th
              className={`w-[12%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
            >
              {txt.customerName}
            </th>
            <th
              className={`w-[12%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} [direction:ltr]`}
            >
              {txt.phone}
            </th>
            <th
              className={`w-[12%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
            >
              {t("orders.orderType")}
            </th>
            <th
              className={`w-[6%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} [direction:ltr]`}
            >
              {txt.qty}
            </th>
            <th
              className={`w-[10%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
            >
              {extraTxt.box}
            </th>
            <th
              className={`w-[18%] border-b border-r border-slate-800 px-1.5 py-1 ${tableHeadClass} ${alignClass}`}
            >
              {t("createOrder.rakhtSelection", { defaultValue: "Rakht" })}
            </th>
            <th
              className={`w-[15%] border-b border-slate-800 px-1.5 py-1 ${tableHeadClass} [direction:ltr]`}
            >
              {extraTxt.itemPrice}
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
                  <div className="mt-1">
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
                  {customerName}
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
                      ? `${formatNumber(row.rakhtMeters)}m`
                      : "-"}
                  </p>
                </td>
                <td className="border-b border-slate-800 px-1.5 py-1 text-center align-top font-black text-slate-900 [direction:ltr] [unicode-bidi:embed]">
                  {formatMoney(row.amount, settings.langCode)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <table className="w-full border-collapse table-fixed text-[10px] text-slate-800">
        <thead className="bg-slate-100">
          <tr>
            <th
              className={`w-1/4 border-b border-r border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {extraTxt.totalAllClothes}
            </th>
            <th
              className={`w-1/4 border-b border-r border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {extraTxt.totalDiscountAllClothes}
            </th>
            <th
              className={`w-1/4 border-b border-r border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {extraTxt.totalPaidAllClothes}
            </th>
            <th
              className={`w-1/4 border-b border-slate-800 px-2 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {extraTxt.totalRemainingAllClothes}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white">
            <td className="border-r border-slate-800 px-2 py-2 text-center font-black text-blue-900 [direction:ltr] [unicode-bidi:embed]">
              {formatMoney(totals.total, settings.langCode)}
            </td>
            <td className="border-r border-slate-800 px-2 py-2 text-center font-black text-rose-800 [direction:ltr] [unicode-bidi:embed]">
              {formatMoney(totals.discount, settings.langCode)}
            </td>
            <td className="border-r border-slate-800 px-2 py-2 text-center font-black text-emerald-800 [direction:ltr] [unicode-bidi:embed]">
              {formatMoney(totals.paid, settings.langCode)}
            </td>
            <td
              className={`px-2 py-2 text-center font-black [direction:ltr] [unicode-bidi:embed] ${
                remaining > 0 ? "text-amber-800" : "text-emerald-800"
              }`}
            >
              {remaining > 0
                ? formatMoney(remaining, settings.langCode)
                : txt.paidInFull}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="border-t border-slate-800 bg-slate-50 px-2 py-1 text-[9px] text-slate-600">
        <div
          className={`flex items-center justify-between gap-2 ${rowDirClass}`}
        >
          <span>{SHOP_CONFIG.tagline || "-"}</span>
          <span className="[direction:ltr] [unicode-bidi:embed]">
            #{billNo}
          </span>
        </div>
      </div>
    </div>
  );
}
function getOrderedMeasurementRows(entries, t) {
  const order = [
    "height",
    "shoulder",
    "sleeve",
    "neck",
    "chest",
    "armpit",
    "waist",
    "skirt",
    "tenban",
    "pantLeg",
    "arm",
    "calf",
    "sorain",
    "patlonHeight",
    "kamerPatlon",
    "doroBaghlePatlon",
    "sorainPatlon",
    "patPatlon",
    "pachaPatlon",
  ];

  const map = new Map(entries.map((entry) => [entry[0], entry]));
  const sorted = [];

  order.forEach((key) => {
    const item = map.get(key);
    if (item) {
      sorted.push(item);
      map.delete(key);
    }
  });

  for (const item of map.values()) {
    sorted.push(item);
  }

  return sorted.map(([key, value]) => [formatFieldKey(key, t), value]);
}

function getOrderItemLabel(order, itemLabel, settings) {
  if (itemLabel?.trim()) return itemLabel.trim();
  if (order?.orderName?.trim()) return order.orderName.trim();
  return getOrderTypeLabel(order?.type, settings.langCode);
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
  const txt = settings.text;
  const dateValue = order?.createdAt || Date.now();
  const { date, time } = getPrintDateTime(settings, dateValue);
  const billLabel = getOrderItemLabel(order, itemLabel, settings);
  const customerBarcode = customer?.billNumber || "-";
  const orderBarcode =
    order?.id || `${customer?.billNumber || "0"}-${order?.type || "item"}`;
  const alignClass = settings.isRtl ? "text-right" : "text-left";
  const tableHeadClass = settings.isRtl
    ? "text-[10px] font-extrabold text-slate-700"
    : "text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-700";

  const allEntries = Object.entries(measurements || {}).filter(
    ([key, value]) =>
      !SKIP_FIELDS.has(key) &&
      value !== undefined &&
      value !== "" &&
      value !== null,
  );

  const numericEntries = allEntries.filter(([key]) => NUMERIC_FIELDS.has(key));
  const styleEntries = allEntries.filter(
    ([key, value]) => !NUMERIC_FIELDS.has(key) && value !== false,
  );
  const rakhtRows = [
    [
      t("rakht.brandName", { defaultValue: "Rakht Brand" }),
      order?.rakhtBrandName || "-",
    ],
    [
      t("rakht.color", { defaultValue: "Rakht Color" }),
      renderRakhtColorValue(order?.rakhtColor, order?.rakhtColorHex),
    ],
    [
      t("rakht.requiredMeters", { defaultValue: "Required Meters" }),
      order?.rakhtRequiredMeters != null
        ? formatMeasurementValue(order.rakhtRequiredMeters)
        : "-",
    ],
    [
      t("rakht.piecePrice", { defaultValue: "Piece Price" }),
      order?.rakhtPiecePrice != null
        ? formatMeasurementValue(order.rakhtPiecePrice)
        : "-",
    ],
  ];
  const rows = [
    ...getOrderedMeasurementRows(numericEntries, t),
    ...styleEntries.map(([key, value]) => [
      formatFieldKey(key, t),
      typeof value === "boolean" ? txt.yes : toEnglishDigits(value),
    ]),
    ...rakhtRows,
  ];

  return (
    <div
      lang={settings.htmlLang}
      dir={settings.dir}
      className="print-a6-sheet overflow-hidden rounded-[4px] border-2 border-slate-800 bg-white"
      style={{ fontFamily: settings.fontFamily }}
    >
      <PrintBillHeader
        settings={settings}
        title={txt.tailorCopy}
        date={date}
        time={time}
      />

      <div className="grid grid-cols-3 bg-slate-100 text-[11px] font-semibold text-slate-800">
        <div
          className={`border-b border-r border-slate-800 px-2.5 py-2 ${alignClass}`}
        >
          <span className="font-extrabold">{txt.billNo}</span>: #
          {toEnglishDigits(customer?.billNumber)}
        </div>
        <div
          className={`border-b border-r border-slate-800 px-2.5 py-2 ${alignClass}`}
        >
          <span className="font-extrabold">{txt.customerName}</span>:{" "}
          {customer?.firstName || "-"}
        </div>
        <div className={`border-b border-slate-800 px-2.5 py-2 ${alignClass}`}>
          <span className="font-extrabold">{t("orders.orderType")}</span>:{" "}
          {billLabel}
        </div>
      </div>

      <table className="w-full border-collapse table-fixed text-[11px]">
        <thead className="bg-slate-100">
          <tr>
            <th
              className={`border-b border-r border-slate-800 px-2.5 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {t("createOrder.measurements")}
            </th>
            <th
              className={`border-b border-slate-800 px-2.5 py-1.5 ${tableHeadClass} ${alignClass}`}
            >
              {t("createOrder.styleOptions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {(rows.length ? rows : [[t("common.noData"), "-"]]).map(
            ([label, value], index) => (
              <tr key={`${label}-${index}`}>
                <td
                  className={`border-b border-r border-dashed border-slate-500 px-2.5 py-1.5 align-middle ${alignClass}`}
                >
                  {label}
                </td>
                <td
                  className={`border-b border-dashed border-slate-500 px-2.5 py-1.5 align-middle font-bold ${alignClass}`}
                >
                  {value}
                </td>
              </tr>
            ),
          )}
          <tr>
            <td
              colSpan={2}
              className={`border-b border-dashed border-slate-500 px-2.5 py-1.5 align-top ${alignClass} min-h-[110px]`}
            >
              {order?.orderName?.trim() || "-"}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-2">
        <div className="border-r border-b border-slate-800 px-2.5 py-2">
          <div className="max-w-[180px]">
            <Barcode value={customerBarcode} />
          </div>
        </div>
        <div className="border-b border-slate-800 px-2.5 py-2">
          <div className="max-w-[180px]">
            <Barcode value={orderBarcode} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 bg-slate-100 text-[11px] text-slate-800">
        <div
          className={`border-r border-slate-800 px-2.5 py-1.5 ${alignClass}`}
        >
          <span className="font-extrabold">{txt.date}</span>: {date}
        </div>
        <div className={`px-2.5 py-1.5 ${alignClass}`}>
          <span className="font-extrabold">{txt.qty}</span>:{" "}
          {formatNumber(order?.quantity || 1)} | {time}
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
  const isRtl = dir === "rtl";
  const bodyFont = isRtl
    ? "'Noto Naskh Arabic','Noto Sans Arabic','Inter',sans-serif"
    : "'Inter','Noto Sans Arabic',sans-serif";

  const styleNodes = Array.from(
    document.querySelectorAll("link[rel='stylesheet'], style"),
  )
    .map((node) => node.outerHTML)
    .join("\n");

  printWindow.document.write(`
    <html lang="${lang}" dir="${dir}">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;600;700&family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
        ${styleNodes}
        <style>
          *{box-sizing:border-box}
          @page{size:A6 portrait;margin:0}
          body{
            margin:0;
            font-family:${bodyFont};
            line-height:1.45;
            background:#fff;
            padding:4mm;
            color:#0f172a;
            direction:${dir};
            text-align:${isRtl ? "right" : "left"};
            -webkit-print-color-adjust:exact;
            print-color-adjust:exact;
          }
          .print-a6-sheet{max-width:100%;margin:0 auto}
          @media print{body{padding:4mm}}
        </style>
      </head>
      <body dir="${dir}">
        ${element.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();

  const printNow = () => {
    printWindow.print();
    printWindow.close();
  };

  const fontsReady = printWindow.document.fonts?.ready;
  if (fontsReady && typeof fontsReady.then === "function") {
    fontsReady
      .then(() => setTimeout(printNow, 180))
      .catch(() => setTimeout(printNow, 350));
  } else {
    setTimeout(printNow, 350);
  }
  return true;
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
    <div className="print-detail-field">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}
        >
          {label}
        </span>
        {Icon && <Icon size={15} style={{ color: "#0F6CBD" }} />}
      </div>
      <div className="print-detail-value">{value || "-"}</div>
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
  const orderTypeLabel = getOrderTypeLabel(order?.type, settings.langCode);
  const txt = settings.text;

  return (
    <div className="order-doc-pack">
      <div className="order-doc-summary">
        <div className="order-doc-hero">
          <div>
            <span className="order-doc-hero-badge">
              {t("orders.professionalPrintPack")}
            </span>
            <h3
              style={{
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.15,
                marginTop: 10,
              }}
            >
              {t("orders.orderDocuments")}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,.84)",
                maxWidth: 520,
                marginTop: 8,
              }}
            >
              {t("orders.printPackCopy")}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)" }}>
              {t("orders.billNumber")}
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                lineHeight: 1,
                direction: "ltr",
                unicodeBidi: "embed",
              }}
            >
              #{toEnglishDigits(customer?.billNumber)}
            </div>
          </div>
        </div>

        <div className="order-doc-grid">
          <DetailField
            label={t("common.phone", "Phone")}
            value={toEnglishDigits(customer?.phoneNumber)}
            Icon={LuPhone}
          />
          <DetailField
            label={t("orders.orderType")}
            value={orderTypeLabel}
            Icon={LuReceipt}
          />
          <DetailField
            label={t("common.status", "Status")}
            value={order?.isCompleted ? t("orders.done") : t("orders.pending")}
            Icon={LuFileText}
          />
        </div>
      </div>

      <div className="order-doc-actions">
        <div className="order-doc-action-card">
          <div>
            <p className="order-doc-action-title">{txt.printBillForCustomer}</p>
            <p className="order-doc-action-copy">{txt.customerBillCopy}</p>
          </div>
          <div className="order-doc-action-row">
            <button
              type="button"
              className="print-center-btn"
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
              className="print-center-side-btn"
              onClick={() =>
                exportPdf(
                  customerId,
                  `bill-${customer?.billNumber}-${order?.id}-customer.pdf`,
                )
              }
            >
              <LuDownload size={15} />
              <span>PDF</span>
            </button>
          </div>
        </div>

        <div className="order-doc-action-card">
          <div>
            <p className="order-doc-action-title">{txt.printBillForTailor}</p>
            <p className="order-doc-action-copy">{txt.tailorBillCopy}</p>
          </div>
          <div className="order-doc-action-row">
            <button
              type="button"
              className="print-center-btn"
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
              className="print-center-side-btn"
              onClick={() =>
                exportPdf(
                  tailorId,
                  `bill-${customer?.billNumber}-${order?.id}-tailor.pdf`,
                )
              }
            >
              <LuDownload size={15} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="order-doc-preview-grid">
        <div id={customerId}>
          <CustomerBill customer={customer} order={order} />
        </div>
        <div id={tailorId}>
          <TailorBill
            customer={customer}
            order={order}
            measurements={measurements}
          />
        </div>
      </div>
    </div>
  );
}
