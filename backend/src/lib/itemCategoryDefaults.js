const CATEGORY_COLORS = [
  "#2563EB",
  "#0D9488",
  "#7C3AED",
  "#D97706",
  "#DB2777",
  "#059669",
  "#4F46E5",
  "#0891B2",
  "#92400E",
  "#DC2626",
];

const FALLBACK_ICON_KEYS = [
  "box",
  "layers",
  "package",
  "shirt",
  "bag",
  "gem",
  "sparkles",
  "watch",
  "footprints",
];

const ICON_RULES = [
  {
    iconKey: "gem",
    keywords: [
      "ring",
      "rings",
      "انگشتر",
      "انگشترها",
      "ګوته",
      "ګوتې",
      "jewel",
      "jewelry",
    ],
  },
  {
    iconKey: "watch",
    keywords: ["watch", "watches", "ساعت", "ساعت‌ها", "ساعتونه", "وقت"],
  },
  {
    iconKey: "sparkles",
    keywords: ["perfume", "perfumes", "عطر", "عطرها", "عطرونه", "atr"],
  },
  {
    iconKey: "footprints",
    keywords: [
      "boot",
      "boots",
      "shoe",
      "shoes",
      "slipper",
      "slippers",
      "بوت",
      "بوت‌ها",
      "کفش",
      "چپلی",
      "چپلی‌ها",
      "چپلک",
      "چپلکې",
    ],
  },
  {
    iconKey: "bag",
    keywords: ["bag", "bags", "handbag", "کیف", "پاکت"],
  },
  {
    iconKey: "shirt",
    keywords: ["shirt", "clothes", "clothing", "لباس", "پیراهن", "جامه"],
  },
  {
    iconKey: "box",
    keywords: ["box", "boxes", "package", "جعبه", "کارتن"],
  },
];

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveIconKey(name) {
  const normalized = normalizeName(name);
  if (!normalized) return "box";

  for (const rule of ICON_RULES) {
    if (
      rule.keywords.some(
        (keyword) =>
          normalized === keyword ||
          normalized.includes(keyword) ||
          keyword.includes(normalized),
      )
    ) {
      return rule.iconKey;
    }
  }

  const index = hashString(normalized) % FALLBACK_ICON_KEYS.length;
  return FALLBACK_ICON_KEYS[index];
}

function resolveColor(name, { offset = 0 } = {}) {
  const normalized = normalizeName(name) || "category";
  const index =
    (hashString(normalized) + Number(offset || 0)) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
}

export function generateCategoryAppearance(name, { existingCount = 0 } = {}) {
  const iconKey = resolveIconKey(name);
  const color = resolveColor(name, { offset: existingCount });

  return { iconKey, color };
}
