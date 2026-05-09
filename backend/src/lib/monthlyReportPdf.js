import PDFDocument from "pdfkit";
import {
  formatReportLabelValue,
  formatMonthlyReportHeaderDateTime,
  formatReportNumber,
  normalizeReportPdfText,
  normalizeReportLanguage,
  isRtlReportLanguage,
  resolveReportText,
} from "./reportLocale.js";
import {
  AFGHANISTAN_TIMEZONE,
  getAfghanMonthDateRange,
} from "./afghanistanDate.js";
import {
  loadArabicFont,
  drawArabicTextSync,
  resolveArabicReportFontPath,
} from "./arabicRenderer.js";

const ARABIC_SCRIPT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function hasArabicScript(value) {
  return ARABIC_SCRIPT_REGEX.test(String(value || ""));
}

function hasLatinScript(value) {
  return /[A-Za-z]/.test(String(value || ""));
}

// ─── Write text (auto-selects Arabic renderer vs Helvetica) ──────────────────
// fkFont: pre-loaded fontkit font object (only for RTL mode), or null for EN
// fillColor: hex color string for the current text
// bold: whether to use bold weight (Helvetica-Bold for EN; ignored for Arabic paths)
// fontSize: current font size in points
// This is defined once before buildMonthlyReportPdf to maintain backward compatibility
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
  language = "fa",
) {
  const text = normalizeReportPdfText(rawText, language);
  if (fkFont && hasArabicScript(text)) {
    drawArabicTextSync(
      doc,
      text,
      x,
      y,
      { ...opts, fontSize },
      fkFont,
      fillColor || "#000000",
      language,
    );
  } else {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").text(text, x, y, opts);
  }
}

function fmt(value, language) {
  return formatReportNumber(value, language || "en", {
    maximumFractionDigits: 2,
  });
}

const MONTH_NAMES = {
  en: [
    "Hamal",
    "Sawr",
    "Jawza",
    "Saratan",
    "Asad",
    "Sunbula",
    "Mizan",
    "Aqrab",
    "Qaws",
    "Jadi",
    "Dalwa",
    "Hut",
  ],
  dari: [
    "حمل",
    "ثور",
    "جوزا",
    "سرطان",
    "اسد",
    "سنبله",
    "میزان",
    "عقرب",
    "قوس",
    "جدی",
    "دلو",
    "حوت",
  ],
  pashto: [
    "وری",
    "غویی",
    "غبرګولی",
    "چنګاښ",
    "زمری",
    "وږی",
    "تله",
    "لړم",
    "لیندۍ",
    "مرغومی",
    "سلواغه",
    "کب",
  ],
};

const REPORT_META_LABELS = {
  en: {
    selectedMonth: "Selected Month",
    dateRange: "Date Range",
    reportDate: "Report Date",
  },
  dari: {
    selectedMonth: "ماه انتخاب‌شده",
    dateRange: "بازه تاریخ",
    reportDate: "تاریخ گزارش",
  },
  pashto: {
    selectedMonth: "ټاکل شوې میاشت",
    dateRange: "د نېټې موده",
    reportDate: "د راپور نېټه",
  },
};

function monthName(n, language = "en") {
  const normalized = normalizeReportLanguage(language);
  const month = Number(n);
  if (!Number.isFinite(month) || month < 1 || month > 12) return String(n);
  const names = MONTH_NAMES[normalized] || MONTH_NAMES.en;
  return names[(month - 1) % 12] || String(n);
}

