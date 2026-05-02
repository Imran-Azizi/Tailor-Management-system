import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  formatReportDateTime,
  formatReportNumber,
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

function resolveArabicFontPath() {
  const candidates = [
    process.env.PDF_REPORT_FONT_PATH,
    process.env.PDF_DARI_PASHTO_FONT_PATH,
    process.env.PDF_BAHIJ_FONT_PATH,
    process.env.PDF_VAZIRMATN_FONT_PATH,
    process.env.PDF_ARABIC_FONT_PATH,
    "C:/Windows/Fonts/bahij.ttf",
    "C:/Windows/Fonts/bahij-zar.ttf",
    "C:/Windows/Fonts/Bahij_Zar.ttf",
    "C:/Windows/Fonts/Bahij Zar.ttf",
    path.join(__dirname, "../fonts/Bahij_Zar.ttf"),
    path.join(__dirname, "../fonts/Bahij-Zar.ttf"),
    path.join(__dirname, "../fonts/BahijZar.ttf"),
    path.join(__dirname, "../fonts/Vazirmatn-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoSansArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNastaliqUrdu-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNaskhArabic-Regular.ttf"),
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

// Write text: uses Arabic glyph-path renderer for Arabic script, Helvetica for Latin
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

function rtlAwareAlign(isRtl, fallback = "left") {
  return isRtl ? "right" : fallback;
}

const TABLE_X = 40;
const TABLE_W = 515;
const TABLE_ROW_H = 24;
const DAILY_COL = {
  num: { x: 48, w: 20 },
  date: { x: 72, w: 104 },
  from: { x: 182, w: 110 },
  recipient: { x: 298, w: 110 },
  amount: { x: 414, w: 70, align: "right" },
  note: { x: 492, w: 56 },
};

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

const DAILY_COL_RTL = mirrorColumns(DAILY_COL, TABLE_X, TABLE_W);

function drawSummaryRow(doc, label, value, y, fkFont, isRtl) {
  wt(
    doc,
    label,
    44,
    y,
    { width: 180, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#334155",
    false,
    11.5,
  );
  // value is always formatted numbers/dates — no shaping needed
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor("#0F172A")
    .text(String(value), 230, y, {
      width: 320,
      align: rtlAwareAlign(isRtl, "left"),
    });
}

function drawTableHeader(doc, y, labels, fkFont, isRtl, colMap) {
  const rowHeight = TABLE_ROW_H;
  doc.save();
  doc.roundedRect(TABLE_X, y, TABLE_W, rowHeight, 4).fill("#E2E8F0");
  doc.restore();

  wt(
    doc,
    labels.columns.num,
    colMap.num.x,
    y + 7,
    { width: colMap.num.w, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#0F172A",
    true,
    10,
  );
  wt(
    doc,
    labels.columns.date,
    colMap.date.x,
    y + 7,
    { width: colMap.date.w, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#0F172A",
    true,
    10,
  );
  wt(
    doc,
    labels.columns.from,
    colMap.from.x,
    y + 7,
    { width: colMap.from.w, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#0F172A",
    true,
    10,
  );
  wt(
    doc,
    labels.columns.recipient,
    colMap.recipient.x,
    y + 7,
    { width: colMap.recipient.w, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#0F172A",
    true,
    10,
  );
  wt(
    doc,
    labels.columns.amount,
    colMap.amount.x,
    y + 7,
    { width: colMap.amount.w, align: "right" },
    fkFont,
    "#0F172A",
    true,
    10,
  );
  wt(
    doc,
    labels.columns.note,
    colMap.note.x,
    y + 7,
    { width: colMap.note.w, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#0F172A",
    true,
    10,
  );

  return y + rowHeight;
}

export async function buildDailyTaskReportPdf(report, language = "en") {
  const text = resolveReportText(language).daily;
  const isRtl = isRtlReportLanguage(language);

  // Pre-load the Arabic fontkit font for glyph-path rendering
  let fkFont = null;
  if (isRtl) {
    try {
      const fontPath = resolveArabicFontPath();
      if (!fontPath) throw new Error("No Arabic font found");
      fkFont = await loadArabicFont(fontPath);
      console.info(`[PDF] Daily RTL font: ${fontPath}`);
    } catch (err) {
      console.error("[PDF] Arabic font load failed:", err.message);
      fkFont = null;
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: text.title,
        Author: "Tailor System",
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const from = report?.filters?.from;
    const to = report?.filters?.to;
    const type = report?.filters?.reportType || "daily";
    const summary = report?.summary || {};
    const tasks = Array.isArray(report?.tasks) ? report.tasks : [];
    const colMap = isRtl ? DAILY_COL_RTL : DAILY_COL;

    wt(
      doc,
      text.title,
      40,
      36,
      { width: 515, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#0F172A",
      true,
      19,
    );
    wt(
      doc,
      `${text.generatedAt}: ${formatReportDateTime(new Date(), language)}`,
      40,
      62,
      { width: 515, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#475569",
      false,
      10,
    );

    doc
      .moveTo(40, 78)
      .lineTo(TABLE_X + TABLE_W, 78)
      .lineWidth(1)
      .strokeColor("#CBD5E1")
      .stroke();

    drawSummaryRow(
      doc,
      text.reportType,
      formatReportType(type, text),
      92,
      fkFont,
      isRtl,
    );
    drawSummaryRow(
      doc,
      text.dateRange,
      `${formatReportDateTime(from, language)} - ${formatReportDateTime(to, language)}`,
      108,
      fkFont,
      isRtl,
    );
    drawSummaryRow(
      doc,
      text.totalTasks,
      formatReportNumber(summary.totalTasks || 0, language),
      124,
      fkFont,
      isRtl,
    );
    drawSummaryRow(
      doc,
      text.totalAmount,
      formatMoney(summary.totalAmount, language),
      140,
      fkFont,
      isRtl,
    );
    drawSummaryRow(
      doc,
      text.highestExpense,
      formatMoney(summary.highestExpense, language),
      156,
      fkFont,
      isRtl,
    );
    drawSummaryRow(
      doc,
      text.averageExpense,
      formatMoney(summary.averageAmount, language),
      172,
      fkFont,
      isRtl,
    );

    let y = 196;
    wt(
      doc,
      text.records,
      40,
      y,
      { width: 515, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#0F172A",
      true,
      11,
    );

    y += 10;
    y = drawTableHeader(doc, y + 6, text, fkFont, isRtl, colMap);

    const baseRowHeight = 24;
    const noteColumnWidth = colMap.note.w;
    const noteVerticalPadding = 12;
    const footerThreshold = doc.page.height - 52;

    if (tasks.length === 0) {
      wt(
        doc,
        text.noRecords,
        44,
        y + 10,
        { width: 511, align: rtlAwareAlign(isRtl, "left") },
        fkFont,
        "#64748B",
        false,
        10,
      );
    } else {
      tasks.forEach((task, index) => {
        const noteRaw = String(task.note || "-");
        const noteIsArabic = fkFont && hasArabicScript(noteRaw);

        // Calculate row height: for Arabic notes use fixed estimate; for Latin use PDFKit's measurement
        let rowHeight = baseRowHeight;
        if (!noteIsArabic) {
          doc.font("Helvetica").fontSize(10);
          const noteHeight = doc.heightOfString(noteRaw, {
            width: noteColumnWidth,
          });
          rowHeight = Math.max(
            baseRowHeight,
            Math.ceil(noteHeight) + noteVerticalPadding,
          );
        }

        if (y + rowHeight > footerThreshold) {
          doc.addPage();
          y = 40;
          wt(
            doc,
            `${text.records} (${text.continued})`,
            40,
            y,
            { width: 515, align: rtlAwareAlign(isRtl, "left") },
            fkFont,
            "#0F172A",
            true,
            11,
          );
          y = drawTableHeader(doc, y + 16, text, fkFont, isRtl, colMap);
        }

        if (index % 2 === 0) {
          doc.save();
          doc.rect(TABLE_X, y, TABLE_W, rowHeight).fill("#F8FAFC");
          doc.restore();
        }

        // Numeric / date columns — always ASCII
        doc.fillColor("#0F172A").font("Helvetica").fontSize(10);
        doc.text(String(index + 1), colMap.num.x, y + 6, {
          width: colMap.num.w,
          align: rtlAwareAlign(isRtl, "left"),
        });
        doc.text(
          formatReportDateTime(task.taskDate, language),
          colMap.date.x,
          y + 6,
          {
            width: colMap.date.w,
            align: rtlAwareAlign(isRtl, "left"),
          },
        );
        doc.text(truncate(task.fromName, 18), colMap.from.x, y + 6, {
          width: colMap.from.w,
          align: rtlAwareAlign(isRtl, "left"),
        });
        doc.text(truncate(task.recipientName, 18), colMap.recipient.x, y + 6, {
          width: colMap.recipient.w,
          align: rtlAwareAlign(isRtl, "left"),
        });
        doc.text(formatMoney(task.amount, language), colMap.amount.x, y + 6, {
          width: colMap.amount.w,
          align: "right",
        });

        // Note column — may be Arabic
        wt(
          doc,
          noteRaw,
          colMap.note.x,
          y + 6,
          { width: noteColumnWidth, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          10,
        );

        y += rowHeight;
      });
    }

    wt(
      doc,
      text.footer,
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
