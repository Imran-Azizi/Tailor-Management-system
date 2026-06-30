function resolveLanguageKey(language = "en") {
  const lang = String(language || "en").toLowerCase();
  if (lang.startsWith("ps") || lang.startsWith("pashto")) return "pashto";
  if (lang.startsWith("fa") || lang.startsWith("dari")) return "dari";
  return "en";
}

export function getLocalizedShopValue(value, language = "en") {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  const key = resolveLanguageKey(language);
  return value[key] || value.en || Object.values(value).find(Boolean) || "";
}

// Shop configuration - update these values to match your shop details.
export const SHOP_CONFIG = {
  name: "Hoshmand Safi",
  tagline: {
    en: "Professional Web and Database Services",
    dari: "خدمات مسلکی وب و دیتابیس",
    pashto: "د وېب او ډیټابېس مسلکي خدمتونه",
  },
  address: {
    en: "A256, 3rd Floor, Mobile Center, Pul-e-Kheshti, Kabul, Afghanistan",
    dari: "کابل، پل خشتی، موبایل سنتر، منزل سوم، دفتر A256",
    pashto: "کابل، پل خشتي، موبایل سنټر، درېیم منزل، دفتر A256",
  },
  phones: ["+93 78 022 33 44", "+93 76 490 40 41"],
  // Optional: set this to your logo URL/path to show on printed bills.
  logoUrl: "./system_icon.png",
};
