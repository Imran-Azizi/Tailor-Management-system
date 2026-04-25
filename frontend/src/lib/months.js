export const MONTHS = [
  { value: 1, labelEn: "January", labelDari: "جنوری", labelPashto: "جنوري" },
  { value: 2, labelEn: "February", labelDari: "فبروری", labelPashto: "فبروري" },
  { value: 3, labelEn: "March", labelDari: "مارچ", labelPashto: "مارچ" },
  { value: 4, labelEn: "April", labelDari: "اپریل", labelPashto: "اپریل" },
  { value: 5, labelEn: "May", labelDari: "می", labelPashto: "می" },
  { value: 6, labelEn: "June", labelDari: "جون", labelPashto: "جون" },
  { value: 7, labelEn: "July", labelDari: "جولای", labelPashto: "جولای" },
  { value: 8, labelEn: "August", labelDari: "اگست", labelPashto: "اګست" },
  {
    value: 9,
    labelEn: "September",
    labelDari: "سپتمبر",
    labelPashto: "سپتمبر",
  },
  { value: 10, labelEn: "October", labelDari: "اکتوبر", labelPashto: "اکتوبر" },
  { value: 11, labelEn: "November", labelDari: "نومبر", labelPashto: "نومبر" },
  { value: 12, labelEn: "December", labelDari: "دسمبر", labelPashto: "دسمبر" },
];

/**
 * Returns the localized month label for a given month value (1-12) and language.
 * @param {number} monthValue
 * @param {string} language  - "en" | "dari" | "pashto"
 * @returns {string}
 */
export function getMonthLabel(monthValue, language) {
  const m = MONTHS.find((x) => x.value === monthValue);
  if (!m) return "";
  if (language === "dari") return m.labelDari;
  if (language === "pashto") return m.labelPashto;
  return m.labelEn;
}
