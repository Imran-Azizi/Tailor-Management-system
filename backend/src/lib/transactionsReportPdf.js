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
  user: { x: 68, w: 108 },
  account: { x: 176, w: 74 },
  type: { x: 250, w: 74 },
  amount: { x: 324, w: 88, align: "right" },
  date: { x: 412, w: 104 },
  note: { x: 516, w: 146 },
  createdBy: { x: 662, w: 70 },
  createdAt: { x: 732, w: 68 },
};

const TEXT = {
  en: {
    title: "All Loans Report",
    generatedAt: "Generated at",
    filters: "Filters",
    search: "search",
    type: "type",
    all: "ALL",
    currentPageTotal: "Current page total",
    totalAmount: "Total Amount",
    records: "records",
    noRecords: "No loans found for the selected filters.",
    continued: "continued",
    footer: "Tailor System - Loans Report",
    columns: {
      num: "#",
      user: "User",
      account: "Account",
      type: "Type",
      amount: "Amount",
      date: "Txn Date",
      note: "Note",
      createdBy: "By",
      createdAt: "Created",
    },
    accountTypes: {
      ADMIN: "Admin",
      DOKAN: "Dokan",
      DOKHT: "Dokht",
      QICHIKAR: "Qichikar",
    },
    kinds: {
      LOAN: "Loan",
    },
  },
  dari: {
    title: "گزارش تمام قرض‌ها",
    generatedAt: "زمان تولید",
    filters: "فیلترها",
    search: "جستجو",
    type: "نوع",
    all: "همه",
    currentPageTotal: "مجموع صفحه فعلی",
    totalAmount: "مجموع مبلغ",
    records: "رکورد",
    noRecords: "برای فیلترهای انتخاب‌شده قرضی یافت نشد.",
    continued: "ادامه",
    footer: "سیستم خیاطی - گزارش قرض‌ها",
    columns: {
      num: "#",
      user: "کاربر",
      account: "حساب",
      type: "نوع",
      amount: "مبلغ",
      date: "تاریخ قرض",
      note: "یادداشت",
      createdBy: "ثبت توسط",
      createdAt: "ثبت شده",
    },
    accountTypes: {
      ADMIN: "ادمین",
      DOKAN: "دکان",
      DOKHT: "دخت",
        DOKAN: "دوکان",
        DOKHT: "دوخت",
      QICHIKAR: "قیچی‌کار",
    },
    kinds: {
      LOAN: "قرض",
    },
  },
  pashto: {
    title: "د ټولو پورونو راپور",
    generatedAt: "د جوړېدو وخت",
    filters: "فلټرونه",
    search: "لټون",
    type: "ډول",
    all: "ټول",
    currentPageTotal: "د اوسني مخ ټولیز",
    totalAmount: "ټولیزه اندازه",
    records: "ریکارډ",
    noRecords: "د ټاکل شوو فلټرونو لپاره پور ونه موندل شو.",
    continued: "دوام",
    footer: "خیاتي سیستم - د پورونو راپور",
    columns: {
      num: "#",
      user: "کارن",
      account: "اکاونټ",
      type: "ډول",
      amount: "مقدار",
      date: "د پور نېټه",
      note: "یادښت",
      createdBy: "ثبت کوونکی",
      createdAt: "ثبت وخت",
    },
    accountTypes: {
      ADMIN: "اډمین",
      DOKAN: "دوکان",
      DOKHT: "دخت",
        DOKAN: "دوکان",
        DOKHT: "دوخت",
      QICHIKAR: "قیچي‌کار",
    },
    kinds: {
      LOAN: "قرض",
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
    user: labels.columns.user,
    account: labels.columns.account,
    type: labels.columns.type,
    amount: labels.columns.amount,
    date: labels.columns.date,
    note: labels.columns.note,
    createdBy: labels.columns.createdBy,
    createdAt: labels.columns.createdAt,
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

  const accountLabel =
    labels.accountTypes[row.accountType] || row.accountType || "-";
  const kindLabel = labels.kinds[row.kind] || row.kind || "-";

  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text(String(index + 1), colMap.num.x, y + 12, {
    width: colMap.num.w,
    align: "center",
  });
  doc.text(formatMoney(row.amount, language), colMap.amount.x, y + 12, {
    width: colMap.amount.w - 4,
    align: "right",
  });

  wt(
    doc,
    truncateTextToWidth(
      doc,
      row.user?.name || "-",
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
  wt(
    doc,
    truncateTextToWidth(
      doc,
      accountLabel,
      colMap.account.w - CELL_PAD_X * 2,
      fkFont,
      9,
    ),
    colMap.account.x + CELL_PAD_X,
    y + 12,
    {
      width: colMap.account.w - CELL_PAD_X * 2,
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
      kindLabel,
      colMap.type.w - CELL_PAD_X * 2,
      fkFont,
      9,
    ),
    colMap.type.x + CELL_PAD_X,
    y + 12,
    {
      width: colMap.type.w - CELL_PAD_X * 2,
      align: rtlAwareAlign(isRtl, "left"),
    },
    fkFont,
    "#000000",
    false,
    9,
    language,
  );

  if (isRtl) {
    drawRtlMixedValue(
      doc,
      formatDateOnly(row.transactionDate, language),
      colMap.date.x + CELL_PAD_X,
      y + 12,
      colMap.date.w - CELL_PAD_X * 2,
      fkFont,
      9,
      "#000000",
      false,
      language,
    );
  } else {
    wt(
      doc,
      formatDateOnly(row.transactionDate, language),
      colMap.date.x + CELL_PAD_X,
      y + 12,
      { width: colMap.date.w - CELL_PAD_X * 2, align: "left" },
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
      row.note || "-",
      colMap.note.w - CELL_PAD_X * 2,
      fkFont,
      9,
    ),
    colMap.note.x + CELL_PAD_X,
    y + 12,
    {
      width: colMap.note.w - CELL_PAD_X * 2,
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
      row.createdBy?.name || "-",
      colMap.createdBy.w - CELL_PAD_X * 2,
      fkFont,
      9,
    ),
    colMap.createdBy.x + CELL_PAD_X,
    y + 12,
    {
      width: colMap.createdBy.w - CELL_PAD_X * 2,
      align: rtlAwareAlign(isRtl, "left"),
    },
    fkFont,
    "#000000",
    false,
    9,
    language,
  );

  if (isRtl) {
    drawRtlMixedValue(
      doc,
      formatDateOnly(row.createdAt, language),
      colMap.createdAt.x + 4,
      y + 12,
      colMap.createdAt.w - 8,
      fkFont,
      9,
      "#000000",
      false,
      language,
    );
  } else {
    wt(
      doc,
      formatDateOnly(row.createdAt, language),
      colMap.createdAt.x + 4,
      y + 12,
      { width: colMap.createdAt.w - 8, align: "left" },
      fkFont,
      "#000000",
      false,
      9,
      language,
    );
  }

  return y + ROW_H;
}

export async function buildTransactionsReportPdf({
  rows = [],
  filters = {},
  totals = {},
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
    const totalRecords = Number(totals.totalRecords || safeRows.length || 0);
    const currentPageTotal = Number(totals.currentPageTotal || 0);
    const totalAmount = safeRows.reduce(
      (sum, row) => sum + Number(row?.amount || 0),
      0,
    );
    const filterType = String(filters.typeFilter || "").trim() || labels.all;
    const filterSearch = String(filters.search || "").trim() || "-";

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

    void filterType;
    void filterSearch;
    void currentPageTotal;
    void totalRecords;

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
      label: labels.totalAmount,
      value: formatHeaderMoney(totalAmount, normalizedLanguage),
      x: headerX + 14,
      y: headerY + 74,
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
