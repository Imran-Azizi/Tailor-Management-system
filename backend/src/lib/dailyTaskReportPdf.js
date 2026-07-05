import PDFDocument from "pdfkit";
import {
  formatReportLabelValue,
  formatReportCalendarDate,
  formatReportPdfDateTime,
  formatReportNumber,
  isRtlReportLanguage,
  normalizeReportPdfText,
  normalizeReportLanguage,
  resolveReportText,
} from "./reportLocale.js";
import {
  loadArabicFont,
  resolveArabicReportFontPath,
} from "./arabicRenderer.js";
import {
  wt,
  tokenWidth,
  truncateTextToWidth,
  getWrappedLineCount,
  rtlAwareAlign,
  mirrorColumns,
  drawRtlMixedValue,
} from "./reportPdfUtils.js";

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
          label: statLabels.netBenefit || "Net Profit",
          value: `${formatReportNumber(
            stats.netProfit ?? stats.netBenefit ?? 0,
            language,
          )} AF`,
          accent: Number(stats.netProfit ?? stats.netBenefit ?? 0) >= 0
            ? "#16A34A"
            : "#DC2626",
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
          label: statLabels.orderExpenses || "Order Expenses",
          value: `${formatReportNumber(stats.totalOrderExpenses || 0, language)} AF`,
          accent: "#2563EB",
        },
        {
          label: statLabels.otherExpenses || "Other Expenses",
          value: `${formatReportNumber(stats.totalOtherExpenses || 0, language)} AF`,
          accent: "#64748B",
        },
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

  // Keep the full currency token LTR so AF remains visually on the right side.
  return isRtl ? `\u200E${formatted} AF\u200E` : `${formatted} AF`;
}

function formatSummaryMoney(value, language) {
  const formatted = String(
    formatReportNumber(value, language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  ).replace(/\u200E/g, "");
  const normalized = normalizeReportLanguage(language);
  const isRtl = normalized === "dari" || normalized === "pashto";

  // drawRtlMixedValue places the first token on the visual right in RTL mode.
  // Put AF first so it is rendered on the right side in summary rows.
  return isRtl ? `AF ${formatted}` : `${formatted} AF`;
}

function wrapTextToLines(
  doc,
  value,
  width,
  fkFont,
  language,
  fontSize = 10,
  maxLines = Infinity,
) {
  const text = normalizeReportPdfText(value, language).trim();
  if (!text) return [""];
  if (width <= 12)
    return [truncateTextToWidth(doc, text, width, fkFont, fontSize)];
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
      lines.push(truncateTextToWidth(doc, remaining, width, fkFont, fontSize));
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
  language,
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
    language,
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
    return { dateText: "-" };
  }

  return {
    dateText: formatReportCalendarDate(date, language, { month: "long" }),
  };
}

function drawTaskRowDateCell(doc, value, x, y, width, fkFont, language, isRtl) {
  const { dateText } = formatTaskRowDateParts(value, language);

  if (isRtl) {
    drawRtlMixedValue(
      doc,
      dateText,
      x,
      y,
      width,
      fkFont,
      10,
      "#0F172A",
      false,
      language,
    );
    return 1;
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
    language,
  );
  return 1;
}

