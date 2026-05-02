import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  formatReportDateTime,
  formatReportNumber,
  isRtlReportLanguage,
  normalizeReportLanguage,
} from "./reportLocale.js";
import { loadArabicFont, drawArabicTextSync } from "./arabicRenderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARABIC_SCRIPT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const TABLE_X = 40;
const TABLE_W = 760;
const ROW_H = 24;
const FOOTER_MARGIN = 56;

const COL = {
  num: { x: 40, w: 24 },
  user: { x: 64, w: 110 },
  account: { x: 174, w: 70 },
  type: { x: 244, w: 72 },
  amount: { x: 316, w: 70, align: "right" },
  date: { x: 386, w: 88 },
  note: { x: 474, w: 180 },
  createdBy: { x: 654, w: 78 },
  createdAt: { x: 732, w: 68 },
};

const TEXT = {
  en: {
    title: "All Transactions Report",
    generatedAt: "Generated at",
    filters: "Filters",
    search: "search",
    type: "type",
    all: "ALL",
    currentPageTotal: "Current page total",
    records: "records",
    noRecords: "No transactions found for the selected filters.",
    continued: "continued",
    footer: "Tailor System - Transactions Report",
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
    title: "گزارش تمام تراکنش‌ها",
    generatedAt: "زمان تولید",
    filters: "فیلترها",
    search: "جستجو",
    type: "نوع",
    all: "همه",
    currentPageTotal: "مجموع صفحه فعلی",
    records: "رکورد",
    noRecords: "برای فیلترهای انتخاب‌شده تراکنشی یافت نشد.",
    continued: "ادامه",
    footer: "سیستم خیاطی - گزارش تراکنش‌ها",
    columns: {
      num: "#",
      user: "کاربر",
      account: "حساب",
      type: "نوع",
      amount: "مبلغ",
      date: "تاریخ تراکنش",
      note: "یادداشت",
      createdBy: "ثبت توسط",
      createdAt: "ثبت شده",
    },
    accountTypes: {
      ADMIN: "ادمین",
      DOKAN: "دکان",
      DOKHT: "دخت",
      QICHIKAR: "قیچی‌کار",
    },
    kinds: {
      LOAN: "قرض",
    },
  },
  pashto: {
    title: "د ټولو راکړو ورکړو راپور",
    generatedAt: "د جوړېدو وخت",
    filters: "فلټرونه",
    search: "لټون",
    type: "ډول",
    all: "ټول",
    currentPageTotal: "د اوسني مخ ټولیز",
    records: "ریکارډ",
    noRecords: "د ټاکل شوو فلټرونو لپاره راکړه ورکړه ونه موندل شوه.",
    continued: "دوام",
    footer: "خیاتي سیستم - د راکړو ورکړو راپور",
    columns: {
      num: "#",
      user: "کارن",
      account: "اکاونټ",
      type: "ډول",
      amount: "مقدار",
      date: "د راکړې نېټه",
      note: "یادښت",
      createdBy: "ثبت کوونکی",
      createdAt: "ثبت وخت",
    },
    accountTypes: {
      ADMIN: "اډمین",
      DOKAN: "دوکان",
      DOKHT: "دخت",
      QICHIKAR: "قیچي‌کار",
    },
    kinds: {
      LOAN: "قرض",
    },
  },
};

function hasArabicScript(value) {
  return ARABIC_SCRIPT_REGEX.test(String(value || ""));
}

function rtlAwareAlign(isRtl, fallback = "left") {
  return isRtl ? "right" : fallback;
}

