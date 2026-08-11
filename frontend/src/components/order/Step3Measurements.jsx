import { forwardRef, useImperativeHandle, useState } from "react";
import { parseNumberLocale } from "../../lib/normalize.js";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import {
  LuChevronDown,
  LuChevronUp,
  LuTrash2,
  LuTriangleAlert,
  LuX,
  LuRuler,
  LuPalette,
  LuCopy,
  LuClipboardPaste,
} from "react-icons/lu";
import api from "../../lib/api.js";
import { notifyInfo, notifySuccess, notifyWarning } from "../../lib/toast.js";
import {
  getOrderCustomName,
  getOrderLabelParts,
  getOrderTypeLabel,
  resolveAssignedSetName,
} from "../../lib/orderType.js";
import {
  getMeasurementFieldLabel,
  getStyleFieldLabel,
} from "./measurementLabels.js";
import {
  MEASUREMENT_FIELDS as FIELDS,
  POCKET_FIELDS as POCKETS,
  STYLE_FIELDS as STYLES,
} from "./measurementStepConfig.js";
import {
  applyMeasurementValues,
  collectMeasurementValues,
} from "./measurementCopyPaste.js";

const REQUIRED_LABELS = {
  OUTFIT: {},
  WASKAT: {},
  KORTY: {},
  YAKHANQAQ: {},
  READY_MADE: {},
  READY_MADE_WASKAT: {},
};

const READY_MADE_CLOTHES_TYPES = new Set(["READY_MADE", "READY_MADE_CLOTHES"]);

function isReadyMadeClothesType(type) {
  return READY_MADE_CLOTHES_TYPES.has(type);
}

const selStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    fontSize: 13,
    borderColor: state.isFocused ? "var(--primary)" : "var(--border2)",
    borderRadius: 8,
    boxShadow: state.isFocused ? "0 0 0 3px rgba(37,99,235,.12)" : "none",
    background: "var(--surface)",
    borderWidth: "1px",
    "&:hover": { borderColor: "var(--primary-200)" },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    background: state.isSelected
      ? "var(--primary)"
      : state.isFocused
        ? "var(--primary-50)"
        : "transparent",
    color: state.isSelected ? "#fff" : "var(--text1)",
  }),
  menu: (base) => ({
    ...base,
    background: "var(--surface)",
    border: "1px solid var(--border2)",
    borderRadius: 10,
    boxShadow: "var(--sh-lg)",
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  placeholder: (base) => ({ ...base, color: "var(--text3)", fontSize: 13 }),
  singleValue: (base) => ({ ...base, color: "var(--text1)", fontSize: 13 }),
};

function getFieldKey(typeIdx, setIdx, field) {
  return `${typeIdx}-${setIdx}-${field}`;
}

function getOrderTypeDisplayName(type, language = "en") {
  return getOrderTypeLabel(type, language) || type || "Item";
}

function buildDefaultItemName(type, sequence, language = "en") {
  return getOrderTypeDisplayName(type, language);
}

function resolveInitialSetName({
  setValue,
  entry,
  setIndex,
  totalSets,
  customerName,
  language,
}) {
  const existingName = String(setValue?.__name || "").trim();
  const entryName = String(entry?.name || "").trim();
  const primaryCustomerName = String(customerName || entryName || "").trim();

  if (existingName) {
    const customName = getOrderCustomName(
      {
        ...entry,
        orderName: existingName,
        orderTypeSequence: setIndex + 1,
        orderTypeTotal: totalSets,
      },
      language,
    );
    if (customName) return customName;
    // Replace default type labels (e.g. "پیراهن تنبان") with the assigned set name.
    if (setIndex === 0 && primaryCustomerName) return primaryCustomerName;
    return existingName;
  }

  if (setIndex === 0 && primaryCustomerName) return primaryCustomerName;

  return buildDefaultItemName(entry?.type, setIndex + 1, language);
}

function buildMeasurementEntryLabel(
  entry,
  setValue,
  setIdx,
  totalSets,
  language,
  customerName = "",
) {
  return getOrderLabelParts(
    {
      ...entry,
      orderName: resolveAssignedSetName(
        {
          ...entry,
          orderName: setValue?.__name?.trim() || entry?.name?.trim() || "",
          orderTypeSequence: setIdx + 1,
          orderTypeTotal: totalSets,
        },
        setIdx === 0 ? customerName : "",
        language,
        {
          isPrimarySet: setIdx === 0,
          allowTypeFallback: false,
        },
      ),
      orderTypeSequence: setIdx + 1,
      orderTypeTotal: totalSets,
    },
    language,
  );
}

function useDesign(model) {
  return useQuery({
    queryKey: ["design", model],
    queryFn: () => api.get(`/designs/${model}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

function MeasureBlock({
  entry,
  value,
  onChange,
  onNameChange,
  onRemove,
  canRemove,
  showNameInput = false,
  defaultName = "",
  errors = {},
  setFieldError,
  onCopy,
  onPaste,
  showCopyAction = false,
  showPasteAction = false,
  canPaste = false,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
  const [open, setOpen] = useState(true);
  const labelParts = getOrderLabelParts(entry, language);
  const fields = FIELDS[entry.type] || [];
  const styles = STYLES[entry.type] || [];
  const pockets = POCKETS[entry.type] || [];

  const { data: yakhan } = useDesign("yakhan");
  const { data: neckoutfit } = useDesign("neckoutfit");
  const { data: neckwaskat } = useDesign("neckwaskat");
  const { data: astin } = useDesign("astin");
  const { data: daman } = useDesign("daman");
  const { data: shoulderstate } = useDesign("shoulderstate");
  const { data: buttonship } = useDesign("buttonship");
  const { data: patyship } = useDesign("patyship");
  const { data: tenbanship } = useDesign("tenbanship");
  const { data: outfitdesign } = useDesign("outfitdesign");
  const { data: yakhanqaqneck } = useDesign("yakhanqaqneck");
  const { data: yakhanqaqsleeve } = useDesign("yakhanqaqsleeve");
  const { data: yakhanqaqskirt } = useDesign("yakhanqaqskirt");
  const { data: yakhanqaqdesign } = useDesign("yakhanqaqdesign");
  const { data: yakhanqaqbutton } = useDesign("yakhanqaqbutton");
  const { data: yakhanqaqpant } = useDesign("yakhanqaqpant");
  const designMaps = {
    yakhan,
    neckoutfit,
    neckwaskat,
    astin,
    daman,
    shoulderstate,
    buttonship,
    patyship,
    tenbanship,
    outfitdesign,
    yakhanqaqneck,
    yakhanqaqsleeve,
    yakhanqaqskirt,
    yakhanqaqdesign,
    yakhanqaqbutton,
    yakhanqaqpant,
  };

  const setField = (key, nextValue) => {
    setFieldError(key, "");
    onChange({ ...value, [key]: nextValue });
  };

  const options = (items) =>
    (items || []).map((item) => ({ value: item.name, label: item.name }));

  return (
    <div className="measure-block">
      <div
        className="measure-block-head"
        onClick={() => setOpen((current) => !current)}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span className="badge bg-gold" style={{ fontSize: 11 }}>
            {entry.displayLabel || labelParts.typeWithSequenceLabel}
          </span>
          {(entry.customName || labelParts.customName) && (
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {entry.customName || labelParts.customName}
            </span>
          )}
          {entry.isEmergency && (
            <span className="badge bg-red" style={{ fontSize: 10 }}>
              <LuTriangleAlert size={9} /> {t("createOrder.emergencyShort")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#DC2626",
                display: "flex",
                padding: 2,
              }}
            >
              <LuTrash2 size={14} />
            </button>
          )}
          {open ? (
            <LuChevronUp size={16} style={{ color: "var(--text3)" }} />
          ) : (
            <LuChevronDown size={16} style={{ color: "var(--text3)" }} />
          )}
        </div>
      </div>

      {open && (
        <div className="measure-block-body">
          {showNameInput && (
            <div style={{ marginBottom: 14 }}>
              <label className="lbl" style={{ fontSize: 11 }}>
                {t("createOrder.nameNewSet")}
              </label>
              <input
                type="text"
                className="inp"
                style={{ height: 38, fontSize: 13 }}
                value={value?.__name || ""}
                onChange={(e) => onNameChange?.(e.target.value)}
                placeholder={defaultName}
              />
            </div>
          )}

          {(showCopyAction || showPasteAction) && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginBottom: 14,
                flexWrap: "nowrap",
                alignItems: "center",
              }}
            >
              {showCopyAction && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={onCopy}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <LuCopy size={14} />
                    {t("createOrder.copyMeasurements")}
                  </span>
                </button>
              )}
              {showPasteAction && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={onPaste}
                  disabled={!canPaste}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <LuClipboardPaste size={14} />
                    {t("createOrder.pasteMeasurements")}
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="measure-section-head">
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <LuRuler size={14} />
              {t("createOrder.measurements")}
            </span>
          </div>

          <div className="measure-grid">
            {fields.map(([key, label]) => (
              <div key={key} className="measure-field">
                <label className="lbl" style={{ fontSize: 11 }}>
                  {getMeasurementFieldLabel(t, label)}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className={`inp${errors[key] ? " err" : ""}`}
                  style={{ height: 38, fontSize: 13 }}
                  value={value?.[key] ?? ""}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={getMeasurementFieldLabel(t, label)}
                />
                {errors[key] && (
                  <p className="err-msg" role="alert" aria-live="polite">
                    {errors[key]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {styles.length > 0 && (
            <div>
              <div className="measure-section-head" style={{ marginTop: 18 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <LuPalette size={14} />
                  {t("createOrder.styleOptions")}
                </span>
                <span>{t("createOrder.optionalFinishing")}</span>
              </div>
              <div className="measure-style-grid">
                {styles.map(([key, label, model]) => (
                  <div key={key} className="measure-field">
                    <label className="lbl" style={{ fontSize: 11 }}>
                      {getStyleFieldLabel(t, label)}
                    </label>
                    {model === "__textarea" ? (
                      <textarea
                        className={`inp${errors[key] ? " err" : ""}`}
                        style={{ height: 80, fontSize: 13 }}
                        value={value?.[key] || ""}
                        onChange={(e) => setField(key, e.target.value)}
                        placeholder={getStyleFieldLabel(t, label)}
                      />
                    ) : model === null ? (
                      <input
                        type="text"
                        className={`inp${errors[key] ? " err" : ""}`}
                        style={{ height: 38, fontSize: 13 }}
                        value={value?.[key] ?? ""}
                        onChange={(e) => setField(key, e.target.value)}
                        placeholder={getStyleFieldLabel(t, label)}
                      />
                    ) : (
                      <Select
                        classNamePrefix="rs"
                        isRtl={isRtl}
                        options={options(designMaps[model])}
                        value={
                          value?.[key]
                            ? { value: value[key], label: value[key] }
                            : null
                        }
                        onChange={(option) =>
                          setField(key, option?.value || "")
                        }
                        isClearable
                        placeholder={t("common.add")}
                        styles={selStyles}
                        menuPortalTarget={
                          typeof document !== "undefined" ? document.body : null
                        }
                        menuPosition="fixed"
                      />
                    )}
                    {errors[key] && (
                      <p className="err-msg" role="alert" aria-live="polite">
                        {errors[key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pockets.length > 0 && (
            <div>
              <div className="measure-section-head" style={{ marginTop: 18 }}>
                <span>{t("createOrder.pocketOptions")}</span>
                <span>{t("createOrder.optionalExtras")}</span>
              </div>
              <div className="measure-pocket-grid">
                {pockets.map(([key, label]) => (
                  <label key={key} className="measure-pocket-chip">
                    <input
                      type="checkbox"
                      checked={!!value?.[key]}
                      onChange={(e) => setField(key, e.target.checked)}
                    />
                    <span>{t(`createOrder.fields.${label}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {(entry.type === "OUTFIT" || isReadyMadeClothesType(entry.type)) && (
            <div style={{ marginTop: 18 }}>
              <label className="lbl">{t("createOrder.additionalNotes")}</label>
              <textarea
                className="inp"
                style={{ height: 72, fontSize: 13 }}
                rows={3}
                value={value?.additionalStyleInfo || ""}
                onChange={(e) =>
                  setField("additionalStyleInfo", e.target.value)
                }
                placeholder={t("createOrder.additionalNotes")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Step3Measurements = forwardRef(function Step3Measurements(
  { onNext, onBack, orderTypes = [], initial = {}, customerName = "" },
  ref,
) {
  const orderTypeEntries = Array.isArray(orderTypes) ? orderTypes : [];
  const typeList = orderTypeEntries.map((entry) => entry?.type);
  const hasReadyMadeClothes = typeList.some((type) =>
    READY_MADE_CLOTHES_TYPES.has(type),
  );
  const hasReadyMadeWaskat = typeList.includes("READY_MADE_WASKAT");
  const hideReadyMadeWaskatMeasurements =
    hasReadyMadeClothes && hasReadyMadeWaskat;
  const visibleMeasurementEntries = orderTypeEntries
    .map((entry, originalIndex) => ({ entry, originalIndex }))
    .filter(
      ({ entry }) =>
        !(
          hideReadyMadeWaskatMeasurements && entry?.type === "READY_MADE_WASKAT"
        ),
    );
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const primaryCustomerName = String(customerName || "").trim();
  const [data, setData] = useState(() => {
    const draft = {};
    visibleMeasurementEntries.forEach(({ entry, originalIndex }) => {
      const source = initial[originalIndex]
        ? Array.isArray(initial[originalIndex])
          ? initial[originalIndex]
          : [initial[originalIndex]]
        : [];

      const normalizedSource = source.length ? source : [{}];
      const normalized = normalizedSource.map((setValue, setIndex) => {
        const safeSet =
          setValue && typeof setValue === "object" ? setValue : {};
        const nextName = resolveInitialSetName({
          setValue: safeSet,
          entry,
          setIndex,
          totalSets: normalizedSource.length,
          customerName: primaryCustomerName,
          language,
        });
        if (safeSet.__name?.trim() === nextName) return safeSet;
        return { ...safeSet, __name: nextName };
      });

      draft[originalIndex] = normalized;
    });
    return draft;
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [copiedMeasurements, setCopiedMeasurements] = useState(null);

  const hasCopiedMeasurements = Object.values(copiedMeasurements || {}).some(
    (value) => String(value ?? "").trim() !== "",
  );

  useImperativeHandle(ref, () => ({
    getDraftData: () => ({ measurements: data }),
  }));

  const setMeasure = (typeIdx, setIdx, nextValue) => {
    setError("");
    setData((prev) => {
      const nextSets = [...(prev[typeIdx] || [{}])];
      nextSets[setIdx] = nextValue;
      return { ...prev, [typeIdx]: nextSets };
    });
  };

  const setCustomName = (typeIdx, setIdx, customName) => {
    setError("");
    setData((prev) => {
      const nextSets = [...(prev[typeIdx] || [{}])];
      const current = nextSets[setIdx] || {};
      nextSets[setIdx] = {
        ...current,
        __name: customName,
      };
      return { ...prev, [typeIdx]: nextSets };
    });
  };

  const copyMeasurementSet = (typeIdx, setIdx) => {
    const currentSet = (data[typeIdx] || [{}])[setIdx] || {};
    const measurementFields = FIELDS[orderTypeEntries[typeIdx]?.type] || [];
    const nextCopiedValues = collectMeasurementValues(
      currentSet,
      measurementFields,
    );

    if (
      !Object.values(nextCopiedValues).some(
        (value) => String(value ?? "").trim() !== "",
      )
    ) {
      notifyInfo(
        t(
          "createOrder.copyMeasurementsEmpty",
          "No measurement values to copy yet.",
        ),
      );
      return;
    }

    setCopiedMeasurements(nextCopiedValues);
    notifySuccess(t("createOrder.measurementsCopied", "Measurements copied."));
  };

  const pasteMeasurementSet = (typeIdx, setIdx) => {
    if (!hasCopiedMeasurements) {
      notifyWarning(
        t(
          "createOrder.pasteMeasurementsDisabled",
          "Copy measurements first to paste them.",
        ),
      );
      return;
    }

    const currentSet = (data[typeIdx] || [{}])[setIdx] || {};
    const measurementFields = FIELDS[orderTypeEntries[typeIdx]?.type] || [];
    const nextSet = applyMeasurementValues(
      currentSet,
      copiedMeasurements,
      measurementFields,
    );

    setMeasure(typeIdx, setIdx, nextSet);
    notifySuccess(t("createOrder.measurementsPasted", "Measurements pasted."));
  };

  const clearFieldError = (typeIdx, setIdx, field) => {
    setFieldErrors((prev) => ({
      ...prev,
      [getFieldKey(typeIdx, setIdx, field)]: "",
    }));
  };

  const removeSet = (typeIdx, setIdx) => {
    setError("");
    setData((prev) => {
      const nextSets = (prev[typeIdx] || []).filter(
        (_, index) => index !== setIdx,
      );
      return { ...prev, [typeIdx]: nextSets.length > 0 ? nextSets : [{}] };
    });
  };

  const addSet = (typeIdx) => {
    setError("");
    setData((prev) => {
      const currentSets = prev[typeIdx] || [];
      return {
        ...prev,
        [typeIdx]: [...currentSets, { __name: "" }],
      };
    });
  };

  const validateBeforeContinue = () => {
    const nextFieldErrors = {};

    for (const { entry, originalIndex: typeIdx } of visibleMeasurementEntries) {
      const sets = data[typeIdx] || [{}];
      const required = REQUIRED_LABELS[entry.type] || {};

      for (let setIdx = 0; setIdx < sets.length; setIdx += 1) {
        const setValue = sets[setIdx] || {};
        const missingLabels = [];

        Object.entries(required).forEach(([field, labelKey]) => {
          const value = setValue[field];
          const key = getFieldKey(typeIdx, setIdx, field);
          const labelText = t(`createOrder.fields.${labelKey}`);

          if (
            value === undefined ||
            value === null ||
            String(value).trim() === ""
          ) {
            nextFieldErrors[key] = t("createOrder.fieldRequired", {
              field: labelText,
            });
            missingLabels.push(labelText);
            return;
          }

          if (Number.isNaN(parseNumberLocale(String(value)))) {
            nextFieldErrors[key] = t("createOrder.fieldNumber", {
              field: labelText,
            });
            missingLabels.push(labelText);
          }
        });

        if (missingLabels.length) {
          const labelParts = buildMeasurementEntryLabel(
            entry,
            setValue,
            setIdx,
            sets.length,
            language,
            primaryCustomerName,
          );
          const setLabel =
            labelParts.fullLabel ||
            setValue.__name?.trim() ||
            `Set ${setIdx + 1}`;
          const message = t("createOrder.completeMeasurements", {
            type: getOrderTypeLabel(entry.type, language),
            label: setLabel,
          });
          setFieldErrors(nextFieldErrors);
          setError(message);
          return;
        }
      }
    }

    setFieldErrors({});
    setError("");
    onNext({ measurements: data });
  };

  return (
    <div className="form-stagger">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {t("createOrder.measurements")}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
        {t("createOrder.measurementsCopy")}
      </p>

      {error && (
        <div
          className="info-box ib-red"
          style={{ marginBottom: 16 }}
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <div className="measure-order-stack">
        {visibleMeasurementEntries.map(({ entry, originalIndex: typeIdx }) => (
          <section
            key={`${entry.type}-${typeIdx}`}
            className="measure-order-card"
          >
            {(() => {
              const totalSets = (data[typeIdx] || [{}]).length;
              const headerLabel = buildMeasurementEntryLabel(
                entry,
                { __name: entry.name || primaryCustomerName || "" },
                0,
                totalSets,
                language,
                primaryCustomerName,
              );

              return (
                <div className="measure-order-card-head">
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 17, fontWeight: 800 }}>
                        {headerLabel.typeWithSequenceLabel}
                      </span>
                      {headerLabel.customName && (
                        <span className="badge bg-gold">
                          {headerLabel.customName}
                        </span>
                      )}
                      {entry.isEmergency && (
                        <span className="badge bg-red">
                          <LuTriangleAlert size={10} />{" "}
                          {t("createOrder.emergencyShort")}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text3)" }}>
                      {entry.isEmergency && entry.emergencyExpiry
                        ? t("createOrder.emergencyExpiry", {
                            date: entry.emergencyExpiry,
                          })
                        : t("createOrder.fillMeasurements")}
                    </p>
                    {(entry.type === "READY_MADE" ||
                      entry.type === "READY_MADE_WASKAT") && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#059669",
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        {entry.type === "READY_MADE"
                          ? t(
                              "createOrder.readyMadeAllOptional",
                              "All measurements are optional for Ready-Made Clothes",
                            )
                          : t(
                              "createOrder.readyMadeWaskatAllOptional",
                              "All measurements are optional for Ready-Made Waskat",
                            )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="measure-block-stack">
              {(data[typeIdx] || [{}]).map((setValue, setIdx) => {
                const totalSets = (data[typeIdx] || [{}]).length;
                const labelParts = buildMeasurementEntryLabel(
                  entry,
                  setValue,
                  setIdx,
                  totalSets,
                  language,
                  primaryCustomerName,
                );
                const blockErrors = Object.fromEntries(
                  Object.entries(fieldErrors)
                    .filter(([key]) => key.startsWith(`${typeIdx}-${setIdx}-`))
                    .map(([key, value]) => [
                      key.split("-").slice(2).join("-"),
                      value,
                    ]),
                );

                const assignedSetName =
                  setValue.__name?.trim() ||
                  (setIdx === 0 ? primaryCustomerName : "") ||
                  entry.name ||
                  "";

                return (
                  <MeasureBlock
                    key={`${typeIdx}-${setIdx}`}
                    entry={{
                      ...entry,
                      name: assignedSetName,
                      orderTypeSequence: setIdx + 1,
                      orderTypeTotal: totalSets,
                      displayLabel: labelParts.typeWithSequenceLabel,
                      customName: labelParts.customName || assignedSetName,
                    }}
                    value={setValue}
                    errors={blockErrors}
                    onNameChange={(customName) =>
                      setCustomName(typeIdx, setIdx, customName)
                    }
                    onChange={(nextValue) =>
                      setMeasure(typeIdx, setIdx, nextValue)
                    }
                    onRemove={() => removeSet(typeIdx, setIdx)}
                    canRemove={(data[typeIdx] || []).length > 1}
                    showNameInput={setIdx > 0}
                    defaultName={labelParts.typeWithSequenceLabel}
                    setFieldError={(field) =>
                      clearFieldError(typeIdx, setIdx, field)
                    }
                    onCopy={() => copyMeasurementSet(typeIdx, setIdx)}
                    onPaste={() => pasteMeasurementSet(typeIdx, setIdx)}
                    showCopyAction={setIdx === 0}
                    showPasteAction={setIdx > 0}
                    canPaste={hasCopiedMeasurements}
                  />
                );
              })}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "end",
              }}
            >
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => addSet(typeIdx)}
              >
                {t("createOrder.addAnotherSet")}
              </button>
            </div>
          </section>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline"
          style={{ flex: 1 }}
        >
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={validateBeforeContinue}
          className="btn btn-gold"
          style={{ flex: 1 }}
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
});

export default Step3Measurements;