function drawHeaderMetaLine(
  doc,
  { label, value, x, y, width, isRtl, fkFont, language, fontSize = 10 },
) {
  const safeLabel = normalizeReportPdfText(label, language);
  const safeValue = normalizeReportPdfText(value, language);

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
    drawRtlMixedValue(
      doc,
      safeValue,
      x,
      y,
      valueW,
      fkFont,
      fontSize,
      "#0F172A",
      false,
      language,
    );
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
const CELL_PAD_X = 8;
const DAILY_COL = {
  num: { x: 48, w: 24 },
  date: { x: 76, w: 94 },
  from: { x: 174, w: 82 },
  recipient: { x: 260, w: 82 },
  amount: { x: 362, w: 86, align: "right" },
  note: { x: 452, w: 98 },
};

const DAILY_COL_RTL = mirrorColumns(DAILY_COL, TABLE_X, TABLE_W);

function drawSummaryRow(doc, label, value, y, fkFont, isRtl, language) {
  const rowX = 44;
  const rowW = TABLE_W - 8;

  if (isRtl) {
    const safeLabel = normalizeReportPdfText(label, language);
    const safeValue = normalizeReportPdfText(String(value), language);
    const sep = ":";

    const labelW = Math.min(
      Math.max(tokenWidth(doc, safeLabel, fkFont, 11.5) + 14, 120),
      210,
    );
    const sepW = Math.max(tokenWidth(doc, sep, fkFont, 11.5) + 8, 12);
    const valueW = Math.max(rowW - labelW - sepW - 8, 120);

    const rightX = rowX + rowW;
    const labelX = rightX - labelW;
    const sepX = labelX - sepW;

    wt(
      doc,
      safeLabel,
      labelX,
      y,
      { width: labelW, align: "right", lineBreak: false },
      fkFont,
      "#334155",
      false,
      11.5,
      language,
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
      11.5,
      language,
    );
    const currencyMatch = safeValue.match(/^AF\s+(.+)$/i);
    if (currencyMatch) {
      const numberPart = String(currencyMatch[1] || "").trim() || "0";
      const afLabel = "AF";
      const afW = Math.max(tokenWidth(doc, afLabel, fkFont, 11.5), 12);
      const moneyGap = 7;
      const rightEdge = rowX + valueW;
      const afX = rightEdge - afW;
      const numberBoxW = Math.max(valueW - afW - moneyGap, 72);

      wt(
        doc,
        afLabel,
        afX,
        y,
        { width: afW + 1, align: "left", lineBreak: false },
        fkFont,
        "#0F172A",
        true,
        11.5,
        language,
      );

      drawRtlMixedValue(
        doc,
        numberPart,
        rowX,
        y,
        numberBoxW,
        fkFont,
        11.5,
        "#0F172A",
        true,
        language,
      );
      return;
    }

    drawRtlMixedValue(
      doc,
      safeValue,
      rowX,
      y,
      valueW,
      fkFont,
      11.5,
      "#0F172A",
      true,
      language,
    );
    return;
  }

  wt(
    doc,
    label,
    rowX,
    y,
    { width: 180, align: rtlAwareAlign(isRtl, "left") },
    fkFont,
    "#334155",
    false,
    11.5,
  );
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

function drawTableHeader(
  doc,
  y,
  labels,
  fkFont,
  isRtl,
  colMap,
  language = "dari",
) {
  const rowHeight = TABLE_ROW_H;
  doc.save();
  doc.rect(TABLE_X, y, TABLE_W, rowHeight).fill("#FFFFFF");
  doc
    .rect(TABLE_X, y, TABLE_W, rowHeight)
    .lineWidth(1)
    .strokeColor("#111111")
    .stroke();

  const boundaryXs = Array.from(
    new Set(
      Object.values(colMap)
        .map((col) => Number(col.x))
        .filter(Boolean),
    ),
  )
    .sort((a, b) => a - b)
    .filter((x) => x > TABLE_X && x < TABLE_X + TABLE_W);

  boundaryXs.forEach((x) => {
    doc
      .moveTo(x, y)
      .lineTo(x, y + rowHeight)
      .lineWidth(0.7)
      .strokeColor("#111111")
      .stroke();
  });
  doc.restore();

  wt(
    doc,
    labels.columns.num,
    colMap.num.x + 3,
    y + 10,
    { width: Math.max(colMap.num.w - 6, 8), align: "center" },
    fkFont,
    "#000000",
    true,
    9.5,
    language,
  );
  wt(
    doc,
    labels.columns.date,
    colMap.date.x + 3,
    y + 10,
    {
      width: Math.max(colMap.date.w - 6, 8),
      align: rtlAwareAlign(isRtl, "left"),
    },
    fkFont,
    "#000000",
    true,
    9.5,
    language,
  );
  wt(
    doc,
    labels.columns.from,
    colMap.from.x + 3,
    y + 10,
    {
      width: Math.max(colMap.from.w - 6, 8),
      align: rtlAwareAlign(isRtl, "left"),
    },
    fkFont,
    "#000000",
    true,
    9.5,
    language,
  );
  wt(
    doc,
    labels.columns.recipient,
    colMap.recipient.x + 3,
    y + 10,
    {
      width: Math.max(colMap.recipient.w - 6, 8),
      align: rtlAwareAlign(isRtl, "left"),
    },
    fkFont,
    "#000000",
    true,
    9.5,
    language,
  );
  wt(
    doc,
    labels.columns.amount,
    colMap.amount.x + 3,
    y + 10,
    { width: Math.max(colMap.amount.w - 6, 8), align: "right" },
    fkFont,
    "#000000",
    true,
    9.5,
    language,
  );
  wt(
    doc,
    labels.columns.note,
    colMap.note.x + 3,
    y + 10,
    {
      width: Math.max(colMap.note.w - 6, 8),
      align: rtlAwareAlign(isRtl, "left"),
    },
    fkFont,
    "#000000",
    true,
    9.5,
    language,
  );

  return y + rowHeight;
}

function formatDateOnly(value, language) {
  return formatReportCalendarDate(value, language, { month: "long" });
}

export async function buildDailyTaskReportPdf(report, language = "en") {
  const normalizedLanguage = normalizeReportLanguage(language);
  const text = resolveReportText(language).daily;
  const isRtl = isRtlReportLanguage(normalizedLanguage);

  // Pre-load the Arabic fontkit font for glyph-path rendering
  let fkFont = null;
  if (isRtl) {
    try {
      const fontPath = resolveArabicReportFontPath();
      if (!fontPath) throw new Error("No Arabic font found");
      fkFont = await loadArabicFont(fontPath);
      if (process.env.DEBUG_PDF_FONTS === "true") {
        console.info(`[PDF] Daily RTL font: ${fontPath}`);
      }
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

    const headerX = TABLE_X;
    const headerY = 22;
    const headerH = 116;

    doc.save();
    doc.rect(headerX, headerY, TABLE_W, headerH).fill("#FFFFFF");
    doc
      .rect(headerX, headerY, TABLE_W, headerH)
      .lineWidth(1)
      .strokeColor("#DDDDDD")
      .stroke();
    doc.restore();

    wt(
      doc,
      text.title,
      headerX + 14,
      headerY + 12,
      { width: TABLE_W - 28, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#000000",
      true,
      17,
      normalizedLanguage,
    );

    const dateRangeSep = isRtl ? "  تا  " : "  -  ";
    const dateRangeValue = `${formatDateOnly(from, language)}${dateRangeSep}${formatDateOnly(to, language)}`;

    drawHeaderMetaLine(doc, {
      label: text.generatedAt,
      value: formatReportPdfDateTime(new Date(), language, { includeTime: true }),
      x: headerX + 14,
      y: headerY + 44,
      width: TABLE_W - 28,
      isRtl,
      fkFont,
      language: normalizedLanguage,
      fontSize: 10,
    });
    drawHeaderMetaLine(doc, {
      label: text.reportType,
      value: formatReportType(type, text),
      x: headerX + 14,
      y: headerY + 64,
      width: TABLE_W - 28,
      isRtl,
      fkFont,
      language: normalizedLanguage,
      fontSize: 10,
    });
    drawHeaderMetaLine(doc, {
      label: text.dateRange,
      value: dateRangeValue,
      x: headerX + 14,
      y: headerY + 84,
      width: TABLE_W - 28,
      isRtl,
      fkFont,
      language: normalizedLanguage,
      fontSize: 10,
    });

    let y = headerY + headerH + 16;
    wt(
      doc,
      text.summary,
      40,
      y,
      { width: TABLE_W, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#000000",
      true,
      12,
      normalizedLanguage,
    );
    y += 16;
    drawSummaryRow(
      doc,
      text.totalTasks,
      formatReportNumber(summary.totalTasks || 0, language),
      y,
      fkFont,
      isRtl,
      normalizedLanguage,
    );
    y += 16;
    drawSummaryRow(
      doc,
      text.totalAmount,
      formatSummaryMoney(summary.totalAmount, language),
      y,
      fkFont,
      isRtl,
      normalizedLanguage,
    );
    y += 16;
    drawSummaryRow(
      doc,
      text.orderExpenses || "Order expenses",
      formatSummaryMoney(summary.orderExpenses, language),
      y,
      fkFont,
      isRtl,
      normalizedLanguage,
    );
    y += 16;
    drawSummaryRow(
      doc,
      text.otherExpenses || "Other expenses",
      formatSummaryMoney(summary.otherExpenses, language),
      y,
      fkFont,
      isRtl,
      normalizedLanguage,
    );
    y += 16;
    drawSummaryRow(
      doc,
      text.highestExpense,
      formatSummaryMoney(summary.highestExpense, language),
      y,
      fkFont,
      isRtl,
      normalizedLanguage,
    );
    y += 16;
    drawSummaryRow(
      doc,
      text.averageExpense,
      formatSummaryMoney(summary.averageAmount, language),
      y,
      fkFont,
      isRtl,
      normalizedLanguage,
    );

    y += 24;
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
      normalizedLanguage,
    );

    y += 10;
    y = drawTableHeader(
      doc,
      y + 6,
      text,
      fkFont,
      isRtl,
      colMap,
      normalizedLanguage,
    );

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
        normalizedLanguage,
      );
    } else {
      tasks.forEach((task, index) => {
        const noteRaw = normalizeReportPdfText(
          task.note || "-",
          normalizedLanguage,
        );
        const noteLines = wrapTextToLines(
          doc,
          noteRaw,
          noteColumnWidth,
          fkFont,
          normalizedLanguage,
          10,
          3,
        );
        const noteLineCount = Math.max(1, noteLines.length);
        const dateLineCount = 1;
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
            normalizedLanguage,
          );
          y = drawTableHeader(
            doc,
            y + 16,
            text,
            fkFont,
            isRtl,
            colMap,
            normalizedLanguage,
          );
        }

        const rowBackground = index % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
        doc.save();
        doc.rect(TABLE_X, y, TABLE_W, rowHeight).fill(rowBackground);
        doc
          .rect(TABLE_X, y, TABLE_W, rowHeight)
          .lineWidth(0.6)
          .strokeColor("#DDDDDD")
          .stroke();

        const boundaryXs = Array.from(
          new Set(
            Object.values(colMap)
              .map((col) => Number(col.x))
              .filter(Boolean),
          ),
        )
          .sort((a, b) => a - b)
          .filter((x) => x > TABLE_X && x < TABLE_X + TABLE_W);

        boundaryXs.forEach((x) => {
          doc
            .moveTo(x, y)
            .lineTo(x, y + rowHeight)
            .lineWidth(0.5)
            .strokeColor("#DDDDDD")
            .stroke();
        });
        doc.restore();

        // Numeric / date columns — always ASCII
        doc.fillColor("#000000").font("Helvetica").fontSize(9);
        doc.text(String(index + 1), colMap.num.x, y + 12, {
          width: colMap.num.w,
          align: "center",
        });
        drawTaskRowDateCell(
          doc,
          task.taskDate,
          colMap.date.x + CELL_PAD_X,
          y + 8,
          colMap.date.w - CELL_PAD_X * 2,
          fkFont,
          language,
          isRtl,
        );
        wt(
          doc,
          truncateTextToWidth(
            doc,
            task.fromName,
            colMap.from.w - CELL_PAD_X * 2,
            fkFont,
            9,
          ),
          colMap.from.x + CELL_PAD_X,
          y + 12,
          {
            width: colMap.from.w - CELL_PAD_X * 2,
            align: rtlAwareAlign(isRtl, "left"),
          },
          fkFont,
          "#000000",
          false,
          9,
          normalizedLanguage,
        );
        wt(
          doc,
          truncateTextToWidth(
            doc,
            task.recipientName,
            colMap.recipient.w - CELL_PAD_X * 2,
            fkFont,
            9,
          ),
          colMap.recipient.x + CELL_PAD_X,
          y + 12,
          {
            width: colMap.recipient.w - CELL_PAD_X * 2,
            align: rtlAwareAlign(isRtl, "left"),
          },
          fkFont,
          "#000000",
          false,
          9,
          normalizedLanguage,
        );
        doc.text(
          formatMoney(task.amount, language),
          colMap.amount.x + 4,
          y + 12,
          {
            width: colMap.amount.w - 8,
            align: "right",
          },
        );

        // Note column — may be Arabic
        drawWrappedCellText(
          doc,
          noteRaw,
          colMap.note.x + CELL_PAD_X,
          y + 8,
          noteColumnWidth - CELL_PAD_X * 2,
          fkFont,
          isRtl,
          normalizedLanguage,
          {
            fontSize: 9,
            fillColor: "#000000",
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
      normalizedLanguage,
    );

    doc.end();
  });
}
