import PDFDocument from "pdfkit";
import {
  formatReportLabelValue,
  formatReportDateTime,
  formatReportNumber,
  isRtlReportLanguage,
  normalizeReportPdfText,
  normalizeReportLanguage,
} from "./reportLocale.js";
import {
  loadArabicFont,
  resolveArabicReportFontPath,
} from "./arabicRenderer.js";
import {
  wt,
  tokenWidth,
  truncateTextToWidth,
  rtlAwareAlign,
  mirrorColumns,
  drawRtlMixedValue,
} from "./reportPdfUtils.js";

const TABLE_X = 40;
const TABLE_W = 760;
const ROW_H = 34;
const FOOTER_THRESHOLD_MARGIN = 56;
const CELL_PAD_X = 8;
const CURRENCY_GAP = "  ";

const COL = {
  num: { x: 40, w: 28 },
  company: { x: 68, w: 180 },
  total: { x: 248, w: 90, align: "right" },
  paid: { x: 338, w: 90, align: "right" },
  remaining: { x: 428, w: 96, align: "right" },
  status: { x: 524, w: 92 },
  paidAt: { x: 616, w: 116 },
  user: { x: 732, w: 68 },
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
      paidAt: "Date",
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
      paidAt: "تاریخ",
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
      paidAt: "نېټه",
      user: "کارن",
    },
    statuses: {
      PAID: "ورکړل شوی",
      PARTIAL: "نیمه ورکړه",
      REMAINING: "پاتې",
    },
  },
};

