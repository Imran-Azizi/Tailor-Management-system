/**
 * reportPdfUtils.js — Shared utilities for professional PDF report generation
 *
 * Provides common functions for:
 * - RTL/LTR text rendering with language support
 * - Table drawing with proper styling and borders
 * - Text truncation and wrapping for multi-line support
 * - RTL-aware alignment and column mirroring
 * - Mixed RTL/LTR content handling
 */

import { drawArabicTextSync } from "./arabicRenderer.js";
import { normalizeReportPdfText } from "./reportLocale.js";

// Constants for RTL-aware rendering
const ARABIC_SCRIPT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function hasArabicScript(value) {
  return ARABIC_SCRIPT_REGEX.test(String(value || ""));
}

export function hasLatinScript(value) {
  return /[A-Za-z]/.test(String(value || ""));
}

/**
 * Write text with automatic RTL/LTR selection
 * Uses Arabic glyph-path renderer for RTL text, Helvetica for Latin text
 */
export function wt(
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

/**
 * Calculate token width in points (for RTL and LTR text)
 * Returns width of text considering font, size, and script
 */
export function tokenWidth(doc, token, fkFont, fontSize = 10) {
  const text = normalizeReportPdfText(token, "dari");
  if (!text) return 0;

  if (fkFont && hasArabicScript(text)) {
    const scale = fontSize / fkFont.unitsPerEm;
    const run = fkFont.layout(text, [], "arab", "dflt", "rtl");
    return run.positions.reduce((sum, pos) => sum + pos.xAdvance * scale, 0);
  }

  return doc.font("Helvetica").fontSize(fontSize).widthOfString(text);
}

/**
 * Truncate text to fit within width, adding ellipsis if needed
 */
export function truncateTextToWidth(doc, value, width, fkFont, fontSize = 10) {
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

/**
 * Calculate line count for wrapped text
 */
export function getWrappedLineCount(doc, value, width, fkFont, fontSize = 10) {
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

/**
 * Draw mixed RTL/LTR value with proper alignment
 * Handles numbers, spaces, and Arabic text separately for proper positioning
 */
export function drawRtlMixedValue(
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

/**
 * RTL-aware text alignment
 */
export function rtlAwareAlign(isRtl, fallback = "left") {
  return isRtl ? "right" : fallback;
}

/**
 * Mirror column positions for RTL layout
 * Flips column x positions while maintaining widths
 */
export function mirrorColumns(colMap, tableX, tableW) {
  const mirrorMap = {};
  Object.entries(colMap).forEach(([key, col]) => {
    mirrorMap[key] = {
      x: tableX + tableW - (col.x - tableX) - col.w,
      w: col.w,
      align: col.align,
    };
  });
  return mirrorMap;
}

/**
 * Draw a table header row with borders and column separators
 */
export function drawTableHeader(
  doc,
  y,
  labels,
  fkFont,
  isRtl,
  colMap,
  language = "dari",
  tableX = 40,
  tableW = 760,
  rowH = 34,
) {
  doc.save();
  doc.rect(tableX, y, tableW, rowH).fill("#FFFFFF");
  doc
    .rect(tableX, y, tableW, rowH)
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
    .filter((x) => x > tableX && x < tableX + tableW);

  boundaryXs.forEach((x) => {
    doc
      .moveTo(x, y)
      .lineTo(x, y + rowH)
      .lineWidth(0.7)
      .strokeColor("#111111")
      .stroke();
  });
  doc.restore();

  return y + rowH;
}

/**
 * Draw a table row with data and proper styling
 */
export function drawTableRow(
  doc,
  y,
  index,
  isRtl,
  colMap,
  fkFont,
  language,
  tableX = 40,
  tableW = 760,
  rowH = 34,
  cellPadX = 8,
) {
  const rowBackground = index % 2 === 0 ? "#FFFFFF" : "#FAFAFA";

  doc.save();
  doc.rect(tableX, y, tableW, rowH).fill(rowBackground);
  doc
    .rect(tableX, y, tableW, rowH)
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
    .filter((x) => x > tableX && x < tableX + tableW);

  boundaryXs.forEach((x) => {
    doc
      .moveTo(x, y)
      .lineTo(x, y + rowH)
      .lineWidth(0.5)
      .strokeColor("#DDDDDD")
      .stroke();
  });
  doc.restore();

  return y + rowH;
}

/**
 * Export all utilities as a single object for convenience
 */
export const ReportPdfUtils = {
  hasArabicScript,
  hasLatinScript,
  wt,
  tokenWidth,
  truncateTextToWidth,
  getWrappedLineCount,
  drawRtlMixedValue,
  rtlAwareAlign,
  mirrorColumns,
  drawTableHeader,
  drawTableRow,
};

export default ReportPdfUtils;