function formatRangeDate(date, language, isRtl) {
  const normalized = normalizeReportLanguage(language);
  const safeDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(safeDate.getTime())) return "-";

  if (normalized === "en") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: AFGHANISTAN_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(safeDate);
  }

  try {
    const parts = new Intl.DateTimeFormat("fa-AF-u-ca-persian-nu-latn", {
      timeZone: AFGHANISTAN_TIMEZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(safeDate);
    const day = parts.find((part) => part.type === "day")?.value || "-";
    const month = Number(
      parts.find((part) => part.type === "month")?.value || 0,
    );
    const year = parts.find((part) => part.type === "year")?.value || "-";
    const monthLabel = monthName(month, language);
    const result = `${day} ${monthLabel} ${year}`;
    return isRtl
      ? `\u200E${day}\u200E ${monthLabel} \u200E${year}\u200E`
      : result;
  } catch {
    return "-";
  }
}

function formatHeaderDate(date, language = "en") {
  return formatMonthlyReportHeaderDateTime(date, language);
}

function formatAfCurrency(value, language, isRtl) {
  const formatted = fmt(value, language);
  // Keep the full currency token LTR so AF remains visually on the right side.
  return isRtl ? `\u200E${formatted} AF\u200E` : `${formatted} AF`;
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

function getLocalizedTypeDisplay(order, language, isRtl) {
  const safeOrder = order || {};
  const typeLabel = orderTypeLabel(safeOrder.type, language);

  // Return only the type label without the sequence number
  return typeLabel;
}

const CELL_PAD_X = 8;

// ─── Column layout ────────────────────────────────────────────────────────────
// #   Bill   Customer   Type   Qty   Total     Discount  Paid      Remaining  Status
const COL = {
  num: { x: 40, w: 28 },
  bill: { x: 68, w: 46 },
  customer: { x: 114, w: 108 },
  type: { x: 222, w: 164 },
  qty: { x: 404, w: 34 },
  total: { x: 438, w: 78, align: "right" },
  discount: { x: 516, w: 70, align: "right" },
  paid: { x: 586, w: 70, align: "right" },
  remaining: { x: 656, w: 78, align: "right" },
  status: { x: 734, w: 66 },
};

const TABLE_X = 40;
const TABLE_W = 760;
const ROW_H = 34;
const FOOTER_THRESHOLD_MARGIN = 56;

function rtlAwareAlign(isRtl, fallback = "left") {
  return isRtl ? "right" : fallback;
}

function tokenWidth(doc, token, fkFont, fontSize = 10) {
  const text = normalizeReportPdfText(token, "dari");
  if (!text) return 0;

  if (fkFont && hasArabicScript(text)) {
    const scale = fontSize / fkFont.unitsPerEm;
    const run = fkFont.layout(text, [], "arab", "dflt", "rtl");
    return run.positions.reduce((sum, pos) => sum + pos.xAdvance * scale, 0);
  }

  return doc.font("Helvetica").fontSize(fontSize).widthOfString(text);
}

function truncateTextToWidth(doc, value, width, fkFont, fontSize = 10) {
  const text = normalizeReportPdfText(value, "dari");
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
  const text = normalizeReportPdfText(value, "dari");
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

function drawRtlMixedValue(
  doc,
  value,
  x,
  y,
  width,
  fkFont,
  fontSize = 10,
  fillColor = "#000000",
  bold = false,
  language = "dari",
) {
  const text = normalizeReportPdfText(value, language);
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
  {
    label,
    value,
    x,
    y,
    width,
    language,
    isRtl,
    fkFont,
    labelWidth = 170,
    fontSize = 10,
  },
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
    const valueX = x;

    wt(
      doc,
      safeLabel,
      labelX,
      y,
      { width: labelW, align: "right", lineBreak: false },
      fkFont,
      "#000000",
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
      "#000000",
      false,
      fontSize,
    );
    drawRtlMixedValue(
      doc,
      safeValue,
      valueX,
      y,
      valueW,
      fkFont,
      fontSize,
      "#000000",
      false,
      language,
    );
    return;
  }

  const metaLine = formatReportLabelValue(safeLabel, safeValue, language, ":");
  const dynamicLabelWidth = Math.min(
    Math.max(tokenWidth(doc, safeLabel, fkFont, fontSize) + 14, 94),
    168,
  );
  const resolvedLabelWidth = Math.min(labelWidth, dynamicLabelWidth);
  wt(
    doc,
    metaLine,
    x,
    y,
    { width, align: isRtl ? "right" : "left", lineBreak: false },
    fkFont,
    "#000000",
    false,
    fontSize,
  );
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

function drawTableHeader(
  doc,
  y,
  labels,
  fkFont,
  isRtl,
  colMap,
  language = "dari",
) {
  doc.save();
  doc.rect(TABLE_X, y, TABLE_W, ROW_H).fill("#FFFFFF");
  doc
    .rect(TABLE_X, y, TABLE_W, ROW_H)
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
      .lineTo(x, y + ROW_H)
      .lineWidth(0.7)
      .strokeColor("#111111")
      .stroke();
  });
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
      c.x + 3,
      y + 10,
      {
        width: Math.max(c.w - 6, 8),
        align:
          key === "num" || key === "bill" || key === "qty"
            ? "center"
            : rtlAwareAlign(isRtl, c.align || "left"),
      },
      fkFont,
      "#000000",
      true,
      9.5,
      language,
    );
  });

  return y + ROW_H;
}

