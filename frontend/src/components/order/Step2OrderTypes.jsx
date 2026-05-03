import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuCheck,
  LuX,
  LuTriangleAlert,
  LuShirt,
  LuPocket,
  LuPersonStanding,
  LuScissorsLineDashed,
} from "react-icons/lu";
import { getOrderTypeLabel } from "../../lib/orderType.js";
import styles from "./Step2OrderTypes.module.css";

const TYPES = [
  { id: "OUTFIT", Icon: LuShirt },
  { id: "WASKAT", Icon: LuPocket },
  { id: "KORTY", Icon: LuPersonStanding },
  { id: "YAKHANQAQ", Icon: LuScissorsLineDashed },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return {
    value: String(hour).padStart(2, "0"),
    label: `${hour12}:00 ${period}`,
  };
});

function normalizeEmergencyHour(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 23) {
    return "08";
  }
  return String(Math.floor(numeric)).padStart(2, "0");
}

export default function Step2OrderTypes({ onNext, onBack, initial = [] }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const initialEntries = initial.length ? initial : [];
  const initialEmergencyEntry = initialEntries.find(
    (entry) => entry?.isEmergency,
  );
  const [entries, setEntries] = useState(initialEntries);
  const [billEmergency, setBillEmergency] = useState(
    initialEntries.some((entry) => entry?.isEmergency),
  );
  const [billEmergencyExpiry, setBillEmergencyExpiry] = useState(
    initialEmergencyEntry?.emergencyExpiry || "",
  );
  const [billEmergencyHour, setBillEmergencyHour] = useState(
    normalizeEmergencyHour(initialEmergencyEntry?.emergencyHour),
  );
  const [billEmergencyError, setBillEmergencyError] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [isForeignOrder, setIsForeignOrder] = useState(
    initialEntries.some((entry) => entry?.isForeignOrder),
  );

  const selectedTypes = useMemo(
    () => new Set(entries.map((entry) => entry.type)),
    [entries],
  );

  const toggleType = (id) => {
    if (selectedTypes.has(id)) {
      setEntries((current) => current.filter((entry) => entry.type !== id));
      setBillEmergencyError("");
      setSelectionError("");
      return;
    }
    setEntries((current) => [
      ...current,
      {
        type: id,
        isEmergency: billEmergency,
        emergencyExpiry: billEmergency ? billEmergencyExpiry : "",
        emergencyHour: billEmergency ? billEmergencyHour : "08",
        isForeignOrder,
      },
    ]);
    setBillEmergencyError("");
    setSelectionError("");
  };

  const syncEmergencyToEntries = (checked, expiry, hour) => {
    const normalizedHour = normalizeEmergencyHour(hour);
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        isEmergency: checked,
        emergencyExpiry: checked ? expiry || "" : "",
        emergencyHour: checked ? normalizedHour : "08",
      })),
    );
  };

  const syncForeignFlagToEntries = (checked) => {
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        isForeignOrder: checked,
      })),
    );
  };

  const removeEntry = (idx) => {
    setEntries((current) => current.filter((_, index) => index !== idx));
    setSelectionError("");
    setBillEmergencyError("");
  };

  const removeType = (type) => {
    setEntries((current) => current.filter((entry) => entry.type !== type));
    setSelectionError("");
    setBillEmergencyError("");
  };

  const validateBeforeContinue = () => {
    if (!entries.length) {
      setSelectionError(t("createOrder.selectAtLeastOne"));
      return;
    }

    if (billEmergency) {
      if (!billEmergencyExpiry) {
        setBillEmergencyError(t("createOrder.expiryRequired"));
        return;
      }

      const normalizedHour = normalizeEmergencyHour(billEmergencyHour);
      const expiryDateTime = new Date(
        `${billEmergencyExpiry}T${normalizedHour}:00:00`,
      );

      if (
        Number.isNaN(expiryDateTime.getTime()) ||
        expiryDateTime.getTime() < Date.now()
      ) {
        setBillEmergencyError(t("createOrder.expiryPast"));
        return;
      }
    }

    const normalizedEntries = entries.map((entry) => ({
      ...entry,
      isEmergency: billEmergency,
      emergencyExpiry: billEmergency ? billEmergencyExpiry : "",
      emergencyHour: billEmergency
        ? normalizeEmergencyHour(billEmergencyHour)
        : "08",
      isForeignOrder,
    }));

    setSelectionError("");
    setBillEmergencyError("");
    onNext({ orderTypes: normalizedEntries });
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
        {TYPES.map(({ id, desc, Icon }) => {
          const selected = selectedTypes.has(id);
          const label = getOrderTypeLabel(id, language);
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
                    insetInlineEnd: 10,
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

      {selectionError ? <p className="err-msg">{selectionError}</p> : null}

      {entries.length > 0 && (
        <div className="selected-order-stack" style={{ marginBottom: 18 }}>
          <div className="selected-order-card">
            <div className={styles.controlsGrid}>
              {/* Emergency Order */}
              <div>
                <div
                  className="selected-order-head"
                  style={{ marginBottom: 0 }}
                >
                  <div className={styles.foreignHeadRow}>
                    <span
                      className={`badge bg-red ${styles["hide-on-mobile"]}`}
                      style={{ fontSize: 10 }}
                    >
                      {t("createOrder.priority")}
                    </span>
                    <span
                      className={styles["hide-on-mobile"]}
                      style={{ fontSize: 12, color: "var(--text3)" }}
                    >
                      {t("createOrder.emergencyOrder")}
                    </span>
                  </div>
                </div>

                <label className="order-toggle">
                  <input
                    type="checkbox"
                    checked={billEmergency}
                    onChange={(e) => {
                      const { checked } = e.target;
                      setBillEmergency(checked);
                      setBillEmergencyError("");
                      syncEmergencyToEntries(
                        checked,
                        billEmergencyExpiry,
                        billEmergencyHour,
                      );
                    }}
                  />
                  <span
                    className={`order-toggle-pill${billEmergency ? " on" : ""}`}
                  >
                    <LuTriangleAlert size={12} />
                    {t("createOrder.emergencyOrder")}
                  </span>
                </label>

                {billEmergency && (
                  <div className="order-expiry-wrap">
                    <div className={styles.expiryGrid}>
                      <div>
                        <label className="lbl lbl-r" style={{ fontSize: 11 }}>
                          {t("createOrder.emergencyExpiryDate")}
                        </label>
                        <input
                          type="date"
                          className={`inp${billEmergencyError ? " err" : ""}`}
                          style={{ height: 38, fontSize: 13, width: "100%" }}
                          value={billEmergencyExpiry}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            setBillEmergencyExpiry(nextValue);
                            setBillEmergencyError("");
                            syncEmergencyToEntries(
                              true,
                              nextValue,
                              billEmergencyHour,
                            );
                          }}
                        />
                        {billEmergencyError && (
                          <p className="err-msg">{billEmergencyError}</p>
                        )}
                      </div>

                      <div>
                        <label className="lbl" style={{ fontSize: 11 }}>
                          {t("createOrder.emergencyExpiryHour")}
                        </label>
                        <select
                          className="inp"
                          style={{ height: 38, fontSize: 13, width: "100%" }}
                          value={billEmergencyHour}
                          onChange={(e) => {
                            const nextHour = normalizeEmergencyHour(
                              e.target.value,
                            );
                            setBillEmergencyHour(nextHour);
                            syncEmergencyToEntries(
                              true,
                              billEmergencyExpiry,
                              nextHour,
                            );
                          }}
                        >
                          {HOUR_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Foreign Order */}
              <div>
                <label className={styles.foreignToggle}>
                  <input
                    type="checkbox"
                    checked={isForeignOrder}
                    onChange={(e) => {
                      const { checked } = e.target;
                      setIsForeignOrder(checked);
                      syncForeignFlagToEntries(checked);
                    }}
                  />
                  <span className={styles.foreignToggleText}>
                    {t("createOrder.sendToForeignCountry", {
                      defaultValue: "Send to Foreign Country",
                    })}
                  </span>
                </label>
              </div>
            </div>
          </div>

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

          {entries.length === 1 ? (
            entries.map((entry, idx) => (
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
                    <span
                      className={`badge bg-gold ${styles["hide-on-mobile"]}`}
                      style={{ fontSize: 11 }}
                    >
                      {getOrderTypeLabel(entry.type, language)}
                    </span>
                    <span
                      className={styles["hide-on-mobile"]}
                      style={{ fontSize: 12, color: "var(--text3)" }}
                    >
                      {t("createOrder.configureOrder")}
                    </span>
                    {billEmergency && (
                      <span
                        className={`badge bg-red ${styles["hide-on-mobile"]}`}
                        style={{ fontSize: 10 }}
                      >
                        {t("createOrder.emergencyShort")}
                      </span>
                    )}
                    {isForeignOrder && (
                      <span className={styles.foreignShort}>
                        <svg
                          width="15"
                          height="15"
                          fill="none"
                          viewBox="0 0 24 24"
                          className={styles.foreignShortIcon}
                        >
                          <path
                            fill="#2563eb"
                            d="M21.5 12.5a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-8.25-4.25a.75.75 0 0 0-1.5 0v3.19l-2.72 2.72a.75.75 0 1 0 1.06 1.06l2.94-2.94V8.25Z"
                          />
                        </svg>
                        {t("createOrder.foreignShort", {
                          defaultValue: "ارسال به کشور خارجی",
                        })}
                      </span>
                    )}
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
              </div>
            ))
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 2,
              }}
            >
              {entries.map((entry) => (
                <span
                  key={entry.type}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    border: "1px solid var(--border2)",
                    background: "var(--surface2)",
                    color: "var(--text2)",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 10px",
                  }}
                >
                  {getOrderTypeLabel(entry.type, language)}
                  <button
                    type="button"
                    onClick={() => removeType(entry.type)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text3)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                    aria-label={t("common.remove", { defaultValue: "Remove" })}
                  >
                    <LuX size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
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
          className="btn btn-gold"
          style={{ flex: 1 }}
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}
