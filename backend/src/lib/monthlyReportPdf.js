import PDFDocument from "pdfkit";
import fs from "fs";
import { createRequire } from "module";

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

function fmt(value) {
  return Number(value || 0).toLocaleString("en-US", {
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

function monthName(n) {
  return MONTH_NAMES[(Number(n) - 1) % 12] || String(n);
}

function orderTypeLabel(type) {
  const map = {
    OUTFIT: "Outfit",
    WASKAT: "Waskat",
    KORTY: "Korty",
    YAKHANQAQ: "YakhanQaq",
  };
  return map[type] || type;
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

function drawTableHeader(doc, y) {
  doc.save();
  doc.roundedRect(40, y, 555, ROW_H, 3).fill("#1E293B");
  doc.restore();

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.5);

  Object.entries({
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
  }).forEach(([key, label]) => {
    const c = COL[key];
    doc.text(label, c.x, y + 6, { width: c.w, align: c.align || "left" });
  });

  return y + ROW_H;
}

function drawRow(doc, y, index, order, arabicFontName) {
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
  doc.text(orderTypeLabel(order.type), c.type.x, y + 6, { width: c.type.w });
  doc.text(String(order.quantity ?? 1), c.qty.x, y + 6, { width: c.qty.w });
  doc.text(fmt(order.totalPrice), c.total.x, y + 6, {
    width: c.total.w,
    align: "right",
  });
  doc.text(fmt(order.discount), c.discount.x, y + 6, {
    width: c.discount.w,
    align: "right",
  });
  doc.text(fmt(order.paidAmount), c.paid.x, y + 6, {
    width: c.paid.w,
    align: "right",
  });

  const rem = Number(order.remaining ?? 0);
  doc.fillColor(rem > 0 ? "#DC2626" : "#16A34A");
  doc.text(fmt(rem), c.remaining.x, y + 6, {
    width: c.remaining.w,
    align: "right",
  });
  doc.fillColor("#0F172A");

  const statusLabel = order.isCompleted ? "Done" : "Pending";
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
export function buildMonthlyReportPdf({ month, year, orders }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
      info: {
        Title: `Monthly Report - ${monthName(month)} ${year}`,
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
      .text(`Monthly Report — ${monthName(month)} ${year}`, 40, 18);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#94A3B8")
      .text(
        `Generated: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}   |   Total Orders: ${safeOrders.length}`,
        40,
        42,
      );

    // ── Summary cards ─────────────────────────────────────────────────────────
    let y = 80;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#0F172A")
      .text("Summary", 40, y);

    y += 14;
    y = summaryRow(doc, "Total Orders", String(safeOrders.length), y);
    y = summaryRow(
      doc,
      "Completed / Pending",
      `${completedCount} / ${pendingCount}`,
      y,
    );
    y = summaryRow(doc, "Gross Revenue", `${fmt(totalRevenue)} AFN`, y);
    y = summaryRow(doc, "Total Discounts", `${fmt(totalDiscount)} AFN`, y);
    y = summaryRow(doc, "Total Paid", `${fmt(totalPaid)} AFN`, y, "#16A34A");
    y = summaryRow(
      doc,
      "Total Remaining (Outstanding)",
      `${fmt(totalRemaining)} AFN`,
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
      .text("Order Records", 40, y);

    y += 14;

    // ── Table ─────────────────────────────────────────────────────────────────
    if (safeOrders.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#64748B")
        .text("No orders found for this month.", 40, y + 8);
    } else {
      y = drawTableHeader(doc, y);

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
              `Monthly Report — ${monthName(month)} ${year} (continued)`,
              40,
              y,
            );
          y += 18;
          y = drawTableHeader(doc, y);
        }
        y = drawRow(doc, y, index, order, arabicFontName);
      });

      // ── Totals row ──────────────────────────────────────────────────────────
      y += 4;
      doc.save();
      doc.roundedRect(40, y, 555, ROW_H + 2, 3).fill("#1E293B");
      doc.restore();

      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8);
      doc.text("TOTALS", COL.customer.x, y + 7, { width: 100 });
      doc.text(fmt(totalRevenue), COL.total.x, y + 7, {
        width: COL.total.w,
        align: "right",
      });
      doc.text(fmt(totalDiscount), COL.discount.x, y + 7, {
        width: COL.discount.w,
        align: "right",
      });
      doc.text(fmt(totalPaid), COL.paid.x, y + 7, {
        width: COL.paid.w,
        align: "right",
      });
      doc.text(fmt(totalRemaining), COL.remaining.x, y + 7, {
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
        `Khan Rahimi Tailor System — Monthly Report ${monthName(month)} ${year}`,
        40,
        doc.page.height - 26,
        { width: pageW - 80, align: "center" },
      );

    doc.end();
  });
}
