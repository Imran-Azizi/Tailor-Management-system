import { useState } from "react";
import { parseNumberLocale } from "../../lib/normalize.js";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  LuChevronDown,
  LuChevronUp,
  LuTrash2,
  LuTriangleAlert,
  LuX,
  LuRuler,
  LuPalette,
} from "react-icons/lu";
import api from "../../lib/api.js";
import { getOrderTypeLabel } from "../../lib/orderType.js";

const FIELDS = {
  OUTFIT: [
    ["height", "height"],
    ["shoulder", "shoulder"],
    ["sleeve", "sleeve"],
    ["neck", "neck"],
    ["chest", "chest"],
    ["armpit", "armpit"],
    ["waist", "waist"],
    ["skirt", "skirt"],
    ["tenban", "tenban"],
    ["pantLeg", "pantLeg"],
    ["arm", "arm"],
    ["calf", "calf"],
  ],
  WASKAT: [
    ["height", "height"],
    ["shoulder", "shoulder"],
    ["neck", "neck"],
    ["chest", "chest"],
    ["waist", "waist"],
    ["sorain", "sorain"],
  ],
  KORTY: [
    ["height", "height"],
    ["arm", "arm"],
    ["shoulder", "shoulder"],
    ["neck", "neck"],
    ["sleeve", "sleeve"],
    ["patlonHeight", "patlonHeight"],
    ["kamerPatlon", "kamerPatlon"],
    ["doroBaghlePatlon", "doroBaghlePatlon"],
    ["waist", "waist"],
    ["sorainPatlon", "sorainPatlon"],
    ["sorain", "sorain"],
    ["patPatlon", "patPatlon"],
    ["pachaPatlon", "pachaPatlon"],
  ],
  YAKHANQAQ: [
    ["height", "height"],
    ["sleeve", "sleeve"],
    ["shoulder", "shoulder"],
    ["neck", "neck"],
    ["armpit", "armpit"],
    ["sorain", "sorain"],
    ["chest", "chest"],
  ],
};

const STYLES = {
  OUTFIT: [
    ["neckStyle", "neck", "neckoutfit"],
    ["sleeveStyle", "sleeve", "astin"],
    ["sleeveSize", "sleeveSize", null],
    ["skirtStyle", "skirt", "daman"],
    ["outfitDesign", "design", "daman"],
    ["outfitStyle", "style", "daman"],
    ["buttonStyle", "button", "buttonship"],
    ["pantStyle", "pant", "tenbanship"],
  ],
  WASKAT: [
    ["neckStyle", "neck", "neckwaskat"],
    ["shoulderState", "shoulderState", "shoulderstate"],
    ["waskatStyle", "style", "__textarea"],
  ],
  KORTY: [["style", "style", "__textarea"]],
  YAKHANQAQ: [
    ["neckStyle", "neck", "neckoutfit"],
    ["sleeveStyle", "sleeve", "astin"],
    ["sleeveSize", "sleeveSize", null],
    ["skirtStyle", "skirt", "daman"],
    ["yakhanQaqDesign", "design", "daman"],
    ["buttonStyle", "button", "buttonship"],
    ["pantStyle", "pant", "tenbanship"],
  ],
};

const POCKETS = {
  OUTFIT: [
    ["frontPocket", "frontPocket"],
    ["sidePocket", "sidePocket"],
    ["underPocket", "underPocket"],
  ],
  YAKHANQAQ: [["frontPocket", "frontPocket"]],
};