function drawRow(
  doc,
  y,
  index,
  order,
  fkFont,
  language,
  labels,
  isRtl,
  colMap,
) {
  const c = colMap;
  const cellTextWidth = (col) => Math.max(col.w - CELL_PAD_X * 2, 8);
  const isEmergency = Boolean(order.isEmergency) && !order.isCompleted;
  const isDamageOrder = Boolean(order.isDamageOrder);
  const statusLabel = isDamageOrder
    ? labels.statusDamageOrder || "Damage Order"
    : isEmergency
      ? labels.statusEmergency || "Emergency"
      : order.isCompleted
        ? labels.statusDone
        : labels.statusPending;
  const statusLineCount = getWrappedLineCount(
    doc,
    statusLabel,
    cellTextWidth(c.status),
    fkFont,
    8.7,
  );
  const rowHeight = Math.max(ROW_H, 18 + statusLineCount * 10);
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

  // Numeric columns — always ASCII, plain Helvetica
  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text(String(index + 1), c.num.x, y + 12, {
    width: c.num.w,
    align: "center",
  });
  doc.text(String(order.customer?.billNumber ?? "-"), c.bill.x, y + 12, {
    width: c.bill.w,
    align: "center",
  });
  doc.text(String(order.quantity ?? 1), c.qty.x, y + 12, {
    width: c.qty.w,
    align: "center",
  });
  doc.text(fmt(order.totalPrice, language), c.total.x, y + 12, {
    width: c.total.w - 4,
    align: "right",
  });
  doc.text(fmt(order.discount, language), c.discount.x, y + 12, {
    width: c.discount.w - 4,
    align: "right",
  });
  doc.text(fmt(order.paidAmount, language), c.paid.x, y + 12, {
    width: c.paid.w - 4,
    align: "right",
  });

  const rem = Number(order.remaining ?? 0);
  doc.fillColor("#000000");
  doc.text(fmt(rem, language), c.remaining.x, y + 12, {
    width: c.remaining.w - 4,
    align: "right",
  });

  const customerRaw = String(order.customer?.firstName || "-");
  const customerText = truncateTextToWidth(
    doc,
    customerRaw,
    cellTextWidth(c.customer),
    fkFont,
    8.8,
  );

  wt(
    doc,
    customerText,
    c.customer.x + CELL_PAD_X,
    y + 12,
    {
      width: cellTextWidth(c.customer),
      align: rtlAwareAlign(isRtl, "left"),
      ellipsis: true,
      lineBreak: false,
    },
    fkFont,
    "#000000",
    false,
    8.8,
    language,
  );
  const typeText = getLocalizedTypeDisplay(order, language, isRtl);
  const displayTypeText = truncateTextToWidth(
    doc,
    typeText,
    cellTextWidth(c.type),
    fkFont,
    8.8,
  );
  wt(
    doc,
    displayTypeText,
    c.type.x + CELL_PAD_X,
    y + 12,
    {
      width: cellTextWidth(c.type),
      align: rtlAwareAlign(isRtl, "left"),
      ellipsis: true,
      lineBreak: false,
    },
    fkFont,
    "#000000",
    false,
    8.8,
    language,
  );

  wt(
    doc,
    statusLabel,
    c.status.x + CELL_PAD_X,
    y + 8,
    {
      width: cellTextWidth(c.status),
      align: rtlAwareAlign(isRtl, "left"),
      lineBreak: true,
    },
    fkFont,
    "#000000",
    true,
    8.7,
    language,
  );

  return y + rowHeight;
}

