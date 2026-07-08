import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuBadgeCheck,
  LuBarcode,
  LuBoxes,
  LuCalculator,
  LuPackageCheck,
  LuSearch,
} from "react-icons/lu";
import api from "../lib/api.js";
import { formatCurrency } from "../lib/currency.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import {
  ITEM_CATEGORIES,
  getItemCategoryLabel,
} from "../components/design/ItemsTab.jsx";
import {
  PageHeader,
  StatCard,
  LoadingState,
  EmptyState,
} from "../components/ui/index.jsx";

export default function OtherItems() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
  const qc = useQueryClient();
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [code, setCode] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [customerPrice, setCustomerPrice] = useState("");
  const [quantitySold, setQuantitySold] = useState("1");

  const itemsQuery = useQuery({
    queryKey: ["items", "sell", type],
    enabled: !!type,
    queryFn: () =>
      api
        .get("/items", { params: { type, pageSize: 100 } })
        .then((res) => res.data.items || []),
  });

  const items = itemsQuery.data || [];
  const brands = useMemo(
    () => [...new Set(items.map((item) => item.brand).filter(Boolean))].sort(),
    [items],
  );
  const filteredItems = useMemo(
    () => items.filter((item) => !brand || item.brand === brand),
    [brand, items],
  );
  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) || null,
    [filteredItems, selectedId],
  );

  useEffect(() => {
    setBrand("");
    setCode("");
    setSelectedId("");
  }, [type]);

  useEffect(() => {
    setCode("");
    setSelectedId("");
  }, [brand]);

  useEffect(() => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setSelectedId("");
      return;
    }
    const exact = filteredItems.find(
      (item) => item.code.toUpperCase() === normalized,
    );
    setSelectedId(exact ? exact.id : "");
  }, [code, filteredItems]);

  useEffect(() => {
    if (!selectedItem) return;
    setCode(selectedItem.code);
    setCustomerPrice("");
    setQuantitySold("1");
  }, [selectedItem?.id]);

  const quantity = Number(quantitySold || 0);
  const unitProfit =
    selectedItem && customerPrice !== ""
      ? Number(customerPrice || 0) - Number(selectedItem.originalPrice || 0)
      : 0;
  const totalProfit = unitProfit * (Number.isFinite(quantity) ? quantity : 0);
  const remainingStock = selectedItem
    ? Number(selectedItem.quantity || 0) -
      (Number.isFinite(quantity) ? quantity : 0)
    : 0;
  const canSell =
    selectedItem &&
    Number(selectedItem.quantity || 0) > 0 &&
    customerPrice !== "" &&
    Number.isFinite(Number(customerPrice)) &&
    Number(customerPrice) >= 0 &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= Number(selectedItem.quantity || 0);

  const sellMut = useMutation({
    mutationFn: () =>
      api.post("/item-sales", {
        itemId: selectedItem.id,
        customerPrice: Number(customerPrice),
        quantitySold: quantity,
      }),
    onSuccess: () => {
      toast.success(
        t("items.sell.saved", {
          defaultValue: "Sale saved and stock updated.",
        }),
      );
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["item-sales"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["design-contributors"] });
      setCode("");
      setSelectedId("");
      setCustomerPrice("");
      setQuantitySold("1");
      navigate("/item-sales-records");
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("items.sell.failed", { defaultValue: "Unable to save sale." }),
        ),
      ),
  });

  return (
    <div className="page other-items-page" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader
        title={t("items.sell.title", { defaultValue: "Other Items" })}
        subtitle={t("items.sell.subtitle", {
          defaultValue:
            "Sell non-tailoring inventory and update stock automatically.",
        })}
      />

      <div className="other-items-shell">
        <section className="card other-items-workflow">
          <div className="other-items-step-grid">
            <label className="items-field">
              <span>
                {t("items.sell.itemType", { defaultValue: "Item Type" })}
              </span>
              <select
                className="inp"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="">
                  {t("common.select", { defaultValue: "Select..." })}
                </option>
                {ITEM_CATEGORIES.map((category) => (
                  <option key={category.key} value={category.key}>
                    {getItemCategoryLabel(category.key, t)}
                  </option>
                ))}
              </select>
            </label>

            <label className="items-field">
              <span>{t("items.fields.brand", { defaultValue: "Brand" })}</span>
              <select
                className="inp"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                disabled={!type || itemsQuery.isLoading}
              >
                <option value="">
                  {t("items.allBrands", { defaultValue: "All Brands" })}
                </option>
                {brands.map((brandName) => (
                  <option key={brandName} value={brandName}>
                    {brandName}
                  </option>
                ))}
              </select>
            </label>

            <label className="items-field">
              <span>
                {t("items.sell.searchCode", { defaultValue: "Search by Code" })}
              </span>
              <div className="items-code-search">
                <LuSearch size={16} />
                <input
                  className="inp"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="ITM-001"
                  disabled={!type}
                />
              </div>
            </label>

            <label className="items-field">
              <span>
                {t("items.sell.selectItem", { defaultValue: "Select Item" })}
              </span>
              <select
                className="inp"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                disabled={!type || itemsQuery.isLoading}
              >
                <option value="">
                  {t("common.select", { defaultValue: "Select..." })}
                </option>
                {filteredItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.code} ({item.quantity})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {itemsQuery.isLoading ? (
            <LoadingState
              message={t("common.loading", { defaultValue: "Loading..." })}
            />
          ) : !type ? (
            <EmptyState
              Icon={LuBarcode}
              message={t("items.sell.chooseType", {
                defaultValue: "Choose an item type to load inventory.",
              })}
            />
          ) : selectedItem ? (
            <>
              <div className="other-item-info">
                <StatCard
                  label={t("items.fields.name", { defaultValue: "Item Name" })}
                  value={selectedItem.name}
                  sub={selectedItem.code}
                  Icon={LuBadgeCheck}
                  accent="#2563EB"
                />
                <StatCard
                  label={t("items.fields.brand", { defaultValue: "Brand" })}
                  value={selectedItem.brand}
                  sub={getItemCategoryLabel(selectedItem.type, t)}
                  Icon={LuBarcode}
                  accent="#7C3AED"
                />
                <StatCard
                  label={t("items.stock.remaining", {
                    defaultValue: "Remaining Stock",
                  })}
                  value={Math.max(remainingStock, 0)}
                  sub={t("items.availableNow", {
                    count: selectedItem.quantity,
                    defaultValue: "{{count}} available now",
                  })}
                  Icon={LuBoxes}
                  accent={selectedItem.quantity <= 5 ? "#D97706" : "#059669"}
                />
                <StatCard
                  label={t("items.fields.originalPrice", {
                    defaultValue: "Original Price",
                  })}
                  value={formatCurrency(selectedItem.originalPrice, language)}
                  sub={t("items.sell.costBasis", {
                    defaultValue: "Cost basis",
                  })}
                  Icon={LuCalculator}
                  accent="#0D9488"
                />
              </div>

              <div className="other-items-sale-panel">
                <label className="items-field">
                  <span>
                    {t("items.sell.customerPrice", {
                      defaultValue: "Customer Price",
                    })}
                  </span>
                  <input
                    className="inp"
                    type="number"
                    min="0"
                    value={customerPrice}
                    onChange={(event) => setCustomerPrice(event.target.value)}
                  />
                </label>
                <label className="items-field">
                  <span>
                    {t("items.sell.quantitySold", {
                      defaultValue: "Quantity",
                    })}
                  </span>
                  <input
                    className="inp"
                    type="number"
                    min="1"
                    max={selectedItem.quantity}
                    value={quantitySold}
                    onChange={(event) => setQuantitySold(event.target.value)}
                  />
                </label>
                <label className="items-field" style={{ marginBottom: 0 }}>
                  <span>
                    {t("items.sell.profit", { defaultValue: "Profit" })}
                  </span>
                  <input
                    className="inp"
                    style={{
                      fontWeight: 600,
                      color: "var(--success)",
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      marginTop: 2,
                      marginBottom: 0,
                      height: 38,
                      textAlign: "center",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                    value={formatCurrency(totalProfit, language)}
                    tabIndex={-1}
                    readOnly
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-gold"
                  disabled={!canSell || sellMut.isPending}
                  onClick={() => sellMut.mutate()}
                >
                  <LuPackageCheck size={16} />
                  {sellMut.isPending
                    ? t("common.saving", { defaultValue: "Saving..." })
                    : t("items.sell.save", { defaultValue: "Save Sale" })}
                </button>
              </div>

              {selectedItem.quantity <= 0 ? (
                <div className="info-box ib-red">
                  {t("items.stock.outWarning", {
                    defaultValue:
                      "This item is out of stock and cannot be sold.",
                  })}
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              Icon={LuSearch}
              message={t("items.sell.noItemSelected", {
                defaultValue: "Search by code or select an item from the list.",
              })}
            />
          )}
        </section>
      </div>
    </div>
  );
}
