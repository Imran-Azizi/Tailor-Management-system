/**
 * arabicRenderer.js — Professional Arabic/Dari/Pashto text rendering for PDFKit
 *
 * Strategy: Use fontkit to shape Arabic text (correct contextual glyph forms
 * via OpenType GSUB features), then render glyphs as vector paths with the
 * glyph order returned by the shaper.
 *
 * This works for ALL Arabic-script characters including Pashto-specific
 * characters (ټ ډ ړ ږ ګ ۍ ې) that have no Unicode Presentation Form code points
 * and therefore cannot be handled by arabic-persian-reshaper.
 */

import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const fontkit = require("fontkit");

// RTL text shaping parameters
// These are optimized for Dari, Pashto, and other Persian-script languages
const RTL_SCRIPT = "arab";
const RTL_LANGUAGE = "dflt"; // Default; can be overridden per-language
const RTL_DIRECTION = "rtl";

// Map report language codes to fontkit language codes
const LANGUAGE_MAP = {
  dari: "fa", // Dari/Farsi to fontkit "fa"
  pashto: "ps", // Pashto to fontkit "ps"
  farsi: "fa", // Farsi to fontkit "fa"
  fa: "fa", // Already correct
  ps: "ps", // Already correct
  ar: "ar", // Arabic to fontkit "ar"
  ur: "ur", // Urdu to fontkit "ur"
  dflt: "dflt", // Keep default if explicitly requested
};

// If these are omitted, words can render as disconnected letters.
const LANGUAGE_FEATURES = {
  fa: [
    "ccmp",
    "locl",
    "rlig",
    "liga",
    "dlig",
    "calt",
    "isol",
    "fina",
    "medi",
    "init",
    "mark",
    "mkmk",
  ], // Farsi/Dari
  ps: [
    "ccmp",
    "locl",
    "rlig",
    "liga",
    "dlig",
    "calt",
    "isol",
    "fina",
    "medi",
    "init",
    "mark",
    "mkmk",
  ], // Pashto
  ur: [
    "ccmp",
    "locl",
    "rlig",
    "liga",
    "dlig",
    "calt",
    "isol",
    "fina",
    "medi",
    "init",
    "mark",
    "mkmk",
  ], // Urdu
  ar: [
    "ccmp",
    "locl",
    "rlig",
    "liga",
    "dlig",
    "calt",
    "isol",
    "fina",
    "medi",
    "init",
    "mark",
    "mkmk",
  ], // Arabic
  dflt: [], // Default: let fontkit use standard features
};

function normalizeArabicInput(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/\uFEFF/g, "")
    .replace(/\s*\u200C\s*/g, "\u200C")
    .replace(/ {2,}/g, " ")
    .trim();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache open fontkit font objects (keyed by file path)
const _fontCache = new Map();

async function openFont(fontPath) {
  if (!_fontCache.has(fontPath)) {
    _fontCache.set(fontPath, await fontkit.open(fontPath));
  }
  return _fontCache.get(fontPath);
}

/**
 * Draw Arabic/Dari/Pashto text using glyph-path rendering.
 *
 * @param {PDFDocument} doc      - PDFKit document
 * @param {string}      text     - Arabic/Pashto text to render
 * @param {number}      x        - Left edge of the bounding box
 * @param {number}      y        - Top of the text line (PDFKit convention)
 * @param {object}      opts     - { width, align, fontSize }
 * @param {string}      fontPath - Absolute path to the TTF/OTF font file
 * @param {string}      fillColor - CSS hex color like '#0F172A'
 */
