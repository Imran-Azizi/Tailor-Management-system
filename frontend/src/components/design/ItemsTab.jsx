import { useTranslation } from "react-i18next";
import {
  LuFootprints,
  LuGem,
  LuShoppingBag,
  LuSparkles,
  LuWatch,
} from "react-icons/lu";
import ItemCategoryCard from "./ItemCategoryCard.jsx";

export const ITEM_CATEGORIES = [
  { key: "WATCH", labelKey: "items.types.WATCH", fallback: "Watches", color: "#2563EB", Icon: LuWatch },
  { key: "PERFUME", labelKey: "items.types.PERFUME", fallback: "Perfumes", color: "#DB2777", Icon: LuSparkles },
  { key: "BOOT", labelKey: "items.types.BOOT", fallback: "Boots", color: "#92400E", Icon: LuShoppingBag },
  { key: "RING", labelKey: "items.types.RING", fallback: "Rings", color: "#7C3AED", Icon: LuGem },
  { key: "SLIPPER", labelKey: "items.types.SLIPPER", fallback: "Slippers", color: "#0D9488", Icon: LuFootprints },
];

export function getItemCategoryLabel(type, t) {
  const category = ITEM_CATEGORIES.find((item) => item.key === type);
  if (!category) return type || "-";
  return t(category.labelKey, { defaultValue: category.fallback });
}

export default function ItemsTab() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
  const categories = ITEM_CATEGORIES.map((category) => ({
    ...category,
    label: t(category.labelKey, { defaultValue: category.fallback }),
  }));

  return (
    <div className="items-tab" dir={isRtl ? "rtl" : "ltr"}>
      <div className="items-tab-header">
        <div>
          <p className="items-eyebrow">
            {t("items.inventory", { defaultValue: "Inventory" })}
          </p>
          <h2>{t("items.title", { defaultValue: "Items Management" })}</h2>
          <p>
            {t("items.subtitle", {
              defaultValue:
                "Manage watches, perfumes, boots, rings, and slippers with stock control.",
            })}
          </p>
        </div>
      </div>
      <div className="items-categories-grid">
        {categories.map((category) => (
          <ItemCategoryCard key={category.key} category={category} />
        ))}
      </div>
    </div>
  );
}