function truncate(value, maxLength = 42) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function resolveArabicFontPath() {
  const candidates = [
    process.env.PDF_REPORT_FONT_PATH,
    process.env.PDF_DARI_PASHTO_FONT_PATH,
    process.env.PDF_BAHIJ_FONT_PATH,
    process.env.PDF_VAZIRMATN_FONT_PATH,
    process.env.PDF_ARABIC_FONT_PATH,
    path.join(__dirname, "../fonts/Vazirmatn-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNaskhArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoSansArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNastaliqUrdu-Regular.ttf"),
    "C:/Windows/Fonts/bahij.ttf",
    "C:/Windows/Fonts/bahij-zar.ttf",
    "C:/Windows/Fonts/Bahij_Zar.ttf",
    "C:/Windows/Fonts/Bahij Zar.ttf",
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

function mirrorColumns(columns, tableX, tableWidth) {
  return Object.fromEntries(
    Object.entries(columns).map(([key, col]) => [
      key,
      { ...col, x: tableX + tableWidth - (col.x - tableX) - col.w },
    ]),
  );
}

function wt(
  doc,
  text,
  x,
  y,
  opts,
  fkFont,
  fillColor,
  bold = false,
  fontSize = 10,
) {
  const safe = String(text ?? "");
  if (fkFont && hasArabicScript(safe)) {
    drawArabicTextSync(
      doc,
      safe,
      x,
      y,
      { ...opts, fontSize },
      fkFont,
      fillColor || "#000000",
    );
    return;
  }
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(fontSize)
    .fillColor(fillColor || "#0F172A")
    .text(safe, x, y, opts);
}

function formatMoney(value, language) {
  return `${formatReportNumber(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} AF`;
}

function drawHeaderRow(doc, y, labels, fkFont, isRtl, colMap) {
  doc.save();
  doc.roundedRect(TABLE_X, y, TABLE_W, ROW_H, 3).fill("#1E293B");
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
      c.x,
      y + 7,
      { width: c.w, align: rtlAwareAlign(isRtl, c.align || "left") },
      fkFont,
      "#FFFFFF",
      true,
      9.5,
    );
  });

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
    const fontPath = resolveArabicFontPath();
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
    const filterType = String(filters.typeFilter || "").trim() || labels.all;
    const filterSearch = String(filters.search || "").trim() || "-";

    wt(
      doc,
      labels.title,
      40,
      36,
      { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#0F172A",
      true,
      19,
    );
    wt(
      doc,
      `${labels.generatedAt}: ${formatReportDateTime(new Date(), normalizedLanguage)}`,
      40,
      60,
      { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#475569",
      false,
      10,
    );
    wt(
      doc,
      `${labels.filters}: ${labels.search}=${filterSearch}, ${labels.type}=${filterType}`,
      40,
      76,
      { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#334155",
      false,
      10,
    );
    wt(
      doc,
      `${labels.currentPageTotal}: ${formatMoney(currentPageTotal, normalizedLanguage)} | ${labels.records}: ${formatReportNumber(totalRecords, normalizedLanguage)}`,
      40,
      92,
      { width: pageW - 80, align: rtlAwareAlign(isRtl, "left") },
      fkFont,
      "#0F172A",
      true,
      10,
    );

    let y = 118;
    y = drawHeaderRow(doc, y, labels, fkFont, isRtl, colMap);
    const footerThreshold = doc.page.height - FOOTER_MARGIN;

    if (safeRows.length === 0) {
      wt(
        doc,
        labels.noRecords,
        44,
        y + 8,
        { width: TABLE_W - 8, align: rtlAwareAlign(isRtl, "left") },
        fkFont,
        "#64748B",
        false,
        10,
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
          );
          y = drawHeaderRow(doc, y + 16, labels, fkFont, isRtl, colMap);
        }

        if (index % 2 === 0) {
          doc.save();
          doc.rect(TABLE_X, y, TABLE_W, ROW_H).fill("#F8FAFC");
          doc.restore();
        }

        const accountLabel =
          labels.accountTypes[row.accountType] || row.accountType || "-";
        const kindLabel = labels.kinds[row.kind] || row.kind || "-";

        doc.font("Helvetica").fontSize(9.5).fillColor("#0F172A");
        doc.text(String(index + 1), colMap.num.x, y + 6, {
          width: colMap.num.w,
          align: rtlAwareAlign(isRtl, "left"),
        });
        doc.text(
          formatMoney(row.amount, normalizedLanguage),
          colMap.amount.x,
          y + 6,
          {
            width: colMap.amount.w,
            align: "right",
          },
        );

        wt(
          doc,
          row.user?.name || "-",
          colMap.user.x,
          y + 6,
          { width: colMap.user.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          9.5,
        );
        wt(
          doc,
          accountLabel,
          colMap.account.x,
          y + 6,
          { width: colMap.account.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          9.5,
        );
        wt(
          doc,
          kindLabel,
          colMap.type.x,
          y + 6,
          { width: colMap.type.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          9.5,
        );
        wt(
          doc,
          formatReportDateTime(row.transactionDate, normalizedLanguage),
          colMap.date.x,
          y + 6,
          { width: colMap.date.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          9.5,
        );
        wt(
          doc,
          truncate(row.note || "-", 56),
          colMap.note.x,
          y + 6,
          { width: colMap.note.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          9.5,
        );
        wt(
          doc,
          row.createdBy?.name || "-",
          colMap.createdBy.x,
          y + 6,
          { width: colMap.createdBy.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          9.5,
        );
        wt(
          doc,
          formatReportDateTime(row.createdAt, normalizedLanguage),
          colMap.createdAt.x,
          y + 6,
          { width: colMap.createdAt.w, align: rtlAwareAlign(isRtl, "left") },
          fkFont,
          "#0F172A",
          false,
          9.5,
        );

        y += ROW_H;
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
    );

    doc.end();
  });
}