const REQUIRED_LABELS = {
  OUTFIT: {
    height: "height",
    shoulder: "shoulder",
    sleeve: "sleeve",
    neck: "neck",
    chest: "chest",
    armpit: "armpit",
    waist: "waist",
    skirt: "skirt",
    tenban: "tenban",
    pantLeg: "pantLeg",
    arm: "arm",
    calf: "calf",
  },
  WASKAT: {
    height: "height",
    shoulder: "shoulder",
    neck: "neck",
    chest: "chest",
    waist: "waist",
    sorain: "sorain",
  },
  KORTY: {
    height: "height",
    arm: "arm",
    shoulder: "shoulder",
    neck: "neck",
    sleeve: "sleeve",
    patlonHeight: "patlonHeight",
    kamerPatlon: "kamerPatlon",
    doroBaghlePatlon: "doroBaghlePatlon",
    waist: "waist",
    sorainPatlon: "sorainPatlon",
    sorain: "sorain",
    patPatlon: "patPatlon",
    pachaPatlon: "pachaPatlon",
  },
  YAKHANQAQ: {
    height: "height",
    sleeve: "sleeve",
    shoulder: "shoulder",
    neck: "neck",
    armpit: "armpit",
    sorain: "sorain",
    chest: "chest",
  },
};

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
  return `${getOrderTypeDisplayName(type, language)} ${sequence}`;
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
  onRemove,
  canRemove,
  errors = {},
  setFieldError,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const [open, setOpen] = useState(true);
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
  const { data: tenbanship } = useDesign("tenbanship");
  const designMaps = {
    yakhan,
    neckoutfit,
    neckwaskat,
    astin,
    daman,
    shoulderstate,
    buttonship,
    tenbanship,
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
            {getOrderTypeLabel(entry.type, language)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {entry.name || t("createOrder.measurements")}
          </span>
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
          <div className="measure-section-head">
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <LuRuler size={14} />
              {t("createOrder.measurements")}
            </span>
            <span>{t("createOrder.requiredFieldHint")}</span>
          </div>

          <div className="measure-grid">
            {fields.map(([key, label]) => (
              <div key={key} className="measure-field">
                <label className="lbl lbl-r" style={{ fontSize: 11 }}>
                  {t(`createOrder.fields.${label}`)}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  className={`inp${errors[key] ? " err" : ""}`}
                  style={{ height: 38, fontSize: 13 }}
                  value={value?.[key] || ""}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={t(`createOrder.fields.${label}`)}
                />
                {errors[key] && <p className="err-msg">{errors[key]}</p>}
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
                      {t(`createOrder.fields.${label}`)}
                    </label>
                    {model === "__textarea" ? (
                      <textarea
                        className={`inp${errors[key] ? " err" : ""}`}
                        style={{ height: 80, fontSize: 13 }}
                        value={value?.[key] || ""}
                        onChange={(e) => setField(key, e.target.value)}
                        placeholder={t(`createOrder.fields.${label}`)}
                      />
                    ) : model === null ? (
                      <input
                        type="text"
                        className={`inp${errors[key] ? " err" : ""}`}
                        style={{ height: 38, fontSize: 13 }}
                        value={value?.[key] || ""}
                        onChange={(e) => setField(key, e.target.value)}
                        placeholder={t(`createOrder.fields.${label}`)}
                      />
                    ) : (
                      <Select
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
                    {errors[key] && <p className="err-msg">{errors[key]}</p>}
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

          {entry.type === "OUTFIT" && (
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

export default function Step3Measurements({
  onNext,
  onBack,
  orderTypes = [],
  initial = {},
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const [data, setData] = useState(() => {
    const draft = {};
    orderTypes.forEach((entry, index) => {
      const source = initial[index]
        ? Array.isArray(initial[index])
          ? initial[index]
          : [initial[index]]
        : [];

      const normalized = (source.length ? source : [{}]).map(
        (setValue, setIndex) => {
          const safeSet = setValue && typeof setValue === "object" ? setValue : {};
          if (safeSet.__name?.trim()) return safeSet;
          if (setIndex === 0 && entry.name?.trim()) {
            return { ...safeSet, __name: entry.name.trim() };
          }
          return {
            ...safeSet,
            __name: buildDefaultItemName(entry.type, setIndex + 1, language),
          };
        },
      );

      draft[index] = normalized;
    });
    return draft;
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const setMeasure = (typeIdx, setIdx, nextValue) => {
    setError("");
    setData((prev) => {
      const nextSets = [...(prev[typeIdx] || [{}])];
      nextSets[setIdx] = nextValue;
      return { ...prev, [typeIdx]: nextSets };
    });
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
      const sequence = currentSets.length + 1;
      const fallbackType = orderTypes[typeIdx]?.type;
      return {
        ...prev,
        [typeIdx]: [
          ...currentSets,
          {
            __name: buildDefaultItemName(fallbackType, sequence, language),
          },
        ],
      };
    });
  };

  const validateBeforeContinue = () => {
    const nextFieldErrors = {};

    for (let typeIdx = 0; typeIdx < orderTypes.length; typeIdx += 1) {
      const entry = orderTypes[typeIdx];
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
          const setLabel =
            setValue.__name?.trim() ||
            entry.name?.trim() ||
            `Set ${setIdx + 1}`;
          const message = t("createOrder.completeMeasurements", {
            type: getOrderTypeLabel(entry.type, language),
            label: setLabel,
          });
          setFieldErrors(nextFieldErrors);
          setError(message);
          toast.error(message);
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
        <div className="info-box ib-red" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="measure-order-stack">
        {orderTypes.map((entry, typeIdx) => (
          <section
            key={`${entry.type}-${typeIdx}`}
            className="measure-order-card"
          >
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
                    {getOrderTypeLabel(entry.type, language)}
                  </span>
                  {entry.name && (
                    <span className="badge bg-gold">{entry.name}</span>
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
              </div>
            </div>

            <div className="measure-block-stack">
              {(data[typeIdx] || [{}]).map((setValue, setIdx) => {
                const blockErrors = Object.fromEntries(
                  Object.entries(fieldErrors)
                    .filter(([key]) => key.startsWith(`${typeIdx}-${setIdx}-`))
                    .map(([key, value]) => [
                      key.split("-").slice(2).join("-"),
                      value,
                    ]),
                );

                return (
                  <MeasureBlock
                    key={`${typeIdx}-${setIdx}`}
                    entry={{
                      ...entry,
                      name:
                        setValue.__name?.trim() ||
                        entry.name ||
                        buildDefaultItemName(entry.type, setIdx + 1, language),
                    }}
                    value={setValue}
                    errors={blockErrors}
                    onChange={(nextValue) =>
                      setMeasure(typeIdx, setIdx, nextValue)
                    }
                    onRemove={() => removeSet(typeIdx, setIdx)}
                    canRemove={(data[typeIdx] || []).length > 1}
                    setFieldError={(field) =>
                      clearFieldError(typeIdx, setIdx, field)
                    }
                  />
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => addSet(typeIdx)}
              >
                Add another
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
}
