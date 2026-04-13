import { useState } from "react";
import { parseNumberLocale, toAsciiDigits } from "../lib/normalize.js";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LuCheck } from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import Step1CustomerInfo from "../components/order/Step1CustomerInfo.jsx";
import Step2OrderTypes from "../components/order/Step2OrderTypes.jsx";
import Step3Measurements from "../components/order/Step3Measurements.jsx";
import Step4Billing from "../components/order/Step4Billing.jsx";
import Step5ReviewOrder from "../components/order/Step5ReviewOrder.jsx";
import Step6PrintCenter from "../components/order/Step5PrintCenter.jsx";

const NUMERIC_MEASUREMENT_FIELDS = new Set([
  "height",
  "shoulder",
  "sleeve",
  "neck",
  "chest",
  "armpit",
  "waist",
  "skirt",
  "tenban",
  "pantLeg",
  "arm",
  "calf",
  "sorain",
  "patlonHeight",
  "kamerPatlon",
  "doroBaghlePatlon",
  "sorainPatlon",
  "patPatlon",
  "pachaPatlon",
]);

const REQUIRED_MEASUREMENT_FIELDS = {
  OUTFIT: [
    "height",
    "shoulder",
    "sleeve",
    "neck",
    "chest",
    "armpit",
    "waist",
    "skirt",
    "tenban",
    "pantLeg",
    "arm",
    "calf",
  ],
  WASKAT: ["height", "shoulder", "neck", "chest", "waist", "sorain"],
  KORTY: [
    "height",
    "arm",
    "shoulder",
    "neck",
    "sleeve",
    "patlonHeight",
    "kamerPatlon",
    "doroBaghlePatlon",
    "waist",
    "sorainPatlon",
    "sorain",
    "patPatlon",
    "pachaPatlon",
  ],
  YAKHANQAQ: [
    "height",
    "sleeve",
    "shoulder",
    "neck",
    "armpit",
    "sorain",
    "chest",
  ],
};

const STEPS = [
  { label: "Customer" },
  { label: "Order Types" },
  { label: "Measurements" },
  { label: "Billing" },
  { label: "Review" },
  { label: "Print Center" },
];

const STEP_I18N = {
  Customer: "createOrder.customerInfo",
  "Order Types": "createOrder.orderTypes",
  Measurements: "createOrder.measurements",
  Billing: "createOrder.billing",
  Review: "createOrder.review",
  "Print Center": "createOrder.printCenter",
};

