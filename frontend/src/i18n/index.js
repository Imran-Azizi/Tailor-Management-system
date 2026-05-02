import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { applyDocumentLocale, normalizeLanguage } from "../lib/locale.js";
import { LOCALE_PATCHES } from "./patches.js";
import en from "./locales/en.json";
import dari from "./locales/dari.json";
import pashto from "./locales/pashto.json";

const resources = {
  en: { translation: en },
  dari: { translation: dari },
  pashto: { translation: pashto },
};

i18n.use(initReactI18next).init({
  resources,
  lng: normalizeLanguage(localStorage.getItem("lang") || "dari"),
  fallbackLng: "en",
  supportedLngs: ["en", "dari", "pashto"],
  nonExplicitSupportedLngs: true,
  returnNull: false,
  interpolation: { escapeValue: false },
});

for (const [lang, bundle] of Object.entries(LOCALE_PATCHES)) {
  i18n.addResourceBundle(lang, "translation", bundle, true, true);
}

applyDocumentLocale(i18n.resolvedLanguage || i18n.language || "en");
i18n.on("languageChanged", (lang) => {
  applyDocumentLocale(lang);
});

export default i18n;
