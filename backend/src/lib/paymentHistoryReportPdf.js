import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  formatReportLabelValue,
  formatReportDateTime,
  formatReportNumber,
  isRtlReportLanguage,
  normalizeReportLanguage,
} from "./reportLocale.js";
import { loadArabicFont, drawArabicTextSync } from "./arabicRenderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARABIC_SCRIPT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const TABLE_X = 40;
const TABLE_W = 760;
const ROW_H = 24;
const FOOTER_MARGIN = 56;

const COL = {
  num: { x: 40, w: 24 },
  company: { x: 64, w: 150 },
  total: { x: 214, w: 92, align: "right" },
  paid: { x: 306, w: 92, align: "right" },
  remaining: { x: 398, w: 95, align: "right" },
  status: { x: 493, w: 84 },
  paidAt: { x: 577, w: 128 },
  user: { x: 705, w: 95 },
};

const TEXT = {
  en: {
    title: "Payment History Report",
    generatedAt: "Generated at",
    filters: "Filters",
    activeFilters: "Active filters",
    totalPaid: "Total paid",
    totalRemaining: "Total remaining",
    records: "records",
    noRecords: "No payment history found for the selected filters.",
    continued: "continued",
    footer: "Tailor System - Payment History Report",
    columns: {
      num: "#",
      company: "Company",
      total: "Total",
      paid: "Paid",
      remaining: "Remaining",
      status: "Status",
      paidAt: "Date & Time",
      user: "User",
    },
    statuses: {
      PAID: "Paid",
      PARTIAL: "Partial",
      REMAINING: "Remaining",
    },
  },
  dari: {
    title: "گزارش تاریخچه پرداخت",
    generatedAt: "زمان تولید",
    filters: "فیلترها",
    activeFilters: "تعداد فیلتر فعال",
    totalPaid: "مجموع پرداخت",
    totalRemaining: "مجموع باقی‌مانده",
    records: "رکورد",
    noRecords: "برای فیلترهای انتخاب‌شده تاریخچه پرداختی یافت نشد.",
    continued: "ادامه",
    footer: "سیستم خیاطی - گزارش تاریخچه پرداخت",
    columns: {
      num: "#",
      company: "شرکت",
      total: "مجموع",
      paid: "پرداخت",
      remaining: "باقی‌مانده",
      status: "وضعیت",
      paidAt: "تاریخ و زمان",
      user: "کاربر",
    },
    statuses: {
      PAID: "پرداخت‌شده",
      PARTIAL: "نیمه‌پرداخت",
      REMAINING: "باقی‌مانده",
    },
  },
  pashto: {
    title: "د ورکړې تاریخچې راپور",
    generatedAt: "د جوړېدو وخت",
    filters: "فلټرونه",
    activeFilters: "فعاله فلټرونه",
    totalPaid: "ټوله ورکړه",
    totalRemaining: "ټول پاتې",
    records: "ریکارډ",
    noRecords: "د ټاکل شوو فلټرونو لپاره د ورکړې تاریخچه ونه موندل شوه.",
    continued: "دوام",
    footer: "خیاتي سیستم - د ورکړې تاریخچې راپور",
    columns: {
      num: "#",
      company: "شرکت",
      total: "ټول",
      paid: "ورکړه",
      remaining: "پاتې",
      status: "حالت",
      paidAt: "نېټه او وخت",
      user: "کارن",
    },
    statuses: {
      PAID: "ورکړل شوی",
      PARTIAL: "نیمه ورکړه",
      REMAINING: "پاتې",
    },
  },
};

function hasArabicScript(value) {
  return ARABIC_SCRIPT_REGEX.test(String(value || ""));
}

function rtlAwareAlign(isRtl, fallback = "left") {
  return isRtl ? "right" : fallback;
}

