# Report Fonts (PDF)

Dari/Pashto PDF reports require **Vazirmatn** for correctly joined Arabic-script letters.

## Required file

- `Vazirmatn-Regular.ttf`

## Setup

From the `backend` folder:

```bash
npm run fonts:ensure
```

This downloads the font if missing. Production `npm start` runs the same check automatically.

## Optional overrides

Set one of these environment variables to use a custom TTF path:

- `PDF_REPORT_FONT_PATH`
- `PDF_VAZIRMATN_FONT_PATH`
- `PDF_DARI_PASHTO_FONT_PATH`

Without a valid font, PDF exports fall back to Helvetica and Arabic/Pashto text renders with **disconnected letters**.