function formatMoney(value, language) {
  const formatted = formatReportNumber(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const normalized = normalizeReportLanguage(language);
  const isRtl = normalized === "dari" || normalized === "pashto";
  return isRtl
    ? `\u200E${formatted}${CURRENCY_GAP}AF\u200E`
    : `${formatted}${CURRENCY_GAP}AF`;
}

function formatHeaderMoney(value, language) {
  const formatted = String(
    formatReportNumber(value, language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  ).replace(/\u200E/g, "");
  const normalized = normalizeReportLanguage(language);
  const isRtl = normalized === "dari" || normalized === "pashto";

  // In RTL meta-line rendering, first token appears on the visual right.
  return isRtl
    ? `AF${CURRENCY_GAP}${formatted}`
    : `${formatted}${CURRENCY_GAP}AF`;
}

function formatDateOnly(value, language) {
  return formatReportDateTime(value, language, {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: undefined,
    minute: undefined,
  });
}

function resolveStatus(row, labels) {
  const remaining = Number(row?.remainingAfter || 0);
  const paid = Number(row?.totalPaidAfter || 0);
  if (remaining <= 0) return { key: "PAID", color: "#15803D" };
  if (paid > 0) return { key: "PARTIAL", color: "#B45309" };
  return { key: "REMAINING", color: "#DC2626" };
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

    // Render currency values with a fixed visual gap between AF and amount.
    const currencyMatch = safeValue.match(/^AF\s+(.+)$/i);
    if (currencyMatch) {
      const numberPart = String(currencyMatch[1] || "").trim() || "0";
      const afLabel = "AF";
      const afW = Math.max(tokenWidth(doc, afLabel, fkFont, fontSize), 12);
      const moneyGap = 7;
      const rightEdge = x + valueW;
      const afX = rightEdge - afW;
      const numberBoxW = Math.max(valueW - afW - moneyGap, 72);

      wt(
        doc,
        afLabel,
        afX,
        y,
        { width: afW + 1, align: "left", lineBreak: false },
        fkFont,
        "#475569",
        false,
        fontSize,
        language,
      );

      drawRtlMixedValue(
        doc,
        numberPart,
        x,
        y,
        numberBoxW,
        fkFont,
        fontSize,
        "#475569",
        false,
        language,
      );
      return;
    }

    drawRtlMixedValue(
      doc,
      safeValue,
      x,
      y,
      valueW,
      fkFont,
      fontSize,
      "#475569",
      false,
      language,
    );
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

function drawHeaderRow(doc, y, labels, fkFont, isRtl, colMap, language) {
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
      c.x + 3,
      y + 10,
      {
        width: Math.max(c.w - 6, 8),
        align:
          key === "num" ? "center" : rtlAwareAlign(isRtl, c.align || "left"),
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

function drawRow(doc, y, index, row, labels, fkFont, isRtl, colMap, language) {
  const rowBackground = index % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
  const status = resolveStatus(row, labels);
  const statusLabel = labels.statuses[status.key] || status.key;

  doc.save();
  doc.rect(TABLE_X, y, TABLE_W, ROW_H).fill(rowBackground);
  doc
    .rect(TABLE_X, y, TABLE_W, ROW_H)
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
      .lineTo(x, y + ROW_H)
      .lineWidth(0.5)
      .strokeColor("#DDDDDD")
      .stroke();
  });
  doc.restore();

  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text(String(index + 1), colMap.num.x, y + 12, {
    width: colMap.num.w,
    align: "center",
  });
  doc.text(formatMoney(row.totalPriceAfter, language), colMap.total.x, y + 12, {
    width: colMap.total.w - 4,
    align: "right",
  });
  doc.text(formatMoney(row.paidAmount, language), colMap.paid.x, y + 12, {
    width: colMap.paid.w - 4,
    align: "right",
  });
  doc.fillColor(
    status.key === "PAID"
      ? "#15803D"
      : status.key === "PARTIAL"
        ? "#B45309"
        : "#DC2626",
  );
  doc.text(
    formatMoney(row.remainingAfter, language),
    colMap.remaining.x,
    y + 12,
    {
      width: colMap.remaining.w - 4,
      align: "right",
    },
  );

  wt(
    doc,
    truncateTextToWidth(
      doc,
      row.companyName || "-",
      colMap.company.w - CELL_PAD_X * 2,
      fkFont,
      9,
    ),
    colMap.company.x + CELL_PAD_X,
    y + 12,
    {
      width: colMap.company.w - CELL_PAD_X * 2,
      align: rtlAwareAlign(isRtl, "left"),
    },
    fkFont,
    "#000000",
    false,
    9,
    language,
  );
  wt(
    doc,
    truncateTextToWidth(
      doc,
      statusLabel,
      colMap.status.w - CELL_PAD_X * 2,
      fkFont,
      9,
    ),
    colMap.status.x + CELL_PAD_X,
    y + 12,
    {
      width: colMap.status.w - CELL_PAD_X * 2,
      align: rtlAwareAlign(isRtl, "left"),
    },
    fkFont,
    status.color,
    true,
    9,
    language,
  );

  if (isRtl) {
    drawRtlMixedValue(
      doc,
      formatDateOnly(row.paidAt, language),
      colMap.paidAt.x + CELL_PAD_X,
      y + 12,
      colMap.paidAt.w - CELL_PAD_X * 2,
      fkFont,
      9,
      "#000000",
      false,
      language,
    );
  } else {
    wt(
      doc,
      formatDateOnly(row.paidAt, language),
      colMap.paidAt.x + CELL_PAD_X,
      y + 12,
      { width: colMap.paidAt.w - CELL_PAD_X * 2, align: "left" },
      fkFont,
      "#000000",
      false,
      9,
      language,
    );
  }

  wt(
    doc,
    truncateTextToWidth(
      doc,
      row.paidBy?.name || "-",
      colMap.user.w - CELL_PAD_X * 2,
      fkFont,
      9,
    ),
    colMap.user.x + CELL_PAD_X,
    y + 12,
    {
      width: colMap.user.w - CELL_PAD_X * 2,
      align: rtlAwareAlign(isRtl, "left"),
    },
    fkFont,
    "#000000",
    false,
    9,
    language,
  );

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
    const fontPath = resolveArabicReportFontPath();
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

    void activeFilters;

    drawHeaderMetaLine(doc, {
      label: labels.generatedAt,
      value: formatDateOnly(new Date(), normalizedLanguage),
      x: headerX + 14,
      y: headerY + 44,
      width: TABLE_W - 28,
      isRtl,
      fkFont,
      language: normalizedLanguage,
      fontSize: 10,
    });
    drawHeaderMetaLine(doc, {
      label: labels.totalPaid,
      value: formatHeaderMoney(summary.totalPaid || 0, normalizedLanguage),
      x: headerX + 14,
      y: headerY + 68,
      width: TABLE_W - 28,
      isRtl,
      fkFont,
      language: normalizedLanguage,
      fontSize: 10,
    });
    drawHeaderMetaLine(doc, {
      label: labels.totalRemaining,
      value: formatHeaderMoney(summary.totalRemaining || 0, normalizedLanguage),
      x: headerX + 14,
      y: headerY + 88,
      width: TABLE_W - 28,
      isRtl,
      fkFont,
      language: normalizedLanguage,
      fontSize: 10,
    });

    let y = headerY + headerH + 16;
    wt(
      doc,
      labels.records,
      TABLE_X,
      y,
      { width: TABLE_W, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#000000",
      true,
      12,
      normalizedLanguage,
    );
    y += 18;
    y = drawHeaderRow(
      doc,
      y,
      labels,
      fkFont,
      isRtl,
      colMap,
      normalizedLanguage,
    );
    const footerThreshold = doc.page.height - FOOTER_THRESHOLD_MARGIN;

    if (safeRows.length === 0) {
      wt(
        doc,
        labels.noRecords,
        44,
        y + 10,
        { width: TABLE_W - 8, align: rtlAwareAlign(isRtl, "left") },
        fkFont,
        "#64748B",
        false,
        10,
        normalizedLanguage,
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
            normalizedLanguage,
          );
          y = drawHeaderRow(
            doc,
            y + 16,
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
          row,
          labels,
          fkFont,
          isRtl,
          colMap,
          normalizedLanguage,
        );
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
      normalizedLanguage,
    );

    doc.end();
  });
}