export async function drawArabicText(
  doc,
  text,
  x,
  y,
  opts,
  fontPath,
  fillColor = "#0F172A",
  language = "fa",
) {
  const safeText = normalizeArabicInput(text);
  if (!safeText || !fontPath) return;

  const { width, align = "left", fontSize = doc._fontSize || 12 } = opts;

  const fkFont = await openFont(fontPath);
  const scale = fontSize / fkFont.unitsPerEm;

  // Map report language codes (dari, pashto, etc.) to fontkit language codes.
  const mappedLanguage = LANGUAGE_MAP[language] || LANGUAGE_MAP.fa;
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(safeText);
  const shapingLanguage =
    mappedLanguage === "dflt" && hasArabic ? "fa" : mappedLanguage;

  // Use language-specific OpenType features for better contextual form support.
  const layoutFeatures =
    LANGUAGE_FEATURES[shapingLanguage] || LANGUAGE_FEATURES.dflt;

  // Shape the text explicitly as Arabic RTL script for stable Dari/Pashto joining.
  const run = fkFont.layout(
    safeText,
    layoutFeatures,
    RTL_SCRIPT,
    shapingLanguage || RTL_LANGUAGE,
    RTL_DIRECTION,
  );
  const { glyphs, positions } = run;

  if (!glyphs.length) return;

  // Total advance width in points
  const totalWidthPts = positions.reduce(
    (sum, p) => sum + p.xAdvance * scale,
    0,
  );

  // Calculate the left edge of the text block based on alignment
  let blockLeft = x;
  if (align === "right" && width != null) {
    blockLeft = x + width - totalWidthPts;
  } else if (align === "center" && width != null) {
    blockLeft = x + (width - totalWidthPts) / 2;
  }

  // The baseline in PDFKit coordinates (y increases downward)
  // PDFKit places text so that y is the TOP of the line.
  // Baseline ≈ y + ascender_in_pts
  const ascenderRatio = fkFont.ascent / fkFont.unitsPerEm;
  const baselineY = y + ascenderRatio * fontSize;

  doc.save();
  doc.fillColor(fillColor);

  // Keep shaper-provided glyph order; reversing here flips mixed RTL/number text.
  let curX = blockLeft;

  for (let i = 0; i < glyphs.length; i += 1) {
    const glyph = glyphs[i];
    const pos = positions[i];

    const glyphX = curX + pos.xOffset * scale;
    const glyphY = baselineY - pos.yOffset * scale;

    // Get the glyph's SVG outline path
    const { path } = glyph;
    if (!path) {
      curX += pos.xAdvance * scale;
      continue;
    }
    const svgPath = path.toSVG();
    if (!svgPath || svgPath.trim() === "M0 0" || svgPath.length < 5) {
      curX += pos.xAdvance * scale;
      continue;
    }

    // Apply transform:
    //   scale X by +scale (horizontal direction preserved)
    //   scale Y by -scale (flip: glyph coords have y-up, PDF has y-down)
    //   translate to (glyphX, glyphY) = glyph origin in page coordinates
    doc.save();
    doc.transform(scale, 0, 0, -scale, glyphX, glyphY);
    doc.path(svgPath).fill();
    doc.restore();

    curX += pos.xAdvance * scale;
  }

  doc.restore();

  return totalWidthPts; // return width consumed
}

/**
 * Synchronous wrapper — draw Arabic text using a pre-opened fontkit font.
 * Use this if you've already loaded the font (avoids async).
 */
export function drawArabicTextSync(
  doc,
  text,
  x,
  y,
  opts,
  fkFont,
  fillColor = "#0F172A",
  language = "fa",
) {
  const safeText = normalizeArabicInput(text);
  if (!safeText || !fkFont) return 0;

  const { width, align = "left", fontSize = doc._fontSize || 12 } = opts;

  const scale = fontSize / fkFont.unitsPerEm;

  // Map report language codes (dari, pashto, etc.) to fontkit language codes (fa, ps, etc.)
  const mappedLanguage = LANGUAGE_MAP[language] || LANGUAGE_MAP.fa;
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(safeText);
  const shapingLanguage =
    mappedLanguage === "dflt" && hasArabic ? "fa" : mappedLanguage;

  // Use language-specific OpenType features for better contextual form support
  const layoutFeatures =
    LANGUAGE_FEATURES[shapingLanguage] || LANGUAGE_FEATURES.dflt;
  const run = fkFont.layout(
    safeText,
    layoutFeatures,
    RTL_SCRIPT,
    shapingLanguage || RTL_LANGUAGE,
    RTL_DIRECTION,
  );
  const { glyphs, positions } = run;

  if (!glyphs.length) return 0;

  // DEBUG: Log fontkit output for troubleshooting character separation
  if (process.env.DEBUG_ARABIC_RENDERING === "true") {
    console.log(
      `[Arabic Render] text: "${safeText}", glyphCount: ${glyphs.length}, font: ${fkFont.fullName}, lang: ${language} -> ${shapingLanguage}`,
    );
    glyphs.slice(0, 10).forEach((g, i) => {
      const pos = positions[i];
      console.log(
        `  [${i}] glyphId: ${g.id}, name: ${g.name}, xAdv: ${pos.xAdvance.toFixed(1)}, xOff: ${pos.xOffset.toFixed(1)}, yOff: ${pos.yOffset.toFixed(1)}, hasPath: ${!!g.path}`,
      );
    });
  }

  const totalWidthPts = positions.reduce(
    (sum, p) => sum + p.xAdvance * scale,
    0,
  );

  let blockLeft = x;
  if (align === "right" && width != null) {
    blockLeft = x + width - totalWidthPts;
  } else if (align === "center" && width != null) {
    blockLeft = x + (width - totalWidthPts) / 2;
  }

  const ascenderRatio = fkFont.ascent / fkFont.unitsPerEm;
  const baselineY = y + ascenderRatio * fontSize;

  const currentFill = doc._fillColor;
  doc.save();
  doc.fillColor(fillColor);

  let curX = blockLeft;

  for (let i = 0; i < glyphs.length; i += 1) {
    const glyph = glyphs[i];
    const pos = positions[i];

    const glyphX = curX + pos.xOffset * scale;
    const glyphY = baselineY - pos.yOffset * scale;

    const { path } = glyph;
    if (!path) {
      curX += pos.xAdvance * scale;
      continue;
    }
    const svgPath = path.toSVG();
    if (!svgPath || svgPath.trim() === "M0 0" || svgPath.length < 5) {
      curX += pos.xAdvance * scale;
      continue;
    }

    // Save the current graphics state before applying transforms
    doc.save();

    // Apply the transformation matrix:
    // - Scale X by +scale to enlarge glyph
    // - Scale Y by -scale to flip from font coordinates (Y-up) to PDF coordinates (Y-down)
    // - Translate to (glyphX, glyphY) which is the glyph's position on the page
    doc.transform(scale, 0, 0, -scale, glyphX, glyphY);

    // Draw the glyph's SVG path and fill it
    doc.path(svgPath).fill();
    doc.restore();

    // Move to the next glyph position using the advance width
    curX += pos.xAdvance * scale;
  }

  doc.restore();

  return totalWidthPts;
}

