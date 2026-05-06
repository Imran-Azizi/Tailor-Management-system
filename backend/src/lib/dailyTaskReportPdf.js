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
    // Preferred bundled fonts first for predictable production output
    path.join(__dirname, "../fonts/Vazirmatn-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNaskhArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoSansArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNastaliqUrdu-Regular.ttf"),
    "C:/Windows/Fonts/bahij.ttf",
    "C:/Windows/Fonts/bahij-zar.ttf",
    "C:/Windows/Fonts/Bahij_Zar.ttf",
    "C:/Windows/Fonts/Bahij Zar.ttf",
    // Additional bundled compatibility names
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

// --- Stat Card Grid for Dashboard Section (like monthly report) ---
function drawDashboardStatsCards(
  doc,
  y,
  labels,
  stats,
  language,
  fkFont,
  isRtl,
) {
  const statLabels = labels.stats || {};
  const groups = [
    {
      title: labels?.statGroups?.revenue || "Revenue & Profit",
      cards: [
        {
          label: statLabels.totalAmount,
          value: `${formatReportNumber(stats.totalRevenue || 0, language)} AF`,
          accent: "#16A34A",
        },
        {
          label: statLabels.collected,
          value: `${formatReportNumber(stats.totalPaid || 0, language)} AF`,
          accent: "#0891B2",
        },
        {
          label: statLabels.outstanding,
          value: `${formatReportNumber(stats.totalRemaining || 0, language)} AF`,
          accent: "#DC2626",
        },
      ],
    },
    {
      title: labels?.statGroups?.expenses || "Expenses",
      cards: [
        {
          label: statLabels.totalDailyExpenses,
          value: `${formatReportNumber(stats.totalDailyExpenses || 0, language)} AF`,
          accent: "#16A34A",
        },
      ],
    },
    {
      title: labels?.statGroups?.orders || "Orders",
      cards: [
        {
          label: statLabels.totalTasks,
          value: formatReportNumber(stats.totalTasks || 0, language),
          accent: "#2563EB",
        },
      ],
    },
  ];

  const cardsPerRow = 3;
  const gap = 8;
  const groupGap = 10;
  const cardHeight = 46;
  const cardWidth = (TABLE_W - gap * (cardsPerRow - 1)) / cardsPerRow;
  let cursorY = y;

  groups.forEach((group) => {
    wt(
      doc,
      group.title,
      TABLE_X,
      cursorY,
      { width: TABLE_W, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#334155",
      true,
      10.5,
    );
    cursorY += 14;

    group.cards.forEach((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const visualCol = isRtl ? cardsPerRow - 1 - col : col;
      const x = TABLE_X + visualCol * (cardWidth + gap);
      const cardY = cursorY + row * (cardHeight + gap);

      doc.save();
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 5).fill("#F8FAFC");
      doc
        .roundedRect(x, cardY, cardWidth, cardHeight, 5)
        .lineWidth(0.6)
        .stroke("#E2E8F0");
      doc.rect(x, cardY, 3, cardHeight).fill(card.accent || "#1D4ED8");
      doc.restore();

      wt(
        doc,
        card.label || "-",
        x + 8,
        cardY + 7,
        {
          width: cardWidth - 16,
          align: rtlAwareAlign(isRtl, "left"),
        },
        fkFont,
        "#475569",
        false,
        8.6,
      );

      doc
        .font("Helvetica-Bold")
        .fontSize(10.6)
        .fillColor("#0F172A")
        .text(card.value, x + 8, cardY + 23, {
          width: cardWidth - 16,
          align: rtlAwareAlign(isRtl, "left"),
        });
    });

    const rows = Math.ceil(group.cards.length / cardsPerRow);
    cursorY += rows * (cardHeight + gap) - gap + groupGap;
  });

  return cursorY - groupGap;
}