function resolveArabicFontPath() {
  const candidates = [
    process.env.PDF_REPORT_FONT_PATH,
    process.env.PDF_DARI_PASHTO_FONT_PATH,
    process.env.PDF_BAHIJ_FONT_PATH,
    process.env.PDF_VAZIRMATN_FONT_PATH,
    process.env.PDF_ARABIC_FONT_PATH,
    path.join(__dirname, "../fonts/Vazirmatn-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNaskhArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoSansArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNastaliqUrdu-Regular.ttf"),
    "C:/Windows/Fonts/bahij.ttf",
    "C:/Windows/Fonts/bahij-zar.ttf",
    "C:/Windows/Fonts/Bahij_Zar.ttf",
    "C:/Windows/Fonts/Bahij Zar.ttf",
    path.join(__dirname, "../fonts/Bahij_Zar.ttf"),
    path.join(__dirname, "../fonts/Bahij-Zar.ttf"),
    path.join(__dirname, "../fonts/BahijZar.ttf"),
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/aldhabi.ttf",
    "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function mirrorColumns(columns, tableX, tableWidth) {
  return Object.fromEntries(
    Object.entries(columns).map(([key, col]) => [
      key,
      { ...col, x: tableX + tableWidth - (col.x - tableX) - col.w },
    ]),
  );
}

function tokenWidth(doc, token, fkFont, fontSize = 10) {
  const text = String(token ?? "");
  if (!text) return 0;

  if (fkFont && hasArabicScript(text)) {
    const scale = fontSize / fkFont.unitsPerEm;
    const run = fkFont.layout(text, [], "arab", "dflt", "rtl");
    return run.positions.reduce((sum, pos) => sum + pos.xAdvance * scale, 0);
  }

  return doc.font("Helvetica").fontSize(fontSize).widthOfString(text);
}

function drawRtlMixedValue(doc, value, x, y, width, fkFont, fontSize = 10) {
  const text = String(value ?? "");
  if (!text) return;

  const tokens = text.match(/(\d[\d,./:-]*|\s+|[^\d\s]+)/g) || [text];
  let cursor = x + width;

  tokens.forEach((token) => {
    const segment = String(token ?? "");
    if (!segment) return;
    const w = tokenWidth(doc, segment, fkFont, fontSize);
    const startX = cursor - w;

    if (!segment.trim()) {
      cursor = startX;
      return;
    }

    if (/^\d[\d,./:-]*$/.test(segment)) {
      doc
        .font("Helvetica")
        .fontSize(fontSize)
        .fillColor("#0F172A")
        .text(segment, startX, y + 1.2, {
          width: Math.max(w + 1, 1),
          align: "left",
          lineBreak: false,
        });
    } else {
      wt(
        doc,
        segment,
        startX,
        y,
        { width: Math.max(w + 1, 1), align: "left", lineBreak: false },
        fkFont,
        "#0F172A",
        false,
        fontSize,
      );
    }

    cursor = startX;
  });
}

function drawHeaderMetaLine(
  doc,
  { label, value, x, y, width, isRtl, fkFont, fontSize = 10 },
) {
  const safeLabel = String(label || "");
  const safeValue = String(value ?? "-");

  if (isRtl) {
    const sep = "،";
    const labelW = Math.min(
      Math.max(tokenWidth(doc, safeLabel, fkFont, fontSize) + 12, 86),
      Math.min(230, width * 0.45),
    );
    const sepW = Math.max(tokenWidth(doc, sep, fkFont, fontSize) + 6, 10);
    const valueW = Math.max(width - labelW - sepW - 6, 40);
    const rightX = x + width;
    const labelX = rightX - labelW;
    const sepX = labelX - sepW;

    wt(
      doc,
      safeLabel,
      labelX,
      y,
      { width: labelW, align: "right", lineBreak: false },
      fkFont,
      "#475569",
      false,
      fontSize,
    );
    wt(
      doc,
      sep,
      sepX,
      y,
      { width: sepW, align: "center", lineBreak: false },
      fkFont,
      "#475569",
      false,
      fontSize,
    );
    drawRtlMixedValue(doc, safeValue, x, y, valueW, fkFont, fontSize);
    return;
  }

  wt(
    doc,
    formatReportLabelValue(safeLabel, safeValue, "en", ":"),
    x,
    y,
    { width, align: "left", lineBreak: false },
    fkFont,
    "#475569",
    false,
    fontSize,
  );
}

function wt(
  doc,
  text,
  x,
  y,
  opts,
  fkFont,
  fillColor,
  bold = false,
  fontSize = 10,
) {
  const safe = String(text ?? "");
  if (fkFont && hasArabicScript(safe)) {
    drawArabicTextSync(
      doc,
      safe,
      x,
      y,
      { ...opts, fontSize },
      fkFont,
      fillColor || "#000000",
    );
    return;
  }
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(fontSize)
    .fillColor(fillColor || "#0F172A")
    .text(safe, x, y, opts);
}

function formatMoney(value, language) {
  const formatted = formatReportNumber(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const normalized = normalizeReportLanguage(language);
  const isRtl = normalized === "dari" || normalized === "pashto";

  // Wrap entire currency string in LTR marks for RTL languages to keep minus sign on left
  return isRtl ? `\u200E${formatted} AF` : `${formatted} AF`;
}

function resolveStatus(row, labels) {
  const remaining = Number(row?.remainingAfter || 0);
  const paid = Number(row?.totalPaidAfter || 0);
  if (remaining <= 0) return { key: "PAID", color: "#15803D" };
  if (paid > 0) return { key: "PARTIAL", color: "#B45309" };
  return { key: "REMAINING", color: "#DC2626" };
}

function drawHeaderRow(doc, y, labels, fkFont, isRtl, colMap) {
  doc.save();
  doc.roundedRect(TABLE_X, y, TABLE_W, ROW_H, 3).fill("#1E293B");
  doc.restore();

  const headerMap = {
    num: labels.columns.num,
    company: labels.columns.company,
    total: labels.columns.total,
    paid: labels.columns.paid,
    remaining: labels.columns.remaining,
    status: labels.columns.status,
    paidAt: labels.columns.paidAt,
    user: labels.columns.user,
  };

  Object.entries(headerMap).forEach(([key, label]) => {
    const c = colMap[key];
    wt(
      doc,
      label,
      c.x,
      y + 7,
      { width: c.w, align: rtlAwareAlign(isRtl, c.align || "left") },
      fkFont,
      "#FFFFFF",
      true,
      9.5,
    );
  });

  return y + ROW_H;
}

export async function buildPaymentHistoryReportPdf({
  rows = [],
  summary = {},
  filters = {},
  language = "en",
} = {}) {
  const normalizedLanguage = normalizeReportLanguage(language);
  const labels = TEXT[normalizedLanguage] || TEXT.en;
  const isRtl = isRtlReportLanguage(normalizedLanguage);
  const colMap = isRtl ? mirrorColumns(COL, TABLE_X, TABLE_W) : COL;

  let fkFont = null;
  if (isRtl) {
    const fontPath = resolveArabicFontPath();
    if (fontPath) {
      try {
        fkFont = await loadArabicFont(fontPath);
      } catch {
        fkFont = null;
      }
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
      info: {
        Title: labels.title,
        Author: "Tailor System",
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const safeRows = Array.isArray(rows) ? rows : [];
    const activeFilters = Number(filters.activeFilterCount || 0);

    wt(
      doc,
      labels.title,
      40,
      36,
      { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#0F172A",
      true,
      19,
    );
    const activeFiltersLine = [
      formatReportLabelValue(
        labels.activeFilters,
        formatReportNumber(activeFilters, normalizedLanguage),
        normalizedLanguage,
      ),
      formatReportLabelValue(
        labels.records,
        formatReportNumber(safeRows.length, normalizedLanguage),
        normalizedLanguage,
      ),
    ].join(" | ");
    const totalPaidLine = [
      formatReportLabelValue(
        labels.totalPaid,
        formatMoney(summary.totalPaid || 0, normalizedLanguage),
        normalizedLanguage,
      ),
      formatReportLabelValue(
        labels.totalRemaining,
        formatMoney(summary.totalRemaining || 0, normalizedLanguage),
        normalizedLanguage,
      ),
    ].join(" | ");
    drawHeaderMetaLine(doc, {
      label: labels.generatedAt,
      value: formatReportDateTime(new Date(), normalizedLanguage),
      x: 40,
      y: 60,
      width: pageW - 80,
      isRtl,
      fkFont,
      fontSize: 10,
    });
    wt(
      doc,
      activeFiltersLine,
      40,
      76,
      { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#334155",
      false,
      10,
    );
    wt(
      doc,
      totalPaidLine,
      40,
      92,
      { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#0F172A",
      true,
      10,
    );

    let y = 118;
    y = drawHeaderRow(doc, y, labels, fkFont, isRtl, colMap);
    const footerThreshold = doc.page.height - FOOTER_MARGIN;

    if (safeRows.length === 0) {
      wt(
        doc,
        labels.noRecords,
        44,
        y + 8,
        { width: TABLE_W - 8, align: rtlAwareAlign(isRtl, "left") },
        fkFont,
        "#64748B",
        false,
        10,
      );
    } else {
      safeRows.forEach((row, index) => {
        if (y + ROW_H > footerThreshold) {
          doc.addPage();
          y = 40;
          wt(
            doc,
            `${labels.title} (${labels.continued})`,
            40,
            y,
            { width: TABLE_W, align: rtlAwareAlign(isRtl, "left") },
            fkFont,
            "#0F172A",
            true,
            11,
          );
          y = drawHeaderRow(doc, y + 16, labels, fkFont, isRtl, colMap);
        }

        if (index % 2 === 0) {
          doc.save();
          doc.rect(TABLE_X, y, TABLE_W, ROW_H).fill("#F8FAFC");
          doc.restore();
        }

        const status = resolveStatus(row, labels);
        const statusLabel = labels.statuses[status.key] || status.key;

        doc.font("Helvetica").fontSize(9.5).fillColor("#0F172A");
        doc.text(String(index + 1), colMap.num.x, y + 6, {
          width: colMap.num.w,
          align: rtlAwareAlign(isRtl, "left"),
        });
        doc.text(
          formatMoney(row.totalPriceAfter, normalizedLanguage),
          colMap.total.x,
          y + 6,
          {
            width: colMap.total.w,
            align: "right",
          },
        );
        doc.text(
          formatMoney(row.paidAmount, normalizedLanguage),
          colMap.paid.x,
          y + 6,
          {
            width: colMap.paid.w,
            align: "right",
          },
        );
        doc.fillColor(status.key === "PAID" ? "#15803D" : "#DC2626");
        doc.text(
          formatMoney(row.remainingAfter, normalizedLanguage),
          colMap.remaining.x,
          y + 6,
          {
            width: colMap.remaining.w,
            align: "right",
          },
        );

        wt(
          doc,
          row.companyName || "-",
          colMap.company.x,
          y + 6,
          { width: colMap.company.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          9.5,
        );
        wt(
          doc,
          statusLabel,
          colMap.status.x,
          y + 6,
          { width: colMap.status.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          status.color,
          true,
          9.5,
        );
        if (isRtl) {
          drawRtlMixedValue(
            doc,
            formatReportDateTime(row.paidAt, normalizedLanguage),
            colMap.paidAt.x,
            y + 6,
            colMap.paidAt.w,
            fkFont,
            9.5,
          );
        } else {
          wt(
            doc,
            formatReportDateTime(row.paidAt, normalizedLanguage),
            colMap.paidAt.x,
            y + 6,
            { width: colMap.paidAt.w, align: "left" },
            fkFont,
            "#0F172A",
            false,
            9.5,
          );
        }
        wt(
          doc,
          row.paidBy?.name || "-",
          colMap.user.x,
          y + 6,
          { width: colMap.user.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          9.5,
        );

        y += ROW_H;
      });
    }

    wt(
      doc,
      labels.footer,
      TABLE_X,
      doc.page.height - 26,
      { width: TABLE_W, align: isRtl ? "right" : "center" },
      fkFont,
      "#94A3B8",
      false,
      8,
    );

    doc.end();
  });
}
