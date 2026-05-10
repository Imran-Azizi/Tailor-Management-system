import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import { LuRuler } from "react-icons/lu";
import api from "../../lib/api.js";
import { Field } from "../ui/index.jsx";
import {
  getOrderDisplayName,
  getOrderTypeLabel,
  withOrderTypeSequenceMeta,
} from "../../lib/orderType.js";
import { isRtlLanguage as detectRtlLanguage } from "../../lib/locale.js";
import {
  MONEY_SCALE,
  METER_SCALE,
  toScaledNumber,
  mulScaled,
  subScaled,
  maxScaled,
  formatScaled,
} from "../../lib/decimal.js";

const emptySelection = {
  companyName: "",
  brandName: "",
  rakhtTonId: "",
  requiredMeters: "",
  piecePrice: "",
  priceForCustomer: "",
};

const getTonRemainingMeters = (ton) => {
  return maxScaled(
    subScaled(ton?.totalMeters || 0, ton?.usedMeters || 0, METER_SCALE),
    0,
    METER_SCALE,
  );
};

const sanitizeDecimalInput = (raw) => {
  const normalized = String(raw ?? "").replace(/,/g, ".");
  const cleaned = normalized.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
};

export default function Step2RakhtSelection({
  onNext,
  onBack,
  initial = {},
  orderTypes = [],
  orderItems = [],
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtlLanguage = detectRtlLanguage(language);
  const [validationError, setValidationError] = useState("");

  const { data: rakhtRows = [], isLoading } = useQuery({
    queryKey: ["rakht-list"],
    queryFn: () => api.get("/rakhts").then((res) => res.data),
  });

  const selectionItems = useMemo(() => {
    if (Array.isArray(orderItems) && orderItems.length > 0) {
      return withOrderTypeSequenceMeta(orderItems).map((item, index) => {
        const key = String(
          item?.billingKey ?? `${item?.type || "ITEM"}-${index}`,
        );
        const type = item?.type;
        const fallbackLabel = getOrderDisplayName(
          {
            ...item,
            orderName: item?.name?.trim() || item?.orderName?.trim() || "",
          },
          language,
        );
        const label = item?.displayName?.trim() || fallbackLabel;
        return { key, type, label, orderId: item?.orderId || "" };
      });
    }

    return withOrderTypeSequenceMeta(orderTypes || []).map((entry, index) => {
      const type = entry?.type;
      const key = `${type || "ITEM"}-${index}`;
      const label = getOrderDisplayName(
        {
          ...entry,
          orderName: entry?.name?.trim() || entry?.orderName?.trim() || "",
        },
        language,
      );
      return { key, type, label, orderId: entry?.orderId || "" };
    });
  }, [orderItems, orderTypes, language]);

  const [selections, setSelections] = useState({});

  useEffect(() => {
    const incoming = initial?.rakhtSelections || [];
    setSelections((prev) => {
      const next = {};
      selectionItems.forEach((item) => {
        const existing =
          incoming.find(
            (entry) =>
              item.orderId &&
              entry?.orderId &&
              String(entry.orderId) === String(item.orderId),
          ) ||
          incoming.find((entry) => entry?.orderItemKey === item.key) ||
          incoming.find((entry) => entry?.type === item.type);
        const fallback = prev[item.key] || emptySelection;
        next[item.key] = {
          companyName: existing?.rakhtCompanyName || fallback.companyName || "",
          brandName: existing?.rakhtBrandName || fallback.brandName || "",
          rakhtTonId: existing?.rakhtTonId || fallback.rakhtTonId || "",
          requiredMeters:
            existing?.requiredMeters !== undefined
              ? String(existing.requiredMeters)
              : fallback.requiredMeters || "",
          piecePrice:
            existing?.piecePrice !== undefined
              ? String(existing.piecePrice)
              : fallback.piecePrice || "",
          priceForCustomer:
            existing?.priceForCustomer !== undefined
              ? String(existing.priceForCustomer)
              : fallback.priceForCustomer || "",
        };
      });
      return next;
    });
  }, [initial?.rakhtSelections, selectionItems]);

  const companyOptions = useMemo(() => {
    const seen = new Set();
    return (rakhtRows || [])
      .filter((item) => {
        if (!item?.companyName || seen.has(item.companyName)) return false;
        seen.add(item.companyName);
        return true;
      })
      .map((item) => item.companyName)
      .sort((left, right) => left.localeCompare(right))
      .map((company) => ({ value: company, label: company }));
  }, [rakhtRows]);

  const updateSelection = (itemKey, patch) => {
    setValidationError("");
    setSelections((prev) => ({
      ...prev,
      [itemKey]: { ...(prev[itemKey] || emptySelection), ...patch },
    }));
  };

  // Track meters committed per ton across ALL form items: tonId -> { itemKey -> meters }
  const formTonMeters = useMemo(() => {
    const map = {};
    for (const [itemKey, sel] of Object.entries(selections)) {
      const tonId = sel.rakhtTonId;
      if (!tonId) continue;
      const m = toScaledNumber(sel.requiredMeters || 0, METER_SCALE);
      if (!(m > 0)) continue;
      if (!map[tonId]) map[tonId] = {};
      map[tonId][itemKey] = m;
    }
    return map;
  }, [selections]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError("");

    const rakhtSelections = [];
    // Cumulative per-ton allocation to prevent combined over-selection
    const tonAllocated = {};

    for (const item of selectionItems) {
      const current = selections[item.key] || emptySelection;
      const companyName = current.companyName || "";
      const brandName = current.brandName || "";
      const rakhtTonId = current.rakhtTonId || "";
      const requiredMeters = toScaledNumber(
        current.requiredMeters || 0,
        METER_SCALE,
      );
      const piecePrice = toScaledNumber(current.piecePrice || 0, MONEY_SCALE);
      const priceForCustomer = toScaledNumber(
        current.priceForCustomer || 0,
        MONEY_SCALE,
      );

      const hasAnyInput =
        Boolean(companyName) ||
        Boolean(brandName) ||
        Boolean(rakhtTonId) ||
        String(current.requiredMeters || "").trim() !== "" ||
        String(current.piecePrice || "").trim() !== "" ||
        String(current.priceForCustomer || "").trim() !== "";

      if (!hasAnyInput) {
        continue;
      }

      const selectedRakht = (rakhtRows || []).find(
        (item) =>
          item.companyName === companyName && item.brandName === brandName,
      );

      if (!selectedRakht) {
        setValidationError(
          t("createOrder.rakhtSelectionRequired", {
            defaultValue: "Please select a valid Rakht company and brand.",
          }),
        );
        return;
      }

      const ton = (selectedRakht.tons || []).find(
        (entry) => entry.id === rakhtTonId,
      );
      if (!ton) {
        setValidationError(
          t("createOrder.rakhtTonSelectionRequired", {
            defaultValue: "Please select a Rakht ton/color.",
          }),
        );
        return;
      }

      const tonAvailable = getTonRemainingMeters(ton);
      const safeRequiredMeters = maxScaled(requiredMeters, 0, METER_SCALE);
      const safePiecePrice = maxScaled(piecePrice, 0, MONEY_SCALE);
      const safePriceForCustomer = maxScaled(priceForCustomer, 0, MONEY_SCALE);

      if (safeRequiredMeters <= 0) {
        setValidationError(
          t("createOrder.requiredMetersPositive", {
            defaultValue: "Required meters must be greater than zero.",
          }),
        );
        return;
      }

      // Validate against effective available (DB remaining minus already allocated in this form)
      const alreadyAllocated = tonAllocated[ton.id] || 0;
      const tonAvailableNet = maxScaled(
        subScaled(tonAvailable, alreadyAllocated, METER_SCALE),
        0,
        METER_SCALE,
      );
      if (safeRequiredMeters > tonAvailableNet) {
        setValidationError(
          t("createOrder.insufficientRakhtMeters", {
            available: formatScaled(tonAvailableNet, { scale: 2 }),
            defaultValue: `Insufficient meters. Available: ${formatScaled(tonAvailableNet, { scale: 2 })}`,
          }),
        );
        return;
      }
      tonAllocated[ton.id] = alreadyAllocated + safeRequiredMeters;

      rakhtSelections.push({
        orderId: item.orderId || undefined,
        type: item.type,
        orderItemKey: item.key,
        rakhtId: selectedRakht.id,
        rakhtTonId: ton.id,
        rakhtCompanyName: selectedRakht.companyName,
        rakhtBrandName: selectedRakht.brandName,
        rakhtColor: ton.name,
        rakhtColorHex: ton.colorHex,
        requiredMeters: safeRequiredMeters,
        piecePrice: safePiecePrice,
        priceForCustomer: safePriceForCustomer,
        totalPriceForCustomer: mulScaled(
          safePriceForCustomer,
          safeRequiredMeters,
          MONEY_SCALE,
        ),
      });
    }

    onNext({ rakhtSelections });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {t("createOrder.rakhtSelection", { defaultValue: "Rakht Selection" })}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 18 }}>
        {t("createOrder.rakhtSelectionCopy", {
          defaultValue:
            "Select fabric stock for this order and verify available meters before continuing.",
        })}
      </p>

      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 18 }}>
          {t("common.loading")}
        </p>
      ) : null}

      {selectionItems.length === 0 ? (
        <div className="info-box ib-red" style={{ marginBottom: 14 }}>
          {t("createOrder.selectAtLeastOne", {
            defaultValue: "Please select at least one order type.",
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {selectionItems.map((item) => {
            const current = selections[item.key] || emptySelection;
            const companyName = current.companyName || "";
            const brandName = current.brandName || "";
            const rakhtTonId = current.rakhtTonId || "";
            const requiredMeters = toScaledNumber(
              current.requiredMeters || 0,
              METER_SCALE,
            );
            const piecePrice = toScaledNumber(
              current.piecePrice || 0,
              MONEY_SCALE,
            );
            const priceForCustomer = toScaledNumber(
              current.priceForCustomer || 0,
              MONEY_SCALE,
            );

            const filteredByCompany = (rakhtRows || []).filter(
              (item) => item.companyName === companyName,
            );

            const brandOptions = (() => {
              const seen = new Set();
              return filteredByCompany
                .filter((item) => {
                  if (!item?.brandName || seen.has(item.brandName))
                    return false;
                  seen.add(item.brandName);
                  return true;
                })
                .map((item) => item.brandName)
                .sort((left, right) => left.localeCompare(right))
                .map((brand) => ({ value: brand, label: brand }));
            })();

            const selectedRakht = (rakhtRows || []).find(
              (item) =>
                item.companyName === companyName &&
                item.brandName === brandName,
            );

            const tonOptions = (selectedRakht?.tons || []).map((ton, idx) => ({
              value: ton.id,
              label: `#${idx + 1} ${ton.name}`,
              ton,
            }));

            const selectedTon = (selectedRakht?.tons || []).find(
              (entry) => entry.id === rakhtTonId,
            );

            const dbAvailableMeters = selectedTon
              ? getTonRemainingMeters(selectedTon)
              : 0;

            // Subtract meters committed by OTHER items in this form for the same ton
            const otherItemsCommitted = rakhtTonId
              ? Object.entries(formTonMeters[rakhtTonId] || {})
                  .filter(([key]) => key !== item.key)
                  .reduce((sum, [, m]) => sum + m, 0)
              : 0;

            const availableMeters = maxScaled(
              subScaled(dbAvailableMeters, otherItemsCommitted, METER_SCALE),
              0,
              METER_SCALE,
            );

            const safeRequiredMeters = maxScaled(
              requiredMeters,
              0,
              METER_SCALE,
            );
            const remainingAfter = maxScaled(
              subScaled(availableMeters, safeRequiredMeters, METER_SCALE),
              0,
              METER_SCALE,
            );
            const computedTotalPrice = mulScaled(
              piecePrice,
              safeRequiredMeters,
              MONEY_SCALE,
            );
            const computedTotalPriceForCustomer = mulScaled(
              priceForCustomer,
              safeRequiredMeters,
              MONEY_SCALE,
            );
            const rakhtBenefit = subScaled(
              computedTotalPriceForCustomer,
              computedTotalPrice,
              MONEY_SCALE,
            );

            const typeLabel = item.label;

            return (
              <div
                key={item.key}
                className="card"
                style={{ padding: 14, border: "1px solid var(--border)" }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text2)",
                    marginBottom: 10,
                  }}
                >
                  {typeLabel}
                </p>

                <div style={{ display: "grid", gap: 14 }}>
                  <Field
                    label={t("rakht.companyName", { defaultValue: "Company" })}
                  >
                    <Select
                      classNamePrefix="rs"
                      options={companyOptions}
                      placeholder={t("common.select", {
                        defaultValue: "Select",
                      })}
                      value={
                        companyOptions.find(
                          (option) => option.value === companyName,
                        ) || null
                      }
                      onChange={(option) => {
                        updateSelection(item.key, {
                          companyName: option?.value || "",
                          brandName: "",
                          rakhtTonId: "",
                          piecePrice: "",
                        });
                      }}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: 40,
                          borderRadius: 10,
                          borderColor: state.isFocused
                            ? "var(--primary)"
                            : "var(--border)",
                          boxShadow: "none",
                        }),
                        menu: (base) => ({ ...base, zIndex: 20 }),
                      }}
                    />
                  </Field>

                  <Field
                    label={t("rakht.brandName", { defaultValue: "Brand Name" })}
                  >
                    <Select
                      classNamePrefix="rs"
                      options={brandOptions}
                      isDisabled={!companyName}
                      placeholder={t("common.select", {
                        defaultValue: "Select",
                      })}
                      value={
                        brandOptions.find(
                          (option) => option.value === brandName,
                        ) || null
                      }
                      onChange={(option) => {
                        updateSelection(item.key, {
                          brandName: option?.value || "",
                          rakhtTonId: "",
                          piecePrice: "",
                        });
                      }}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: 40,
                          borderRadius: 10,
                          borderColor: state.isFocused
                            ? "var(--primary)"
                            : "var(--border)",
                          boxShadow: "none",
                        }),
                        menu: (base) => ({ ...base, zIndex: 20 }),
                      }}
                    />
                  </Field>

                  <Field
                    label={t("rakht.chooseColor", {
                      defaultValue: "Choose Color",
                    })}
                  >
                    <Select
                      classNamePrefix="rs"
                      options={tonOptions}
                      isDisabled={!selectedRakht}
                      placeholder={t("common.select", {
                        defaultValue: "Select",
                      })}
                      value={
                        tonOptions.find(
                          (option) => option.value === rakhtTonId,
                        ) || null
                      }
                      onChange={(option) => {
                        updateSelection(item.key, {
                          rakhtTonId: option?.value || "",
                          piecePrice:
                            current.piecePrice ||
                            String(
                              Number(option?.ton?.purchasePricePerMeter || 0),
                            ),
                        });
                      }}
                      formatOptionLabel={(opt) => {
                        const tonDbAvail = opt.ton
                          ? getTonRemainingMeters(opt.ton)
                          : 0;
                        const otherCommittedForOpt = opt.ton
                          ? Object.entries(formTonMeters[opt.ton.id] || {})
                              .filter(([key]) => key !== item.key)
                              .reduce((sum, [, m]) => sum + m, 0)
                          : 0;
                        const tonEffectiveAvail = maxScaled(
                          subScaled(
                            tonDbAvail,
                            otherCommittedForOpt,
                            METER_SCALE,
                          ),
                          0,
                          METER_SCALE,
                        );
                        return (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: opt.ton?.colorHex || "#94A3B8",
                                border: "1px solid rgba(15,23,42,0.15)",
                                flexShrink: 0,
                              }}
                            />
                            {opt.label}
                            {opt.ton && (
                              <span
                                style={{ fontSize: 11, color: "var(--text3)" }}
                              >
                                &nbsp;-&nbsp;
                                {formatScaled(tonEffectiveAvail, {
                                  scale: 2,
                                })}
                                m{" "}
                                {t("rakht.remaining", {
                                  defaultValue: "remaining",
                                })}
                              </span>
                            )}
                          </span>
                        );
                      }}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: 40,
                          borderRadius: 10,
                          borderColor: state.isFocused
                            ? "var(--primary)"
                            : "var(--border)",
                          boxShadow: "none",
                        }),
                        menu: (base) => ({ ...base, zIndex: 20 }),
                      }}
                    />
                  </Field>

                  <Field
                    label={t("rakht.requiredMeters", {
                      defaultValue: "Required Meters",
                    })}
                  >
                    <div className="iw">
                      <LuRuler size={14} className="ico" />
                      <input
                        type="text"
                        inputMode="decimal"
                        className="inp"
                        value={current.requiredMeters || ""}
                        onChange={(event) => {
                          const sanitized = sanitizeDecimalInput(
                            event.target.value,
                          );
                          if (sanitized === "") {
                            updateSelection(item.key, { requiredMeters: "" });
                            return;
                          }

                          const parsedMeters = toScaledNumber(
                            sanitized,
                            METER_SCALE,
                          );
                          if (!Number.isFinite(parsedMeters)) {
                            updateSelection(item.key, { requiredMeters: "" });
                            return;
                          }

                          const clampedMeters = selectedTon
                            ? Math.min(parsedMeters, availableMeters)
                            : parsedMeters;

                          updateSelection(item.key, {
                            requiredMeters: formatScaled(clampedMeters, {
                              scale: METER_SCALE,
                            }),
                          });
                        }}
                      />
                    </div>
                  </Field>

                  {/* Selling Price per Meter (read-only) + Total Price (auto-calc) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <Field
                      label={t("rakht.sellingPricePerMeter", {
                        defaultValue: "Selling Price / m (Purchase)",
                      })}
                    >
                      <div className="iw">
                        <LuRuler size={14} className="ico" />
                        <input
                          type="number"
                          className="inp"
                          value={current.piecePrice || ""}
                          readOnly
                          disabled
                          style={{
                            background: "var(--surface2)",
                            cursor: "not-allowed",
                          }}
                        />
                      </div>
                    </Field>

                    <Field
                      label={t("rakht.totalPurchasePrice", {
                        defaultValue: "Total Price (Purchase)",
                      })}
                    >
                      <div className="iw">
                        <LuRuler size={14} className="ico" />
                        <input
                          type="text"
                          className="inp"
                          value={
                            computedTotalPrice > 0
                              ? computedTotalPrice.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : "0"
                          }
                          readOnly
                          disabled
                          style={{
                            background: "var(--surface2)",
                            cursor: "not-allowed",
                          }}
                        />
                      </div>
                    </Field>
                  </div>

                  {/* Price for Customer (editable) + Total Price for Customer (auto-calc) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <Field
                      label={t("rakht.priceForCustomer", {
                        defaultValue: "Price for Customer / m",
                      })}
                    >
                      <div className="iw">
                        <LuRuler size={14} className="ico" />
                        <input
                          type="text"
                          inputMode="decimal"
                          className="inp"
                          value={current.priceForCustomer || ""}
                          onChange={(event) =>
                            updateSelection(item.key, {
                              priceForCustomer: sanitizeDecimalInput(
                                event.target.value,
                              ),
                            })
                          }
                        />
                      </div>
                    </Field>

                    <Field
                      label={t("rakht.totalPriceForCustomer", {
                        defaultValue: "Total Price for Customer",
                      })}
                    >
                      <div className="iw">
                        <LuRuler size={14} className="ico" />
                        <input
                          type="text"
                          className="inp"
                          value={
                            computedTotalPriceForCustomer > 0
                              ? computedTotalPriceForCustomer.toLocaleString(
                                  "en-US",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )
                              : "0"
                          }
                          readOnly
                          disabled
                          style={{
                            background: "var(--surface2)",
                            cursor: "not-allowed",
                            fontWeight: 700,
                            color: "var(--primary)",
                          }}
                        />
                      </div>
                    </Field>
                  </div>

                  {selectedTon ? (
                    <>
                      <div
                        className={`info-box ${requiredMeters > 0 && requiredMeters > availableMeters ? "ib-red" : "ib-gold"}`}
                        style={{
                          marginTop: 2,
                          display: "flex",
                          justifyContent: isRtlLanguage
                            ? "flex-end"
                            : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(190px, 1fr))",
                            gap: 10,
                            width: "100%",
                            maxWidth: 760,
                            direction: isRtlLanguage ? "rtl" : "ltr",
                            textAlign: isRtlLanguage ? "right" : "left",
                            justifyItems: isRtlLanguage ? "end" : "start",
                          }}
                        >
                          <span>
                            {t("rakht.availableMeters", {
                              defaultValue: "Available",
                            })}
                            : {formatScaled(availableMeters, { scale: 2 })}
                          </span>
                          <span>
                            {t("rakht.remainingAfterSelection", {
                              defaultValue: "Remaining after selection",
                            })}
                            : {formatScaled(remainingAfter, { scale: 2 })}
                          </span>
                          <span>
                            {t("rakht.companyName", {
                              defaultValue: "Company",
                            })}
                            : {selectedRakht?.companyName}
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              flexDirection: isRtlLanguage
                                ? "row-reverse"
                                : "row",
                            }}
                          >
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                border: "1px solid rgba(15,23,42,0.15)",
                                background: selectedTon.colorHex || "#94A3B8",
                              }}
                            />
                            {t("rakht.tonName", { defaultValue: "Name" })}:{" "}
                            {selectedTon.name}
                          </span>
                          {computedTotalPriceForCustomer > 0 && (
                            <span
                              style={{
                                fontWeight: 700,
                                color: "var(--primary)",
                              }}
                            >
                              {t("rakht.totalPriceForCustomer", {
                                defaultValue: "Total for Customer",
                              })}
                              :{" "}
                              {computedTotalPriceForCustomer.toLocaleString(
                                "en-US",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          )}
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                rakhtBenefit >= 0
                                  ? "var(--success, #16a34a)"
                                  : "var(--danger, #ef4444)",
                            }}
                          >
                            {t("rakht.benefit", {
                              defaultValue: "Rakht Benefit",
                            })}
                            :{" "}
                            {rakhtBenefit.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                      {requiredMeters > 0 &&
                      requiredMeters > availableMeters ? (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: "var(--danger, #ef4444)",
                            fontWeight: 600,
                          }}
                        >
                          {t("createOrder.insufficientRakhtMeters", {
                            available: formatScaled(availableMeters, {
                              scale: 2,
                            }),
                            defaultValue: `Insufficient meters. Available: ${formatScaled(availableMeters, { scale: 2 })}`,
                          })}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {validationError ? (
        <div className="info-box ib-red" style={{ marginTop: 12 }}>
          {validationError}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline"
          style={{ flex: 1 }}
        >
          {t("common.back")}
        </button>
        <button type="submit" className="btn btn-gold" style={{ flex: 1 }}>
          {t("common.continue")}
        </button>
      </div>
    </form>
  );
}
