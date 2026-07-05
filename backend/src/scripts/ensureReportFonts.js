/**
 * Ensures Vazirmatn is present for PDF report shaping (Dari/Pashto).
 * Run automatically before server start, or manually: node src/scripts/ensureReportFonts.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.join(__dirname, "../fonts");
const fontFile = path.join(fontsDir, "Vazirmatn-Regular.ttf");
const fontUrl =
  "https://github.com/rastikerdar/vazirmatn/raw/master/fonts/ttf/Vazirmatn-Regular.ttf";

async function ensureReportFonts() {
  if (fs.existsSync(fontFile) && fs.statSync(fontFile).size > 10_000) {
    return fontFile;
  }

  fs.mkdirSync(fontsDir, { recursive: true });
  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download Vazirmatn font (${response.status}). PDF reports in Dari/Pashto will render with broken letter joining.`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(fontFile, buffer);
  console.info(`[fonts] Downloaded Vazirmatn-Regular.ttf (${buffer.length} bytes)`);
  return fontFile;
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  ensureReportFonts()
    .then((file) => {
      console.info(`[fonts] Ready: ${file}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

export default ensureReportFonts;