function ensurePageSpace(doc, y, requiredHeight) {
  const maxY = doc.page.height - FOOTER_THRESHOLD_MARGIN;
  if (y + requiredHeight <= maxY) return y;
  doc.addPage();
  return 40;
}

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
  const netBenefit =
    Number(stats.totalRakhtRevenue || 0) + Number(stats.totalOrderBenefit || 0);

  const cards = [
    {
      label: statLabels.netBenefit || "Net Benefit",
      value: formatAfCurrency(netBenefit, language, isRtl),
    },
    {
      label: statLabels.totalAmount,
      value: formatAfCurrency(stats.totalRevenue || 0, language, isRtl),
    },
    {
      label: statLabels.collected,
      value: formatAfCurrency(stats.totalPaid || 0, language, isRtl),
    },
    {
      label: statLabels.outstanding,
      value: formatAfCurrency(stats.totalRemaining || 0, language, isRtl),
    },
    {
      label: statLabels.totalOrderBenefit,
      value: formatAfCurrency(stats.totalOrderBenefit || 0, language, isRtl),
    },
    {
      label: statLabels.totalRakhtRevenue,
      value: formatAfCurrency(stats.totalRakhtRevenue || 0, language, isRtl),
    },
    {
      label: statLabels.totalDailyExpenses,
      value: formatAfCurrency(stats.totalDailyExpenses || 0, language, isRtl),
    },
    {
      label: statLabels.totalRakhtPrice,
      value: formatAfCurrency(stats.totalRakhtPrice || 0, language, isRtl),
    },
    {
      label: statLabels.totalLoan,
      value: formatAfCurrency(stats.totalLoan || 0, language, isRtl),
    },
    {
      label: statLabels.totalQichikarUsersMoney,
      value: formatAfCurrency(
        stats.totalQichikarUsersMoney || 0,
        language,
        isRtl,
      ),
    },
    {
      label: statLabels.totalDokhtUsersMoney,
      value: formatAfCurrency(stats.totalDokhtUsersMoney || 0, language, isRtl),
    },
    {
      label: statLabels.totalOrders,
      value: formatReportNumber(stats.totalOrders || 0, "en"),
    },
    {
      label: statLabels.emergency,
      value: formatReportNumber(stats.emergencyOrders || 0, "en"),
    },
  ];

  const cardsPerRow = 3;
  const gap = 8;
  const cardHeight = 58;
  const cardWidth = (TABLE_W - gap * (cardsPerRow - 1)) / cardsPerRow;

  let cursorY = y;
  const rowCount = Math.ceil(cards.length / cardsPerRow);

  for (let row = 0; row < rowCount; row += 1) {
    cursorY = ensurePageSpace(doc, cursorY, cardHeight + gap);
    const rowCards = cards.slice(
      row * cardsPerRow,
      row * cardsPerRow + cardsPerRow,
    );

    rowCards.forEach((card, col) => {
      const visualCol = isRtl ? rowCards.length - 1 - col : col;
      const x = TABLE_X + visualCol * (cardWidth + gap);

      doc.save();
      doc.rect(x, cursorY, cardWidth, cardHeight).fill("#FFFFFF");
      doc
        .rect(x, cursorY, cardWidth, cardHeight)
        .lineWidth(1)
        .strokeColor("#DDDDDD")
        .stroke();
      doc.restore();

      const textX = x + 10;
      const textW = cardWidth - 20;
      const label = String(card.label || "-");
      const safeLabel = truncateTextToWidth(doc, label, textW, fkFont, 8.6);

      wt(
        doc,
        safeLabel,
        textX,
        cursorY + 8,
        {
          width: textW,
          align: rtlAwareAlign(isRtl, "left"),
          ellipsis: true,
          lineBreak: false,
        },
        fkFont,
        "#333333",
        false,
        8.6,
      );

      if (isRtl) {
        drawRtlMixedValue(
          doc,
          card.value,
          textX,
          cursorY + 28,
          textW,
          fkFont,
          10.6,
          "#000000",
          true,
        );
      } else {
        doc
          .font("Helvetica-Bold")
          .fontSize(10.6)
          .fillColor("#000000")
          .text(card.value, textX, cursorY + 28, {
            width: textW,
            align: "left",
            lineBreak: false,
          });
      }
    });

    cursorY += cardHeight + gap;
  }

  return cursorY - gap;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function buildMonthlyReportPdf({
  month,
  year,
  orders,
  dashboardStats = null,
  language = "en",
}) {
  const labels = resolveReportText(language).monthly;
  const isRtl = isRtlReportLanguage(language);

  // Pre-load the Arabic fontkit font for glyph-path rendering
  let fkFont = null;
  if (isRtl) {
    try {
      const fontPath = resolveArabicReportFontPath();
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
    const normalizedLanguage = normalizeReportLanguage(language);
    const reportMetaLabels =
      REPORT_META_LABELS[normalizedLanguage] || REPORT_META_LABELS.en;

    // Create a language-aware wrapper for wt() that automatically passes the language parameter
    const wtLang = (doc, text, x, y, opts, fkFont, fillColor, bold, fontSize) =>
      wt(
        doc,
        text,
        x,
        y,
        opts,
        fkFont,
        fillColor,
        bold,
        fontSize,
        normalizedLanguage,
      );

    const safeMonth = Number(month);
    const safeYear = Number(year);

    let monthRange = null;
    try {
      monthRange = getAfghanMonthDateRange({
        month: safeMonth,
        year: safeYear,
      });
    } catch {
      monthRange = null;
    }

    const selectedMonthLabel =
      normalizedLanguage === "en" && monthRange
        ? new Intl.DateTimeFormat("en-US", {
            timeZone: AFGHANISTAN_TIMEZONE,
            month: "long",
            year: "numeric",
          }).format(monthRange.start)
        : `${monthName(safeMonth, language)} ${safeYear}`;
    const dateRangeLabel = monthRange
      ? isRtl
        ? `${formatRangeDate(monthRange.start, language, isRtl)} تا ${formatRangeDate(monthRange.end, language, isRtl)}`
        : `${formatRangeDate(monthRange.start, language, isRtl)} - ${formatRangeDate(monthRange.end, language, isRtl)}`
      : "-";

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
    // Header
    const pageW = doc.page.width;
    const headerX = TABLE_X;
    const headerY = 22;
    const headerH = 116;
    const reportDate = formatHeaderDate(new Date(), language);

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
      labels.title,
      headerX + 14,
      headerY + 12,
      { width: TABLE_W - 28, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#000000",
      true,
      17,
      normalizedLanguage,
    );

    drawHeaderMetaLine(doc, {
      label: reportMetaLabels.selectedMonth,
      value: selectedMonthLabel,
      language,
      x: headerX + 14,
      y: headerY + 44,
      width: TABLE_W - 28,
      isRtl,
      fkFont,
      labelWidth: 168,
      fontSize: 10,
    });
    drawHeaderMetaLine(doc, {
      label: reportMetaLabels.dateRange,
      value: dateRangeLabel,
      language,
      x: headerX + 14,
      y: headerY + 64,
      width: TABLE_W - 28,
      isRtl,
      fkFont,
      labelWidth: 168,
      fontSize: 10,
    });
    drawHeaderMetaLine(doc, {
      label: reportMetaLabels.reportDate,
      value: reportDate,
      language,
      x: headerX + 14,
      y: headerY + 84,
      width: TABLE_W - 28,
      isRtl,
      fkFont,
      labelWidth: 168,
      fontSize: 9.6,
    });

    // Summary
    let y = headerY + headerH + 16;
    wt(
      doc,
      labels.summary || "Summary",
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
    y = ensurePageSpace(doc, y, 320);
    y = drawDashboardStatsCards(
      doc,
      y,
      labels,
      dashboardStats || {
        totalRakhtRevenue: 0,
        totalOrderBenefit: 0,
        totalOrders: safeOrders.length,
        totalRevenue,
        totalPaid,
        totalRemaining,
        totalDailyExpenses: 0,
        totalRakhtPrice: 0,
        totalLoan: 0,
        totalQichikarUsersMoney: 0,
        totalDokhtUsersMoney: 0,
        emergencyOrders: 0,
        yearOrders: safeOrders.length,
      },
      language,
      fkFont,
      isRtl,
    );

    // ── Divider ───────────────────────────────────────────────────────────────
    y += 10;
    y = ensurePageSpace(doc, y, 70);
    doc
      .moveTo(40, y)
      .lineTo(pageW - TABLE_X, y)
      .lineWidth(1)
      .strokeColor("#DDDDDD")
      .stroke();
    y += 12;

    wt(
      doc,
      labels.orderRecords,
      40,
      y,
      { width: TABLE_W, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#000000",
      true,
      12.5,
      normalizedLanguage,
    );
    y += 28;

    // ── Table ─────────────────────────────────────────────────────────────────
    if (safeOrders.length === 0) {
      wt(
        doc,
        labels.noOrders,
        40,
        y + 8,
        { width: TABLE_W, align: rtlAwareAlign(isRtl, "left") },
        fkFont,
        "#333333",
        false,
        11,
        normalizedLanguage,
      );
    } else {
      const colMap = isRtl ? COL_RTL : COL;
      y = drawTableHeader(
        doc,
        y,
        labels,
        fkFont,
        isRtl,
        colMap,
        normalizedLanguage,
      );

      const footerThreshold = doc.page.height - FOOTER_THRESHOLD_MARGIN;

      safeOrders.forEach((order, index) => {
        if (y + ROW_H > footerThreshold) {
          doc.addPage();
          y = 40;
          wt(
            doc,
            `${labels.title} — ${selectedMonthLabel} (${labels.continued})`,
            40,
            y,
            { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
            fkFont,
            "#000000",
            true,
            10,
            normalizedLanguage,
          );
          y += 28;
          y = drawTableHeader(
            doc,
            y,
            labels,
            fkFont,
            isRtl,
            colMap,
            normalizedLanguage,
          );
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
      doc.rect(TABLE_X, y, TABLE_W, ROW_H).fill("#FFFFFF");
      doc
        .rect(TABLE_X, y, TABLE_W, ROW_H)
        .lineWidth(1)
        .strokeColor("#111111")
        .stroke();

      const totalsBoundaryXs = Array.from(
        new Set(
          Object.values(colMap)
            .map((col) => Number(col.x))
            .filter(Boolean),
        ),
      )
        .sort((a, b) => a - b)
        .filter((x) => x > TABLE_X && x < TABLE_X + TABLE_W);

      totalsBoundaryXs.forEach((x) => {
        doc
          .moveTo(x, y)
          .lineTo(x, y + ROW_H)
          .lineWidth(0.7)
          .strokeColor("#111111")
          .stroke();
      });
      doc.restore();

      // Right-align totals label for RTL
      wt(
        doc,
        labels.totals,
        colMap.customer.x,
        y + (isRtl ? 7 : 6),
        {
          width: colMap.customer.w,
          align: isRtl ? "right" : rtlAwareAlign(isRtl, "left"),
        },
        fkFont,
        "#000000",
        true,
        isRtl ? 9.3 : 9.5,
        normalizedLanguage,
      );
      // Totals values are numbers — always Helvetica
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000000");
      doc.text(fmt(totalRevenue, language), colMap.total.x, y + 9, {
        width: colMap.total.w,
        align: "right",
      });
      doc.text(fmt(totalDiscount, language), colMap.discount.x, y + 9, {
        width: colMap.discount.w,
        align: "right",
      });
      doc.text(fmt(totalPaid, language), colMap.paid.x, y + 9, {
        width: colMap.paid.w,
        align: "right",
      });
      doc.text(fmt(totalRemaining, language), colMap.remaining.x, y + 9, {
        width: colMap.remaining.w,
        align: "right",
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    // Footer: use localized separator and RTL order
    const footerSep = isRtl ? "—" : "—";
    const footerText = isRtl
      ? `${year} ${monthName(month, language)} ${labels.title} ${footerSep} ${labels.footerPrefix}`
      : `${labels.footerPrefix} ${footerSep} ${labels.title} ${monthName(month, language)} ${year}`;
    wt(
      doc,
      footerText,
      40,
      doc.page.height - 26,
      { width: pageW - 80, align: isRtl ? "right" : "center" },
      fkFont,
      "#333333",
      false,
      8,
      normalizedLanguage,
    );

    doc.end();
  });
}