/**
 * Open and cache an Arabic font from a path, returning the fontkit font object.
 * Call this once during PDF initialization.
 */
export async function loadArabicFont(fontPath) {
  return openFont(fontPath);
}

/** Shape Arabic/Pashto text with full OpenType features (connected letters). */
export function layoutArabicRun(fkFont, text, language = "fa") {
  const safeText = normalizeArabicInput(text);
  if (!safeText || !fkFont) return null;

  const mappedLanguage = LANGUAGE_MAP[language] || LANGUAGE_MAP.fa;
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(safeText);
  const shapingLanguage =
    mappedLanguage === "dflt" && hasArabic ? "fa" : mappedLanguage;
  const layoutFeatures =
    LANGUAGE_FEATURES[shapingLanguage] || LANGUAGE_FEATURES.dflt;

  return fkFont.layout(
    safeText,
    layoutFeatures,
    RTL_SCRIPT,
    shapingLanguage || RTL_LANGUAGE,
    RTL_DIRECTION,
  );
}

/** Measure shaped Arabic text width in PDF points. */
export function arabicTextWidthPts(fkFont, text, fontSize, language = "fa") {
  const run = layoutArabicRun(fkFont, text, language);
  if (!run?.positions?.length) return 0;
  const scale = fontSize / fkFont.unitsPerEm;
  return run.positions.reduce((sum, pos) => sum + pos.xAdvance * scale, 0);
}

/**
 * Resolve the best available Arabic-capable font path for report PDFs.
 * This includes env overrides, bundled project fonts, and OS fallbacks.
 */
export function resolveArabicReportFontPath() {
  const cwd = process.cwd();
  const candidates = [
    process.env.PDF_REPORT_FONT_PATH,
    process.env.PDF_DARI_PASHTO_FONT_PATH,
    process.env.PDF_BAHIJ_FONT_PATH,
    process.env.PDF_VAZIRMATN_FONT_PATH,
    process.env.PDF_ARABIC_FONT_PATH,

    // Bundled fonts (source tree)
    path.join(__dirname, "../fonts/Vazirmatn-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNaskhArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoSansArabic-Regular.ttf"),
    path.join(__dirname, "../fonts/NotoNastaliqUrdu-Regular.ttf"),
    path.join(__dirname, "../fonts/Bahij_Zar.ttf"),
    path.join(__dirname, "../fonts/Bahij-Zar.ttf"),
    path.join(__dirname, "../fonts/BahijZar.ttf"),

    // Bundled fonts (runtime cwd variants)
    path.join(cwd, "src/fonts/Vazirmatn-Regular.ttf"),
    path.join(cwd, "backend/src/fonts/Vazirmatn-Regular.ttf"),
    path.join(cwd, "fonts/Vazirmatn-Regular.ttf"),

    // Windows fallbacks
    "C:/Windows/Fonts/bahij.ttf",
    "C:/Windows/Fonts/bahij-zar.ttf",
    "C:/Windows/Fonts/Bahij_Zar.ttf",
    "C:/Windows/Fonts/Bahij Zar.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/aldhabi.ttf",

    // Linux fallbacks
    "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ].filter(Boolean);

  return candidates.find((fontPath) => fs.existsSync(fontPath)) ?? null;
}
