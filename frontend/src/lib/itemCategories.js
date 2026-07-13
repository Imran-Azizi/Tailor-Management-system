import {
  LuBoxes,
  LuFootprints,
  LuGem,
  LuLayers,
  LuPackage,
  LuShirt,
  LuShoppingBag,
  LuSparkles,
  LuWatch,
} from "react-icons/lu";

export const CATEGORY_ICON_KEYS = [
  "watch",
  "sparkles",
  "bag",
  "gem",
  "footprints",
  "box",
  "shirt",
  "layers",
];

export const CATEGORY_COLORS = [
  "#2563EB",
  "#DB2777",
  "#92400E",
  "#7C3AED",
  "#0D9488",
  "#D97706",
  "#0891B2",
  "#4F46E5",
];

const ICON_MAP = {
  watch: LuWatch,
  sparkles: LuSparkles,
  bag: LuShoppingBag,
  gem: LuGem,
  footprints: LuFootprints,
  box: LuBoxes,
  shirt: LuShirt,
  layers: LuLayers,
  package: LuPackage,
};

export function resolveCategoryIcon(iconKey) {
  return ICON_MAP[iconKey] || LuBoxes;
}

export function decorateCategory(category) {
  const color =
    category.color ||
    CATEGORY_COLORS[
      Math.abs(hashString(category.id || category.name || "")) %
        CATEGORY_COLORS.length
    ];
  const Icon = resolveCategoryIcon(category.iconKey);

  return {
    ...category,
    color,
    Icon,
    label: category.name,
    itemCount: category._count?.items ?? category.itemCount ?? 0,
  };
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

export function getItemCategoryLabel(category, t) {
  if (!category) return "-";
  if (typeof category === "string") return category;
  return category.name || category.categoryName || "-";
}