function formatReportType(type, labels) {
  const value = String(type || "daily");
  return labels.reportTypes[value] || labels.reportTypes.custom;
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

function truncateTextToWidth(doc, value, width, fkFont, fontSize = 10) {
  const text = String(value ?? "").trim();
  if (!text || width <= 10) return text;
  if (tokenWidth(doc, text, fkFont, fontSize) <= width) return text;

  const ellipsis = "…";
  const ellipsisWidth = tokenWidth(doc, ellipsis, fkFont, fontSize);
  const chars = Array.from(text);
  let result = "";

  for (const char of chars) {
    const candidate = `${result}${char}`;
    if (tokenWidth(doc, candidate, fkFont, fontSize) + ellipsisWidth > width) {
      break;
    }
    result = candidate;
  }

  return result ? `${result}${ellipsis}` : ellipsis;
}

function getWrappedLineCount(doc, value, width, fkFont, fontSize = 10) {
  const text = String(value ?? "").trim();
  if (!text || width <= 12) return 1;
  if (tokenWidth(doc, text, fkFont, fontSize) <= width) return 1;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return 2;

  let lines = 1;
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (tokenWidth(doc, candidate, fkFont, fontSize) <= width) {
      currentLine = candidate;
      continue;
    }
    lines += 1;
    currentLine = word;
  }

  return Math.max(1, lines);
}

function wrapTextToLines(
  doc,
  value,
  width,
  fkFont,
  fontSize = 10,
  maxLines = Infinity,
) {
  const text = String(value ?? "").trim();
  if (!text) return [""];
  if (width <= 12) return [truncateTextToWidth(doc, text, width, fkFont, fontSize)];
  if (tokenWidth(doc, text, fkFont, fontSize) <= width) return [text];

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return [truncateTextToWidth(doc, text, width, fkFont, fontSize)];
  }

  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (tokenWidth(doc, candidate, fkFont, fontSize) <= width) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length >= maxLines - 1) {
      const remaining = [currentLine, ...words.slice(words.indexOf(word) + 1)]
        .filter(Boolean)
        .join(" ");
      lines.push(
        truncateTextToWidth(doc, remaining, width, fkFont, fontSize),
      );
      return lines;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = truncateTextToWidth(
    doc,
    lines.slice(maxLines - 1).join(" "),
    width,
    fkFont,
    fontSize,
  );
  return visible;
}

