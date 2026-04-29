import PDFDocument from "pdfkit";
import fs from "fs";
import { createRequire } from "module";
import {
  formatReportDateTime,
  formatReportNumber,
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
  } catch (_error) {
    return null;
  }
}

function toPdfArabicText(value) {
  const text = String(value || "");
  if (!hasArabicScript(text)) return text;

  try {
    return reshaper.ArabicShaper.convertArabic(text);
  } catch (_error) {
    return text;
  }
}

function formatReportType(type, labels) {
  const value = String(type || "daily");
  return labels.reportTypes[value] || labels.reportTypes.custom;
}

function formatMoney(value, language) {
  return `${formatReportNumber(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} AF`;
}

function truncate(value, maxLength = 24) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function drawSummaryRow(doc, label, value, y) {
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#334155")
    .text(label, 44, y, { width: 180 });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#0F172A")
    .text(String(value), 230, y, { width: 320 });
}

function drawTableHeader(doc, y, labels) {
  const rowHeight = 22;
  doc.save();
  doc.roundedRect(40, y, 515, rowHeight, 4).fill("#E2E8F0");
  doc.restore();

  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9);
  doc.text(labels.columns.num, 48, y + 7, { width: 20 });
  doc.text(labels.columns.date, 72, y + 7, { width: 104 });
  doc.text(labels.columns.from, 182, y + 7, { width: 110 });
  doc.text(labels.columns.recipient, 298, y + 7, { width: 110 });
  doc.text(labels.columns.amount, 414, y + 7, { width: 70, align: "right" });
  doc.text(labels.columns.note, 492, y + 7, { width: 56 });

  return y + rowHeight;
}

export function buildDailyTaskReportPdf(report, language = "en") {
  const text = resolveReportText(language).daily;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: text.title,
        Author: "Tailor System",
      },
    });

    let arabicFontName = null;
    try {
      const arabicFontPath = resolveArabicFontPath();
      if (!arabicFontPath) throw new Error("Arabic font not found");
      arabicFontName = "ArabicScript";
      doc.registerFont(arabicFontName, arabicFontPath);
    } catch (_error) {
      arabicFontName = null;
    }

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const from = report?.filters?.from;
    const to = report?.filters?.to;
    const type = report?.filters?.reportType || "daily";
    const summary = report?.summary || {};
    const tasks = Array.isArray(report?.tasks) ? report.tasks : [];

    doc
      .font("Helvetica-Bold")
      .fontSize(19)
      .fillColor("#0F172A")
      .text(text.title, 40, 36);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#475569")
      .text(
        `${text.generatedAt}: ${formatReportDateTime(new Date(), language)}`,
        40,
        62,
      );

    doc
      .moveTo(40, 78)
      .lineTo(555, 78)
      .lineWidth(1)
      .strokeColor("#CBD5E1")
      .stroke();

    drawSummaryRow(doc, text.reportType, formatReportType(type, text), 92);
    drawSummaryRow(
      doc,
      text.dateRange,
      `${formatReportDateTime(from, language)} - ${formatReportDateTime(to, language)}`,
      108,
    );
    drawSummaryRow(
      doc,
      text.totalTasks,
      formatReportNumber(summary.totalTasks || 0, language),
      124,
    );
    drawSummaryRow(
      doc,
      text.totalAmount,
      formatMoney(summary.totalAmount, language),
      140,
    );
    drawSummaryRow(
      doc,
      text.highestExpense,
      formatMoney(summary.highestExpense, language),
      156,
    );
    drawSummaryRow(
      doc,
      text.averageExpense,
      formatMoney(summary.averageAmount, language),
      172,
    );

    let y = 196;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#0F172A")
      .text(text.records, 40, y);

    y += 10;
    y = drawTableHeader(doc, y + 6, text);

    const baseRowHeight = 20;
    const noteColumnWidth = 56;
    const noteVerticalPadding = 12;
    const footerThreshold = doc.page.height - 52;

    if (tasks.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#64748B")
        .text(text.noRecords, 44, y + 10);
    } else {
      tasks.forEach((task, index) => {
        const noteText = String(task.note || "-");
        const noteTextForPdf = toPdfArabicText(noteText);
        const useArabicFont = Boolean(
          arabicFontName && hasArabicScript(noteText),
        );
        const noteAlign = useArabicFont ? "right" : "left";

        doc.font(useArabicFont ? arabicFontName : "Helvetica").fontSize(9);
        const noteHeight = doc.heightOfString(noteTextForPdf, {
          width: noteColumnWidth,
          align: noteAlign,
        });
        const rowHeight = Math.max(
          baseRowHeight,
          Math.ceil(noteHeight) + noteVerticalPadding,
        );

        if (y + rowHeight > footerThreshold) {
          doc.addPage();
          y = 40;
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#0F172A")
            .text(`${text.records} (${text.continued})`, 40, y);
          y = drawTableHeader(doc, y + 16, text);
        }

        if (index % 2 === 0) {
          doc.save();
          doc.rect(40, y, 515, rowHeight).fill("#F8FAFC");
          doc.restore();
        }

        doc.fillColor("#0F172A").font("Helvetica").fontSize(9);
        doc.text(String(index + 1), 48, y + 6, { width: 20 });
        doc.text(formatReportDateTime(task.taskDate, language), 72, y + 6, {
          width: 104,
        });
        doc.text(truncate(task.fromName, 18), 182, y + 6, { width: 110 });
        doc.text(truncate(task.recipientName, 18), 298, y + 6, { width: 110 });
        doc.text(formatMoney(task.amount, language), 414, y + 6, {
          width: 70,
          align: "right",
        });
        doc
          .font(useArabicFont ? arabicFontName : "Helvetica")
          .text(noteTextForPdf, 492, y + 6, {
            width: noteColumnWidth,
            align: noteAlign,
          });

        y += rowHeight;
      });
    }

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#94A3B8")
      .text(text.footer, 40, doc.page.height - 26, {
        width: 515,
        align: "center",
      });

    doc.end();
  });
}