export default function CreateOrder() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  const mutation = useMutation({ mutationFn: (d) => api.post("/orders", d) });

  const merge = (d) => setForm((prev) => ({ ...prev, ...d }));
  const next = (d) => {
    merge(d);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
    setError("");
  };

  const submit = async () => {
    const merged = form;
    setError("");
    const measurementError = validateMeasurementsBeforeSubmit(
      merged.orderTypes || [],
      merged.measurements || {},
    );
    if (measurementError) {
      setError(measurementError);
      toast.error(measurementError);
      setStep(2);
      return;
    }

    const payload = {
      customerInfo: {
        firstName: merged.firstName,
        phoneNumber: merged.phoneNumber,
      },
      orders: (merged.orderTypes || []).map((entry, i) => {
        const b = merged.billing?.[i] || {};
        const measRaw = merged.measurements?.[i];
        const meas = pickPrimaryMeasurementSet(entry.type, measRaw);
        const pricePerItem = parseNumberLocale(b.totalPrice) || 0;
        const qtyRaw = parseNumberLocale(b.quantity);
        const qty = Number.isFinite(qtyRaw)
          ? Math.max(1, Math.floor(qtyRaw))
          : 1;
        return {
          type: entry.type,
          orderName: resolveOrderName(measRaw),
          isEmergency: !!entry.isEmergency,
          emergencyExpiry:
            entry.isEmergency && entry.emergencyExpiry
              ? `${entry.emergencyExpiry}T${String(Number(entry.emergencyHour) || 0).padStart(2, "0")}:00:00`
              : null,
          measurements: sanitize(meas),
          totalPrice: pricePerItem * qty,
          discount: parseNumberLocale(b.discount) || 0,
          paidAmount: parseNumberLocale(b.paidAmount) || 0,
          quantity: qty,
        };
      }),
    };

    try {
      const res = await mutation.mutateAsync(payload);
      setForm((prev) => ({ ...prev, result: res.data }));
      toast.success(t("createOrder.orderCreatedSuccess"));
      setStep(5); // Print Center
    } catch (e) {
      const msg = getApiErrorMessage(e, t("createOrder.createFailed"));
      setError(msg);
      toast.error(msg);
      console.error("Order creation error:", e.response?.data || e);
    }
  };

  return (
    <div
      className="page create-order-shell"
      style={{ maxWidth: 920, margin: "0 auto" }}
    >
      {/* Step indicator */}
      <div
        className="step-progress-wrap"
        style={{ display: "flex", alignItems: "center", marginBottom: 32 }}
      >
        {STEPS.map((s, i) => (
          <div
            key={i}
            className="step-progress-node"
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < STEPS.length - 1 ? 1 : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                flexShrink: 0,
              }}
            >
              <div
                className={`step-dot ${i < step ? "done" : i === step ? "active" : "pending"}`}
              >
                {i < step ? <LuCheck size={13} /> : <span>{i + 1}</span>}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: i === step ? 600 : 400,
                  color: i <= step ? "var(--primary)" : "var(--text3)",
                  whiteSpace: "nowrap",
                }}
                className="step-lbl"
              >
                {t(STEP_I18N[s.label] || s.label)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`step-line ${i < step ? "done" : "pending"}`}
                style={{ margin: "0 6px", marginBottom: 18 }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="card step-shell-card" style={{ padding: 28 }}>
        {error && (
          <div className="info-box ib-red" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}
        <div key={step} className="step-panel">
          {step === 0 && <Step1CustomerInfo onNext={next} initial={form} />}
          {step === 1 && (
            <Step2OrderTypes
              onNext={next}
              onBack={back}
              initial={form.orderTypes}
            />
          )}
          {step === 2 && (
            <Step3Measurements
              onNext={next}
              onBack={back}
              orderTypes={form.orderTypes}
              initial={form.measurements}
            />
          )}
          {step === 3 && (
            <Step4Billing
              onNext={next}
              onBack={back}
              orderTypes={form.orderTypes}
              initial={form.billing}
              loading={false}
            />
          )}
          {step === 4 && (
            <Step5ReviewOrder
              form={form}
              onBack={back}
              onSubmit={submit}
              loading={mutation.isPending}
            />
          )}
          {step === 5 && <Step6PrintCenter data={form} />}
        </div>
      </div>

      <style>{`@media(max-width:480px){.step-lbl{display:none}}`}</style>
    </div>
  );
}

function resolveOrderName(measurementValue) {
  const sets = Array.isArray(measurementValue)
    ? measurementValue
    : [measurementValue || {}];
  const namedSet = sets.find((set) => set?.__name?.trim());
  return namedSet?.__name?.trim() || undefined;
}

function sanitize(m) {
  if (!m || typeof m !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    if (v === undefined || v === null || v === "" || k === "__name") continue;
    if (typeof v === "boolean") {
      out[k] = v;
      continue;
    }
    if (NUMERIC_MEASUREMENT_FIELDS.has(k)) {
      const n = typeof v === "number" ? v : parseNumberLocale(String(v));
      if (!isNaN(n)) out[k] = n;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function pickPrimaryMeasurementSet(type, measurementValue) {
  const sets = Array.isArray(measurementValue)
    ? measurementValue
    : [measurementValue || {}];
  const requiredFields = REQUIRED_MEASUREMENT_FIELDS[type] || [];
  return (
    sets.find((set) =>
      requiredFields.some((field) => {
        const value = set?.[field];
        if (value === undefined || value === null) return false;
        const n =
          typeof value === "number" ? value : parseNumberLocale(String(value));
        return !isNaN(n);
      }),
    ) ||
    sets[0] ||
    {}
  );
}

function validateMeasurementsBeforeSubmit(orderTypes, measurements) {
  for (let i = 0; i < orderTypes.length; i += 1) {
    const entry = orderTypes[i];
    const primarySet = pickPrimaryMeasurementSet(entry.type, measurements?.[i]);
    const sanitized = sanitize(primarySet);
    const required = REQUIRED_MEASUREMENT_FIELDS[entry.type] || [];
    const missing = required.filter((field) => {
      const value = sanitized[field];
      return (
        value === undefined ||
        value === null ||
        (typeof value === "number" && isNaN(value))
      );
    });
    if (missing.length) {
      const label = entry.name?.trim()
        ? `${entry.type} (${entry.name.trim()})`
        : entry.type;
      return `Please complete required measurements for ${label}: ${missing.join(", ")}`;
    }
  }
  return "";
}
