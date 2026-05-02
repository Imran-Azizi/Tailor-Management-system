import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  formatReportDateTime,
  formatReportNumber,
  getReportLocaleTag,
  normalizeReportLanguage,
  isRtlReportLanguage,
  resolveReportText,
} from "./reportLocale.js";
import { loadArabicFont, drawArabicTextSync } from "./arabicRenderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ARABIC_SCRIPT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function hasArabicScript(value) {
  return ARABIC_SCRIPT_REGEX.test(String(value || ""));
}

// ─── Font resolution ─────────────────────────────────────────────────────────
// Returns the best available font path for Arabic/Dari/Pashto
// Priority: bundled NotoNaskhArabic / Segoe UI / Tahoma → Linux paths → Aldhabi fallback
function resolveArabicFontPath() {
  const candidates = [
    process.env.PDF_REPORT_FONT_PATH,
    process.env.PDF_DARI_PASHTO_FONT_PATH,
    process.env.PDF_BAHIJ_FONT_PATH,
    process.env.PDF_VAZIRMATN_FONT_PATH,
    process.env.PDF_ARABIC_FONT_PATH,
    // Bahij family (if installed locally)
    "C:/Windows/Fonts/bahij.ttf",
    "C:/Windows/Fonts/bahij-zar.ttf",
    "C:/Windows/Fonts/Bahij_Zar.ttf",
    "C:/Windows/Fonts/Bahij Zar.ttf",
    // Preferred bundled fonts (drop TTF files into backend/src/fonts/)
    path.join(__dirname, "../fonts/Bahij_Zar.ttf"),
    path.join(__dirname, "../fonts/Bahij-Zar.ttf"),
    path.join(__dirname, "../fonts/BahijZar.ttf"),
    path.join(__dirname, "../fonts/Vazirmatn-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoSansArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNastaliqUrdu-Regular.ttf"),
    // Bundled fallback (works on any OS including Railway)
    path.join(__dirname, "../fonts/NotoNaskhArabic-Regular.ttf"),
    // Windows clean UI-first fallbacks
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
    "C:/Windows/Fonts/arial.ttf",
    // Aldhabi is kept as a last-resort fallback (decorative)
    "C:/Windows/Fonts/aldhabi.ttf",
    // Linux
    "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ].filter(Boolean);

  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

// ─── Write text (auto-selects Arabic renderer vs Helvetica) ──────────────────
// fkFont: pre-loaded fontkit font object (only for RTL mode), or null for EN
// fillColor: hex color string for the current text
// bold: whether to use bold weight (Helvetica-Bold for EN; ignored for Arabic paths)
// fontSize: current font size in points
function wt(
  doc,
  rawText,
  x,
  y,
  opts,
  fkFont,
  fillColor,
  bold = false,
  fontSize = 10,
) {
  const text = String(rawText ?? "");
  if (fkFont && hasArabicScript(text)) {
    drawArabicTextSync(
      doc,
      text,
      x,
      y,
      { ...opts, fontSize },
      fkFont,
      fillColor || "#000000",
    );
  } else {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").text(text, x, y, opts);
  }
}

function fmt(value, language) {
  return formatReportNumber(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthName(n, language = "en") {
  const locale = getReportLocaleTag(language);
  const month = Number(n);
  if (!Number.isFinite(month) || month < 1 || month > 12) return String(n);
  try {
    return new Intl.DateTimeFormat(locale, { month: "long" }).format(
      new Date(2026, month - 1, 1),
    );
  } catch {
    return MONTH_NAMES[(month - 1) % 12] || String(n);
  }
}

function orderTypeLabel(type, language = "en") {
  const normalized = normalizeReportLanguage(language);
  const map = {
    en: {
      OUTFIT: "Outfit",
      WASKAT: "Waskat",
      KORTY: "Korty",
      YAKHANQAQ: "YakhanQaq",
    },
    dari: {
      OUTFIT: "لباس",
      WASKAT: "واسکت",
      KORTY: "کرتی",
      YAKHANQAQ: "یخن قاق",
    },
    pashto: {
      OUTFIT: "لباس",
      WASKAT: "واسکټ",
      KORTY: "کورټی",
      YAKHANQAQ: "یخن قاق",
    },
  };
  return map[normalized]?.[type] || map.en[type] || type;
}

// ─── Column layout ────────────────────────────────────────────────────────────
// #   Bill   Customer   Type   Qty   Total     Discount  Paid      Remaining  Status
const COL = {
  num: { x: 40, w: 22 },
  bill: { x: 62, w: 36 },
  customer: { x: 98, w: 100 },
  type: { x: 198, w: 64 },
  qty: { x: 262, w: 26 },
  total: { x: 288, w: 64, align: "right" },
  discount: { x: 352, w: 56, align: "right" },
  paid: { x: 408, w: 62, align: "right" },
  remaining: { x: 470, w: 62, align: "right" },
  status: { x: 532, w: 43 },
};

const TABLE_X = 40;
const TABLE_W = 555;
const ROW_H = 26;
const FOOTER_THRESHOLD_MARGIN = 56;

function rtlAwareAlign(isRtl, fallback = "left") {
  return isRtl ? "right" : fallback;
}

function mirrorColumns(columns, tableX, tableWidth) {
  return Object.fromEntries(
    Object.entries(columns).map(([key, col]) => [
      key,
      {
        ...col,
        x: tableX + tableWidth - (col.x - tableX) - col.w,
      },
    ]),
  );
}

const COL_RTL = mirrorColumns(COL, TABLE_X, TABLE_W);

function drawTableHeader(doc, y, labels, fkFont, isRtl, colMap) {
  doc.save();
  doc.roundedRect(TABLE_X, y, TABLE_W, ROW_H, 3).fill("#1E293B");
  doc.restore();

  Object.entries({
    num: labels.columns.num,
    bill: labels.columns.bill,
    customer: labels.columns.customer,
    type: labels.columns.type,
    qty: labels.columns.qty,
    total: labels.columns.total,
    discount: labels.columns.discount,
    paid: labels.columns.paid,
    remaining: labels.columns.remaining,
    status: labels.columns.status,
  }).forEach(([key, label]) => {
    const c = colMap[key];
    wt(
      doc,
      label,
      c.x,
      y + 6,
      { width: c.w, align: rtlAwareAlign(isRtl, c.align || "left") },
      fkFont,
      "#FFFFFF",
      true,
      10,
    );
  });

  return y + ROW_H;
}

function drawRow(doc, y, index, order, fkFont, language, labels, isRtl, colMap) {
  if (index % 2 === 0) {
    doc.save();
    doc.rect(TABLE_X, y, TABLE_W, ROW_H).fill("#F8FAFC");
    doc.restore();
  }

  const c = colMap;

  // Numeric columns — always ASCII, plain Helvetica
  doc.font("Helvetica").fontSize(9.5).fillColor("#0F172A");
  doc.text(String(index + 1), c.num.x, y + 6, {
    width: c.num.w,
    align: rtlAwareAlign(isRtl, "left"),
  });
  doc.text(String(order.customer?.billNumber ?? "-"), c.bill.x, y + 6, {
    width: c.bill.w,
    align: rtlAwareAlign(isRtl, "left"),
  });
  doc.text(String(order.quantity ?? 1), c.qty.x, y + 6, {
    width: c.qty.w,
    align: rtlAwareAlign(isRtl, "left"),
  });
  doc.text(fmt(order.totalPrice, language), c.total.x, y + 6, {
    width: c.total.w,
    align: "right",
  });
  doc.text(fmt(order.discount, language), c.discount.x, y + 6, {
    width: c.discount.w,
    align: "right",
  });
  doc.text(fmt(order.paidAmount, language), c.paid.x, y + 6, {
    width: c.paid.w,
    align: "right",
  });

  const rem = Number(order.remaining ?? 0);
  doc.fillColor(rem > 0 ? "#DC2626" : "#16A34A");
  doc.text(fmt(rem, language), c.remaining.x, y + 6, {
    width: c.remaining.w,
    align: "right",
  });

  // Arabic-aware columns
  wt(
    doc,
    order.customer?.firstName || "-",
    c.customer.x,
    y + 6,
    { width: c.customer.w, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#0F172A",
    false,
    10,
  );
  wt(
    doc,
    order.orderDisplayName || orderTypeLabel(order.type, language),
    c.type.x,
    y + 6,
    { width: c.type.w, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#0F172A",
    false,
    10,
  );

  const statusLabel = order.isCompleted
    ? labels.statusDone
    : labels.statusPending;
  const statusColor = order.isCompleted ? "#16A34A" : "#D97706";
  wt(
    doc,
    statusLabel,
    c.status.x,
    y + 7,
    { width: c.status.w, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    statusColor,
    true,
    9,
  );

  return y + ROW_H;
}

function summaryRow(
  doc,
  label,
  value,
  y,
  fkFont,
  isRtl,
  valueColor = "#0F172A",
) {
  wt(
    doc,
    label,
    40,
    y,
    { width: 220, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#475569",
    false,
    11.5,
  );
  // Value is always numbers/ASCII — no shaping needed
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor(valueColor)
    .text(value, 260, y, { width: 335, align: rtlAwareAlign(isRtl, "left") });
  return y + 16;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function buildMonthlyReportPdf({
  month,
  year,
  orders,
  language = "en",
}) {
  const labels = resolveReportText(language).monthly;
  const isRtl = isRtlReportLanguage(language);

  // Pre-load the Arabic fontkit font for glyph-path rendering
  let fkFont = null;
  if (isRtl) {
    try {
      const fontPath = resolveArabicFontPath();
      if (!fontPath) throw new Error("No Arabic font found");
      fkFont = await loadArabicFont(fontPath);
      console.info(`[PDF] Monthly RTL font: ${fontPath}`);
    } catch (err) {
      console.error("[PDF] Arabic font load failed:", err.message);
      fkFont = null;
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
      info: {
        Title: `${labels.title} - ${monthName(month, language)} ${year}`,
        Author: "Tailor System",
      },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const safeOrders = Array.isArray(orders) ? orders : [];

    // ── Totals ──────────────────────────────────────────────────────────────
    const totalRevenue = safeOrders.reduce(
      (s, o) => s + (o.totalPrice || 0),
      0,
    );
    const totalDiscount = safeOrders.reduce((s, o) => s + (o.discount || 0), 0);
    const totalPaid = safeOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
    const totalRemaining = safeOrders.reduce(
      (s, o) => s + (o.remaining || 0),
      0,
    );
    const completedCount = safeOrders.filter((o) => o.isCompleted).length;
    const pendingCount = safeOrders.length - completedCount;

    // ── Header ───────────────────────────────────────────────────────────────
    const pageW = doc.page.width;

    doc.rect(0, 0, pageW, 64).fill("#0F172A");

    wt(
      doc,
      `${labels.title} — ${monthName(month, language)} ${year}`,
      40,
      18,
      { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#FFFFFF",
      true,
      20,
    );

    wt(
      doc,
      `${labels.generatedAt}: ${formatReportDateTime(new Date(), language)}   |   ${labels.totalOrders}: ${formatReportNumber(safeOrders.length, language)}`,
      40,
      42,
      { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#94A3B8",
      false,
      9,
    );

    // ── Summary ───────────────────────────────────────────────────────────────
    let y = 80;

    wt(
      doc,
      labels.summary,
      40,
      y,
      { width: 555, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#0F172A",
      true,
      12,
    );

    y += 14;
    y = summaryRow(
      doc,
      labels.totalOrders,
      formatReportNumber(safeOrders.length, language),
      y,
      fkFont,
      isRtl,
    );
    y = summaryRow(
      doc,
      labels.completedPending,
      `${formatReportNumber(completedCount, language)} / ${formatReportNumber(pendingCount, language)}`,
      y,
      fkFont,
      isRtl,
    );
    y = summaryRow(
      doc,
      labels.grossRevenue,
      `${fmt(totalRevenue, language)} AF`,
      y,
      fkFont,
      isRtl,
    );
    y = summaryRow(
      doc,
      labels.totalDiscounts,
      `${fmt(totalDiscount, language)} AF`,
      y,
      fkFont,
      isRtl,
    );
    y = summaryRow(
      doc,
      labels.totalPaid,
      `${fmt(totalPaid, language)} AF`,
      y,
      fkFont,
      isRtl,
      "#16A34A",
    );
    y = summaryRow(
      doc,
      labels.totalRemaining,
      `${fmt(totalRemaining, language)} AF`,
      y,
      fkFont,
      isRtl,
      totalRemaining > 0 ? "#DC2626" : "#16A34A",
    );

    // ── Divider ───────────────────────────────────────────────────────────────
    y += 10;
    doc
      .moveTo(40, y)
      .lineTo(pageW - TABLE_X, y)
      .lineWidth(1)
      .strokeColor("#E2E8F0")
      .stroke();
    y += 12;

    wt(
      doc,
      labels.orderRecords,
      40,
      y,
      { width: 555, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#0F172A",
      true,
      12.5,
    );
    y += 14;

    // ── Table ─────────────────────────────────────────────────────────────────
    if (safeOrders.length === 0) {
      wt(
        doc,
        labels.noOrders,
        40,
        y + 8,
        { width: 555, align: rtlAwareAlign(isRtl, "left") },
        fkFont,
        "#64748B",
        false,
        11,
      );
    } else {
      const colMap = isRtl ? COL_RTL : COL;
      y = drawTableHeader(doc, y, labels, fkFont, isRtl, colMap);

      const footerThreshold = doc.page.height - FOOTER_THRESHOLD_MARGIN;

      safeOrders.forEach((order, index) => {
        if (y + ROW_H > footerThreshold) {
          doc.addPage();
          y = 40;
          wt(
            doc,
            `${labels.title} — ${monthName(month, language)} ${year} (${labels.continued})`,
            40,
            y,
            { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
            fkFont,
            "#0F172A",
            true,
            10,
          );
          y += 18;
          y = drawTableHeader(doc, y, labels, fkFont, isRtl, colMap);
        }
        y = drawRow(
          doc,
          y,
          index,
          order,
          fkFont,
          language,
          labels,
          isRtl,
          colMap,
        );
      });

      // ── Totals row ──────────────────────────────────────────────────────────
      y += 4;
      doc.save();
      doc.roundedRect(TABLE_X, y, TABLE_W, ROW_H + 2, 3).fill("#1E293B");
      doc.restore();

      wt(
        doc,
        labels.totals,
        colMap.customer.x,
        y + 7,
        { width: 100, align: rtlAwareAlign(isRtl, "left") },
        fkFont,
        "#FFFFFF",
        true,
        9.5,
      );
      // Totals values are numbers — always Helvetica
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#FFFFFF");
      doc.text(fmt(totalRevenue, language), colMap.total.x, y + 7, {
        width: colMap.total.w,
        align: "right",
      });
      doc.text(fmt(totalDiscount, language), colMap.discount.x, y + 7, {
        width: colMap.discount.w,
        align: "right",
      });
      doc.text(fmt(totalPaid, language), colMap.paid.x, y + 7, {
        width: colMap.paid.w,
        align: "right",
      });
      doc.text(fmt(totalRemaining, language), colMap.remaining.x, y + 7, {
        width: colMap.remaining.w,
        align: "right",
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    wt(
      doc,
      `${labels.footerPrefix} — ${labels.title} ${monthName(month, language)} ${year}`,
      40,
      doc.page.height - 26,
      { width: pageW - 80, align: isRtl ? "right" : "center" },
      fkFont,
      "#94A3B8",
      false,
      8,
    );

    doc.end();
  });
}
