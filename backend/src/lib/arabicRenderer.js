/**
 * arabicRenderer.js — Professional Arabic/Dari/Pashto text rendering for PDFKit
 *
 * Strategy: Use fontkit to shape Arabic text (correct contextual glyph forms
 * via OpenType GSUB features), then render glyphs as vector paths in reversed
 * order so PDFKit's LTR engine produces correct RTL visual output.
 *
 * This works for ALL Arabic-script characters including Pashto-specific
 * characters (ټ ډ ړ ږ ګ ۍ ې) that have no Unicode Presentation Form code points
 * and therefore cannot be handled by arabic-persian-reshaper.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fontkit = require("fontkit");
const RTL_SCRIPT = "arab";
const RTL_LANGUAGE = "dflt";
const RTL_DIRECTION = "rtl";

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
) {
  if (!text || !fontPath) return;

  const { width, align = "left", fontSize = doc._fontSize || 12 } = opts;

  const fkFont = await openFont(fontPath);
  const scale = fontSize / fkFont.unitsPerEm;

  // Shape the text explicitly as Arabic RTL script for stable Dari/Pashto joining.
  const run = fkFont.layout(
    text,
    [],
    RTL_SCRIPT,
    RTL_LANGUAGE,
    RTL_DIRECTION,
  );
  const glyphs = run.glyphs;
  const positions = run.positions;

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

  // Render glyphs in reverse order so the visual output remains right-to-left.
  // Some fontkit RTL runs provide glyphs in visual order; iterating backward
  // prevents mirrored words in generated PDFs.
  let curX = blockLeft + totalWidthPts; // start from the right edge

  for (let i = glyphs.length - 1; i >= 0; i--) {
    const glyph = glyphs[i];
    const pos = positions[i];
    const glyphWidthPts = pos.xAdvance * scale;

    curX -= glyphWidthPts; // advance leftward

    const glyphX = curX + pos.xOffset * scale;
    const glyphY = baselineY - pos.yOffset * scale;

    // Get the glyph's SVG outline path
    const path = glyph.path;
    if (!path) continue;
    const svgPath = path.toSVG();
    if (!svgPath || svgPath.trim() === "M0 0" || svgPath.length < 5) continue;

    // Apply transform:
    //   scale X by +scale (horizontal direction preserved)
    //   scale Y by -scale (flip: glyph coords have y-up, PDF has y-down)
    //   translate to (glyphX, glyphY) = glyph origin in page coordinates
    doc.save();
    doc.transform(scale, 0, 0, -scale, glyphX, glyphY);
    doc.path(svgPath).fill();
    doc.restore();
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
) {
  if (!text || !fkFont) return 0;

  const { width, align = "left", fontSize = doc._fontSize || 12 } = opts;

  const scale = fontSize / fkFont.unitsPerEm;
  const run = fkFont.layout(
    text,
    [],
    RTL_SCRIPT,
    RTL_LANGUAGE,
    RTL_DIRECTION,
  );
  const glyphs = run.glyphs;
  const positions = run.positions;

  if (!glyphs.length) return 0;

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

  let curX = blockLeft + totalWidthPts;

  for (let i = glyphs.length - 1; i >= 0; i--) {
    const glyph = glyphs[i];
    const pos = positions[i];
    const glyphWidthPts = pos.xAdvance * scale;

    curX -= glyphWidthPts;

    const glyphX = curX + pos.xOffset * scale;
    const glyphY = baselineY - pos.yOffset * scale;

    const path = glyph.path;
    if (!path) continue;
    const svgPath = path.toSVG();
    if (!svgPath || svgPath.length < 5) continue;

    doc.save();
    doc.transform(scale, 0, 0, -scale, glyphX, glyphY);
    doc.path(svgPath).fill();
    doc.restore();
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
