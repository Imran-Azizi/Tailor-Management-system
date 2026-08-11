import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import { LuRuler } from "react-icons/lu";
import api from "../../lib/api.js";
import { Field } from "../ui/index.jsx";
import {
  getOrderTypeLabel,
  resolveAssignedSetName,
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

const RAKHT_SELECTION_TYPES = new Set([
  "OUTFIT",
  "WASKAT",
  "KORTY",
  "YAKHANQAQ",
]);

const getTonRemainingMeters = (ton) => {
  return maxScaled(
    subScaled(ton?.totalMeters || 0, ton?.usedMeters || 0, METER_SCALE),
    0,
    METER_SCALE,
  );
};

const sanitizeDecimalInput = (raw, { maxFractionDigits } = {}) => {
  const normalized = String(raw ?? "").replace(/,/g, ".");
  const cleaned = normalized.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  const fraction = parts.slice(1).join("");
  const safeFraction = Number.isInteger(maxFractionDigits)
    ? fraction.slice(0, maxFractionDigits)
    : fraction;
  return `${parts[0]}.${safeFraction}`;
};

const moneyInputStyles = {
  background: "var(--surface2)",
  cursor: "not-allowed",
};

const formatMoneyValue = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const buildRakhtSelectStyles = () => ({
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    borderColor: state.isFocused ? "var(--primary)" : "var(--border)",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(217,119,6,.12)" : "none",
    background: "var(--surface)",
    "&:hover": {
      borderColor: state.isFocused ? "var(--primary)" : "var(--border2)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    paddingTop: 3,
    paddingBottom: 3,
  }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  placeholder: (base) => ({
    ...base,
    color: "var(--text3)",
    fontSize: 13,
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--text1)",
    fontSize: 13,
  }),
  menu: (base) => ({
    ...base,
    zIndex: 20,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid var(--border)",
    boxShadow: "var(--sh-lg)",
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
});

const Step2RakhtSelection = forwardRef(function Step2RakhtSelection(
  {
    onNext,
    onBack,
    initial = {},
    orderTypes = [],
    orderItems = [],
    customerName = "",
  },
  ref,
) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtlLanguage = detectRtlLanguage(language);
  const selectStyles = useMemo(() => buildRakhtSelectStyles(), []);
  const [validationError, setValidationError] = useState("");
  const primaryCustomerName = String(customerName || "").trim();

  const { data: rakhtRows = [], isLoading } = useQuery({
    queryKey: ["rakht-list"],
    queryFn: () => api.get("/rakhts").then((res) => res.data),
  });

  const selectionItems = useMemo(() => {
    if (Array.isArray(orderItems) && orderItems.length > 0) {
      return withOrderTypeSequenceMeta(orderItems)
        .filter((item) => RAKHT_SELECTION_TYPES.has(item?.type))
        .map((item, index) => {
          const key = String(
            item?.billingKey ?? `${item?.type || "ITEM"}-${index}`,
          );
          const type = item?.type;
          const label = resolveAssignedSetName(
            {
              ...item,
              orderName:
                item?.displayName?.trim() ||
                item?.name?.trim() ||
                item?.orderName?.trim() ||
                "",
            },
            index === 0 || Number(item?.setIndex) === 0
              ? primaryCustomerName
              : "",
            language,
            {
              isPrimarySet: index === 0 || Number(item?.setIndex) === 0,
              allowTypeFallback: false,
            },
          );
          return {
            key,
            type,
            label: label || item?.displayName || getOrderTypeLabel(type, language),
            orderId: item?.orderId || "",
          };
        });
    }

    return withOrderTypeSequenceMeta(orderTypes || [])
      .filter((entry) => RAKHT_SELECTION_TYPES.has(entry?.type))
      .map((entry, index) => {
        const type = entry?.type;
        const key = `${type || "ITEM"}-${index}`;
        const label = resolveAssignedSetName(
          {
            ...entry,
            orderName: entry?.name?.trim() || entry?.orderName?.trim() || "",
          },
          index === 0 ? primaryCustomerName : "",
          language,
          {
            isPrimarySet: index === 0,
            allowTypeFallback: true,
          },
        );
        return { key, type, label, orderId: entry?.orderId || "" };
      });
  }, [orderItems, orderTypes, language, primaryCustomerName]);

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

  const buildRakhtSelections = ({ validate = false } = {}) => {
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
        if (validate) {
          setValidationError(
            t("createOrder.rakhtSelectionRequired", {
              defaultValue: "Please select a valid Rakht company and brand.",
            }),
          );
          return null;
        }

        rakhtSelections.push({
          orderId: item.orderId || undefined,
          type: item.type,
          orderItemKey: item.key,
          rakhtId: undefined,
          rakhtTonId,
          rakhtCompanyName: companyName,
          rakhtBrandName: brandName,
          requiredMeters: current.requiredMeters || "",
          piecePrice: current.piecePrice || "",
          priceForCustomer: current.priceForCustomer || "",
        });
        continue;
      }

      const ton = (selectedRakht.tons || []).find(
        (entry) => entry.id === rakhtTonId,
      );
      if (!ton) {
        if (validate) {
          setValidationError(
            t("createOrder.rakhtTonSelectionRequired", {
              defaultValue: "Please select a Rakht ton/color.",
            }),
          );
          return null;
        }
      }

      const tonAvailable = ton ? getTonRemainingMeters(ton) : 0;
      const safeRequiredMeters = maxScaled(requiredMeters, 0, METER_SCALE);
      const safePiecePrice = maxScaled(piecePrice, 0, MONEY_SCALE);
      const safePriceForCustomer = maxScaled(priceForCustomer, 0, MONEY_SCALE);

      if (validate && safeRequiredMeters <= 0) {
        setValidationError(
          t("createOrder.requiredMetersPositive", {
            defaultValue: "Required meters must be greater than zero.",
          }),
        );
        return null;
      }

      // Validate against effective available (DB remaining minus already allocated in this form)
      const alreadyAllocated = ton ? tonAllocated[ton.id] || 0 : 0;
      const tonAvailableNet = maxScaled(
        subScaled(tonAvailable, alreadyAllocated, METER_SCALE),
        0,
        METER_SCALE,
      );
      if (validate && safeRequiredMeters > tonAvailableNet) {
        setValidationError(
          t("createOrder.insufficientRakhtMeters", {
            available: formatScaled(tonAvailableNet, { scale: 2 }),
            defaultValue: `Insufficient meters. Available: ${formatScaled(tonAvailableNet, { scale: 2 })}`,
          }),
        );
        return null;
      }
      if (ton) {
        tonAllocated[ton.id] = alreadyAllocated + safeRequiredMeters;
      }

      rakhtSelections.push({
        orderId: item.orderId || undefined,
        type: item.type,
        orderItemKey: item.key,
        rakhtId: selectedRakht.id,
        rakhtTonId: ton?.id || rakhtTonId,
        rakhtCompanyName: selectedRakht.companyName,
        rakhtBrandName: selectedRakht.brandName,
        rakhtColor: ton?.name || "",
        rakhtColorHex: ton?.colorHex || "",
        requiredMeters: validate
          ? safeRequiredMeters
          : current.requiredMeters || "",
        piecePrice: validate ? safePiecePrice : current.piecePrice || "",
        priceForCustomer: validate
          ? safePriceForCustomer
          : current.priceForCustomer || "",
        totalPriceForCustomer: validate
          ? mulScaled(safePriceForCustomer, safeRequiredMeters, MONEY_SCALE)
          : "",
      });
    }

    return rakhtSelections;
  };

  useImperativeHandle(ref, () => ({
    getDraftData: () => ({ rakhtSelections: buildRakhtSelections() }),
  }));

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError("");

    const rakhtSelections = buildRakhtSelections({ validate: true });
    if (!rakhtSelections) return;

    onNext({ rakhtSelections });
  };

  return (
    <form onSubmit={handleSubmit} className="rakht-step-form">
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
        <div
          className="info-box ib-red"
          style={{ marginBottom: 14 }}
          role="alert"
          aria-live="polite"
        >
          {t("createOrder.selectAtLeastOne", {
            defaultValue: "Please select at least one order type.",
          })}
        </div>
      ) : (
        <div className="rakht-step-stack">
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

            const tonOptions = (selectedRakht?.tons || [])
              .filter((ton) => {
                if (ton.id === rakhtTonId) return true;
                return getTonRemainingMeters(ton) > 0;
              })
              .map((ton, idx) => ({
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
              <div key={item.key} className="card rakht-step-card">
                <div className="rakht-step-card__head">
                  <p className="rakht-step-card__title">{typeLabel}</p>
                  <span className="rakht-step-card__badge">
                    {getOrderTypeLabel(item.type, language)}
                  </span>
                </div>

                <div className="rakht-step-card__body">
                  <div className="rakht-step-card__grid">
                    <Field
                      label={t("rakht.companyName", {
                        defaultValue: "Company",
                      })}
                    >
                      <Select
                        classNamePrefix="rs"
                        menuPortalTarget={
                          typeof document !== "undefined" ? document.body : null
                        }
                        menuPosition="fixed"
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
                        styles={selectStyles}
                      />
                    </Field>

                    <Field
                      label={t("rakht.brandName", {
                        defaultValue: "Brand Name",
                      })}
                    >
                      <Select
                        classNamePrefix="rs"
                        menuPortalTarget={
                          typeof document !== "undefined" ? document.body : null
                        }
                        menuPosition="fixed"
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
                        styles={selectStyles}
                      />
                    </Field>

                    <Field
                      label={t("rakht.chooseColor", {
                        defaultValue: "Choose Color",
                      })}
                    >
                      <Select
                        classNamePrefix="rs"
                        menuPortalTarget={
                          typeof document !== "undefined" ? document.body : null
                        }
                        menuPosition="fixed"
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
                            <span className="rakht-ton-option">
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
                              <span>{opt.label}</span>
                              {opt.ton && (
                                <span className="rakht-ton-option__meta">
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
                        styles={selectStyles}
                      />
                    </Field>
                  </div>

                  <div className="rakht-step-card__grid rakht-step-card__grid--compact">
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
                              { maxFractionDigits: METER_SCALE },
                            );
                            if (sanitized === "") {
                              updateSelection(item.key, { requiredMeters: "" });
                              return;
                            }
                            const displayValue = sanitized.startsWith(".")
                              ? `0${sanitized}`
                              : sanitized;

                            const parsedMeters = toScaledNumber(
                              displayValue,
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
                              requiredMeters:
                                clampedMeters < parsedMeters
                                  ? formatScaled(clampedMeters, {
                                      scale: METER_SCALE,
                                    })
                                  : displayValue,
                            });
                          }}
                        />
                      </div>
                    </Field>
                  </div>

                  {/* Selling Price per Meter (read-only) + Total Price (auto-calc) */}
                  <div className="rakht-step-card__pair-grid">
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
                          style={moneyInputStyles}
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
                              ? formatMoneyValue(computedTotalPrice)
                              : "0"
                          }
                          readOnly
                          disabled
                          style={moneyInputStyles}
                        />
                      </div>
                    </Field>
                  </div>

                  {/* Price for Customer (editable) + Total Price for Customer (auto-calc) */}
                  <div className="rakht-step-card__pair-grid">
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
                              ? formatMoneyValue(computedTotalPriceForCustomer)
                              : "0"
                          }
                          readOnly
                          disabled
                          style={{
                            ...moneyInputStyles,
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
                        className={`rakht-step-summary-card ${requiredMeters > 0 && requiredMeters > availableMeters ? "rakht-step-summary-card--warning" : ""}`}
                        dir={isRtlLanguage ? "rtl" : "ltr"}
                      >
                        <div className="rakht-step-summary-card__stats">
                          <div className="rakht-step-summary-stat">
                            <span className="rakht-step-summary-stat__label">
                              {t("rakht.availableMeters", {
                                defaultValue: "Available",
                              })}
                            </span>
                            <strong className="rakht-step-summary-stat__value">
                              {formatScaled(availableMeters, { scale: 2 })}
                            </strong>
                          </div>
                          <div className="rakht-step-summary-stat">
                            <span className="rakht-step-summary-stat__label">
                              {t("rakht.remainingAfterSelection", {
                                defaultValue: "Remaining after selection",
                              })}
                            </span>
                            <strong className="rakht-step-summary-stat__value">
                              {formatScaled(remainingAfter, { scale: 2 })}
                            </strong>
                          </div>
                          <div className="rakht-step-summary-stat">
                            <span className="rakht-step-summary-stat__label">
                              {t("rakht.companyName", {
                                defaultValue: "Company",
                              })}
                            </span>
                            <strong className="rakht-step-summary-stat__value">
                              {selectedRakht?.companyName || "-"}
                            </strong>
                          </div>
                        </div>
                        <div className="rakht-step-summary-card__footer">
                          {computedTotalPriceForCustomer > 0 && (
                            <div className="rakht-step-summary-stat rakht-step-summary-stat--primary">
                              <span className="rakht-step-summary-stat__label">
                                {t("rakht.totalPriceForCustomer", {
                                  defaultValue: "Total for Customer",
                                })}
                              </span>
                              <strong className="rakht-step-summary-stat__value">
                                {formatMoneyValue(
                                  computedTotalPriceForCustomer,
                                )}
                              </strong>
                            </div>
                          )}
                          <div
                            className={`rakht-step-summary-stat rakht-step-summary-stat--benefit ${rakhtBenefit >= 0 ? "is-positive" : "is-negative"}`}
                          >
                            <span className="rakht-step-summary-stat__label">
                              {t("rakht.benefit", {
                                defaultValue: "Rakht Benefit",
                              })}
                            </span>
                            <strong className="rakht-step-summary-stat__value">
                              {formatMoneyValue(rakhtBenefit)}
                            </strong>
                          </div>
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
        <div
          className="info-box ib-red"
          style={{ marginTop: 12 }}
          role="alert"
          aria-live="polite"
        >
          {validationError}
        </div>
      ) : null}

      <div className="rakht-step-actions">
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
});

export default Step2RakhtSelection;
