import PDFDocument from "pdfkit";
import fs from "fs";
import { createRequire } from "module";
import {
  formatReportDateTime,
  formatReportNumber,
  getReportLocaleTag,
  normalizeReportLanguage,
  resolveReportText,
} from "./reportLocale.js";

const require = createRequire(import.meta.url);
const reshaper = require("arabic-persian-reshaper");

const ARABIC_SCRIPT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function hasArabicScript(value) {
  return ARABIC_SCRIPT_REGEX.test(String(value || ""));
}

function resolveArabicFontPath() {
  const candidates = [
    process.env.PDF_ARABIC_FONT_PATH,
    "C:/Windows/Fonts/tahoma.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  try {
    return require.resolve("@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff");
  } catch {
    return null;
  }
}

function toPdf(value, arabicFontName) {
  const text = String(value || "");
  if (!arabicFontName || !hasArabicScript(text)) return { text, rtl: false };
  try {
    return { text: reshaper.ArabicShaper.convertArabic(text), rtl: true };
  } catch {
    return { text, rtl: false };
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

const ROW_H = 20;
const FOOTER_THRESHOLD_MARGIN = 56;

function drawTableHeader(doc, y, labels) {
  doc.save();
  doc.roundedRect(40, y, 555, ROW_H, 3).fill("#1E293B");
  doc.restore();

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.5);

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
    const c = COL[key];
    doc.text(label, c.x, y + 6, { width: c.w, align: c.align || "left" });
  });

  return y + ROW_H;
}

function drawRow(doc, y, index, order, arabicFontName, language, labels) {
  if (index % 2 === 0) {
    doc.save();
    doc.rect(40, y, 555, ROW_H).fill("#F8FAFC");
    doc.restore();
  }

  const customerRaw = order.customer?.firstName || "-";
  const { text: customerText, rtl } = toPdf(customerRaw, arabicFontName);
  const font = rtl && arabicFontName ? arabicFontName : "Helvetica";

  doc.fillColor("#0F172A").font("Helvetica").fontSize(8);

  const c = COL;

  doc.text(String(index + 1), c.num.x, y + 6, { width: c.num.w });
  doc.text(String(order.customer?.billNumber ?? "-"), c.bill.x, y + 6, {
    width: c.bill.w,
  });
  doc.font(font).text(customerText, c.customer.x, y + 6, {
    width: c.customer.w,
    align: rtl ? "right" : "left",
  });
  doc.font("Helvetica");
  doc.text(
    order.orderDisplayName || orderTypeLabel(order.type, language),
    c.type.x,
    y + 6,
    {
      width: c.type.w,
    },
  );
  doc.text(String(order.quantity ?? 1), c.qty.x, y + 6, { width: c.qty.w });
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
  doc.fillColor("#0F172A");

  const statusLabel = order.isCompleted
    ? labels.statusDone
    : labels.statusPending;
  const statusColor = order.isCompleted ? "#16A34A" : "#D97706";
  doc.fillColor(statusColor).font("Helvetica-Bold").fontSize(7.5);
  doc.text(statusLabel, c.status.x, y + 7, { width: c.status.w });
  doc.fillColor("#0F172A").font("Helvetica").fontSize(8);

  return y + ROW_H;
}

function summaryRow(doc, label, value, y, valueColor = "#0F172A") {
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#475569")
    .text(label, 40, y, { width: 220 });
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(valueColor)
    .text(value, 260, y, { width: 335 });
  return y + 16;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function buildMonthlyReportPdf({
  month,
  year,
  orders,
  language = "en",
}) {
  const labels = resolveReportText(language).monthly;

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

    let arabicFontName = null;
    try {
      const path = resolveArabicFontPath();
      if (!path) throw new Error("Arabic font not found");
      arabicFontName = "ArabicScript";
      doc.registerFont(arabicFontName, path);
    } catch {
      arabicFontName = null;
    }

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

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#FFFFFF")
      .text(`${labels.title} — ${monthName(month, language)} ${year}`, 40, 18);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#94A3B8")
      .text(
        `${labels.generatedAt}: ${formatReportDateTime(new Date(), language)}   |   ${labels.totalOrders}: ${formatReportNumber(safeOrders.length, language)}`,
        40,
        42,
      );

    // ── Summary cards ─────────────────────────────────────────────────────────
    let y = 80;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#0F172A")
      .text(labels.summary, 40, y);

    y += 14;
    y = summaryRow(
      doc,
      labels.totalOrders,
      formatReportNumber(safeOrders.length, language),
      y,
    );
    y = summaryRow(
      doc,
      labels.completedPending,
      `${formatReportNumber(completedCount, language)} / ${formatReportNumber(pendingCount, language)}`,
      y,
    );
    y = summaryRow(
      doc,
      labels.grossRevenue,
      `${fmt(totalRevenue, language)} AF`,
      y,
    );
    y = summaryRow(
      doc,
      labels.totalDiscounts,
      `${fmt(totalDiscount, language)} AF`,
      y,
    );
    y = summaryRow(
      doc,
      labels.totalPaid,
      `${fmt(totalPaid, language)} AF`,
      y,
      "#16A34A",
    );
    y = summaryRow(
      doc,
      labels.totalRemaining,
      `${fmt(totalRemaining, language)} AF`,
      y,
      totalRemaining > 0 ? "#DC2626" : "#16A34A",
    );

    // ── Divider ───────────────────────────────────────────────────────────────
    y += 10;
    doc
      .moveTo(40, y)
      .lineTo(pageW - 40, y)
      .lineWidth(1)
      .strokeColor("#E2E8F0")
      .stroke();
    y += 12;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#0F172A")
      .text(labels.orderRecords, 40, y);

    y += 14;

    // ── Table ─────────────────────────────────────────────────────────────────
    if (safeOrders.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#64748B")
        .text(labels.noOrders, 40, y + 8);
    } else {
      y = drawTableHeader(doc, y, labels);

      const footerThreshold = doc.page.height - FOOTER_THRESHOLD_MARGIN;

      safeOrders.forEach((order, index) => {
        if (y + ROW_H > footerThreshold) {
          doc.addPage();
          y = 40;
          doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor("#0F172A")
            .text(
              `${labels.title} — ${monthName(month, language)} ${year} (${labels.continued})`,
              40,
              y,
            );
          y += 18;
          y = drawTableHeader(doc, y, labels);
        }
        y = drawRow(doc, y, index, order, arabicFontName, language, labels);
      });

      // ── Totals row ──────────────────────────────────────────────────────────
      y += 4;
      doc.save();
      doc.roundedRect(40, y, 555, ROW_H + 2, 3).fill("#1E293B");
      doc.restore();

      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8);
      doc.text(labels.totals, COL.customer.x, y + 7, { width: 100 });
      doc.text(fmt(totalRevenue, language), COL.total.x, y + 7, {
        width: COL.total.w,
        align: "right",
      });
      doc.text(fmt(totalDiscount, language), COL.discount.x, y + 7, {
        width: COL.discount.w,
        align: "right",
      });
      doc.text(fmt(totalPaid, language), COL.paid.x, y + 7, {
        width: COL.paid.w,
        align: "right",
      });
      doc.text(fmt(totalRemaining, language), COL.remaining.x, y + 7, {
        width: COL.remaining.w,
        align: "right",
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#94A3B8")
      .text(
        `${labels.footerPrefix} — ${labels.title} ${monthName(month, language)} ${year}`,
        40,
        doc.page.height - 26,
        { width: pageW - 80, align: "center" },
      );

    doc.end();
  });
}