function drawWrappedCellText(
  doc,
  value,
  x,
  y,
  width,
  fkFont,
  isRtl,
  {
    fontSize = 10,
    fillColor = "#0F172A",
    bold = false,
    maxLines = Infinity,
    lineHeight = 12,
  } = {},
) {
  const lines = wrapTextToLines(
    doc,
    value,
    width,
    fkFont,
    fontSize,
    maxLines,
  );

  lines.forEach((line, index) => {
    wt(
      doc,
      line,
      x,
      y + index * lineHeight,
      { width, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      fillColor,
      bold,
      fontSize,
    );
  });

  return lines.length;
}

function formatTaskRowDateParts(value, language) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { dateText: "-", timeText: "-" };
  }

  return {
    dateText: formatReportDateTime(date, language, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: undefined,
      minute: undefined,
    }),
    timeText: formatReportDateTime(date, language, {
      year: undefined,
      month: undefined,
      day: undefined,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function drawTaskRowDateCell(doc, value, x, y, width, fkFont, language, isRtl) {
  const { dateText, timeText } = formatTaskRowDateParts(value, language);

  if (isRtl) {
    drawRtlMixedValue(doc, dateText, x, y, width, fkFont, 10);
    drawRtlMixedValue(doc, timeText, x, y + 12, width, fkFont, 10, "#475569");
    return 2;
  }

  wt(
    doc,
    dateText,
    x,
    y,
    { width, align: "left" },
    fkFont,
    "#0F172A",
    false,
    10,
  );
  wt(
    doc,
    timeText,
    x,
    y + 12,
    { width, align: "left" },
    fkFont,
    "#475569",
    false,
    10,
  );
  return 2;
}

function rtlAwareAlign(isRtl, fallback = "left") {
  return isRtl ? "right" : fallback;
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

function drawRtlMixedValue(
  doc,
  value,
  x,
  y,
  width,
  fkFont,
  fontSize = 10,
  fillColor = "#0F172A",
  bold = false,
) {
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
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fontSize)
        .fillColor(fillColor)
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
        fillColor,
        bold,
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
    const sep = ":";
    const labelW = Math.min(
      Math.max(tokenWidth(doc, safeLabel, fkFont, fontSize) + 12, 86),
      Math.min(220, width * 0.45),
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

  const metaLine = formatReportLabelValue(safeLabel, safeValue, "en", ":");
  wt(
    doc,
    metaLine,
    x,
    y,
    { width, align: "left", lineBreak: false },
    fkFont,
    "#475569",
    false,
    fontSize,
  );
}

const TABLE_X = 40;
const TABLE_W = 515;
const TABLE_ROW_H = 24;
const DAILY_COL = {
  num: { x: 48, w: 24 },
  date: { x: 76, w: 94 },
  from: { x: 174, w: 82 },
  recipient: { x: 260, w: 82 },
  amount: { x: 362, w: 86, align: "right" },
  note: { x: 452, w: 98 },
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
  if (isRtl) {
    drawRtlMixedValue(doc, String(value), 230, y, 320, fkFont, 11.5);
  } else {
    wt(
      doc,
      String(value),
      230,
      y,
      { width: 320, align: "left" },
      fkFont,
      "#0F172A",
      true,
      11.5,
    );
  }
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
    drawHeaderMetaLine(doc, {
      label: text.generatedAt,
      value: formatReportDateTime(new Date(), language),
      x: 40,
      y: 62,
      width: 515,
      isRtl,
      fkFont,
      fontSize: 10,
    });

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
    const dateRangeSep = isRtl ? " تا " : " - ";
    const dateRangeValue = `${formatReportDateTime(from, language)}${dateRangeSep}${formatReportDateTime(to, language)}`;
    drawSummaryRow(doc, text.dateRange, dateRangeValue, 108, fkFont, isRtl);
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

    const baseRowHeight = 34;
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
        const noteLines = wrapTextToLines(
          doc,
          noteRaw,
          noteColumnWidth,
          fkFont,
          10,
          3,
        );
        const noteLineCount = Math.max(1, noteLines.length);
        const dateLineCount = 2;
        const rowHeight = Math.max(
          baseRowHeight,
          dateLineCount * 12 + noteVerticalPadding,
          noteLineCount * 12 + noteVerticalPadding,
        );

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
        drawTaskRowDateCell(
          doc,
          task.taskDate,
          colMap.date.x,
          y + 6,
          colMap.date.w,
          fkFont,
          language,
          isRtl,
        );
        wt(
          doc,
          truncateTextToWidth(doc, task.fromName, colMap.from.w, fkFont, 10),
          colMap.from.x,
          y + 6,
          {
            width: colMap.from.w,
            align: rtlAwareAlign(isRtl, "left"),
          },
          fkFont,
          "#0F172A",
          false,
          10,
        );
        wt(
          doc,
          truncateTextToWidth(
            doc,
            task.recipientName,
            colMap.recipient.w,
            fkFont,
            10,
          ),
          colMap.recipient.x,
          y + 6,
          {
            width: colMap.recipient.w,
            align: rtlAwareAlign(isRtl, "left"),
          },
          fkFont,
          "#0F172A",
          false,
          10,
        );
        doc.text(formatMoney(task.amount, language), colMap.amount.x, y + 6, {
          width: colMap.amount.w,
          align: "right",
        });

        // Note column — may be Arabic
        drawWrappedCellText(
          doc,
          noteRaw,
          colMap.note.x,
          y + 6,
          noteColumnWidth,
          fkFont,
          isRtl,
          {
            fontSize: 10,
            fillColor: "#0F172A",
            maxLines: 3,
            lineHeight: 12,
          },
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
