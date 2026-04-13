import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuCheck,
  LuX,
  LuTriangleAlert,
  LuScissors,
  LuReceipt,
  LuUserRound,
  LuFileText,
} from "react-icons/lu";

const TYPES = [
  { id: "OUTFIT", label: "پیراهن تنبان", Icon: LuScissors },
  { id: "WASKAT", label: "واسکت", Icon: LuUserRound },
  { id: "KORTY", label: "کرتی", Icon: LuReceipt },
  { id: "YAKHANQAQ", label: "یخن قاق", Icon: LuFileText },
];

function isPastDate(value) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(value) < today;
}

export default function Step2OrderTypes({ onNext, onBack, initial = [] }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(initial.length ? initial : []);
  const [errors, setErrors] = useState({});

  const selectedTypes = useMemo(
    () => new Set(entries.map((entry) => entry.type)),
    [entries],
  );

  const toggleType = (id) => {
    if (selectedTypes.has(id)) {
      setEntries(entries.filter((entry) => entry.type !== id));
      setErrors({});
      return;
    }

    setEntries([
      ...entries,
      { type: id, isEmergency: false, emergencyExpiry: "", emergencyHour: "08" },
    ]);
  };

  const updateEntry = (idx, key, value) => {
    setEntries((current) =>
      current.map((entry, index) => {
        if (index !== idx) return entry;
        return {
          ...entry,
          [key]: value,
          ...(key === "isEmergency" && !value
            ? { emergencyExpiry: "", emergencyHour: "08" }
            : {}),
        };
      }),
    );

    setErrors((current) => ({
      ...current,
      [idx]: {
        ...current[idx],
        [key]: "",
        ...(key === "isEmergency" && !value ? { emergencyExpiry: "" } : {}),
      },
    }));
  };

  const removeEntry = (idx) => {
    setEntries((current) => current.filter((_, index) => index !== idx));
    setErrors({});
  };

  const validateBeforeContinue = () => {
    const nextErrors = {};

    entries.forEach((entry, idx) => {
      const entryErrors = {};

      if (entry.isEmergency) {
        if (!entry.emergencyExpiry) {
          entryErrors.emergencyExpiry = t("createOrder.expiryRequired");
        } else if (isPastDate(entry.emergencyExpiry)) {
          entryErrors.emergencyExpiry = t("createOrder.expiryPast");
        }
      }

      if (Object.keys(entryErrors).length) {
        nextErrors[idx] = entryErrors;
      }
    });

    setErrors(nextErrors);

    if (!entries.length) {
      toast.error(t("createOrder.selectAtLeastOne"));
      return;
    }

    if (Object.keys(nextErrors).length) {
      toast.error(t("createOrder.fixHighlightedOrderFields"));
      return;
    }

    onNext({ orderTypes: entries });
  };

  return (
    <div className="form-stagger">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {t("createOrder.orderTypes")}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
        {t("createOrder.orderTypesCopy")}
      </p>

      <div className="type-grid" style={{ marginBottom: 22 }}>
        {TYPES.map(({ id, label, desc, Icon }) => {
          const selected = selectedTypes.has(id);
          return (
            <button
              key={id}
              type="button"
              className={`type-card${selected ? " sel" : ""}`}
              onClick={() => toggleType(id)}
            >
              {selected && (
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "var(--primary)",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LuCheck size={11} />
                </span>
              )}
              <div className="type-card-kicker">
                <Icon size={18} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{label}</p>
              <p
                style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 4 }}
              >
                {desc}
              </p>
            </button>
          );
        })}
      </div>

      {entries.length > 0 && (
        <div className="selected-order-stack" style={{ marginBottom: 18 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 12,
            }}
          >
            {t("createOrder.selectedOrders", { count: entries.length })}
          </p>

          {entries.map((entry, idx) => (
            <div key={`${entry.type}-${idx}`} className="selected-order-card">
              <div className="selected-order-head">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span className="badge bg-gold" style={{ fontSize: 11 }}>
                    {entry.type}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>
                    {t("createOrder.configureOrder")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text3)",
                    display: "flex",
                    padding: 2,
                  }}
                >
                  <LuX size={14} />
                </button>
              </div>

              <div className="selected-order-grid">
                <div>
                  <label className="lbl" style={{ fontSize: 11 }}>
                    {t("createOrder.priority")}
                  </label>
                  <label className="order-toggle">
                    <input
                      type="checkbox"
                      checked={entry.isEmergency}
                      onChange={(e) =>
                        updateEntry(idx, "isEmergency", e.target.checked)
                      }
                    />
                    <span
                      className={`order-toggle-pill${entry.isEmergency ? " on" : ""}`}
                    >
                      <LuTriangleAlert size={12} />
                      {t("createOrder.emergencyOrder")}
                    </span>
                  </label>
                </div>
              </div>

              {entry.isEmergency && (
                <div className="order-expiry-wrap">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* Expiry date */}
                    <div>
                      <label className="lbl lbl-r" style={{ fontSize: 11 }}>
                        {t("createOrder.emergencyExpiryDate")}
                      </label>
                      <input
                        type="date"
                        className={`inp${errors[idx]?.emergencyExpiry ? " err" : ""}`}
                        style={{ height: 38, fontSize: 13, width: "100%" }}
                        value={entry.emergencyExpiry}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) =>
                          updateEntry(idx, "emergencyExpiry", e.target.value)
                        }
                      />
                      {errors[idx]?.emergencyExpiry && (
                        <p className="err-msg">{errors[idx].emergencyExpiry}</p>
                      )}
                    </div>

                    {/* Expiry hour */}
                    <div>
                      <label className="lbl" style={{ fontSize: 11 }}>
                        {t("createOrder.emergencyExpiryHour")}
                      </label>
                      <input
                        type="number"
                        className="inp"
                        style={{ height: 38, fontSize: 13, width: "100%" }}
                        min={0}
                        max={23}
                        placeholder="0–23"
                        value={entry.emergencyHour ?? "08"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || (Number(val) >= 0 && Number(val) <= 23)) {
                            updateEntry(idx, "emergencyHour", val);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
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
          disabled={!entries.length}
          className="btn btn-gold"
          style={{ flex: 1 }}
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}
