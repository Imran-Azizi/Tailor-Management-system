import { useEffect, useState } from "react";
import { parseNumberLocale } from "../lib/normalize.js";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LuCheck } from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import i18n from "../i18n/index.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import Step1CustomerInfo from "../components/order/Step1CustomerInfo.jsx";
import Step2OrderTypes from "../components/order/Step2OrderTypes.jsx";
import Step3Measurements from "../components/order/Step3Measurements.jsx";
import Step4Billing from "../components/order/Step4Billing.jsx";

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
];

const STEP_I18N = {
  Customer: "createOrder.customerInfo",
  "Order Types": "createOrder.orderTypes",
  Measurements: "createOrder.measurements",
  Billing: "createOrder.billing",
};

export default function CreateOrder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  const mutation = useMutation({ mutationFn: (d) => api.post("/orders", d) });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step]);

  const merge = (d) => setForm((prev) => ({ ...prev, ...d }));
  const next = (d) => {
    merge(d);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
    setError("");
  };

  const checkBoxAvailability = async (orderTypes) => {
    for (const type of orderTypes) {
      try {
        const { data: boxes } = await api.get("/boxes", {
          params: { type },
        });
        if (!boxes?.length) {
          return {
            available: false,
            error: `No box available for ${getOrderTypeLabel(type, i18n.language)}. Please create a box first.`,
            redirectToBox: true,
          };
        }
        const currentCounts = boxes.map((b) => ({
          ...b,
          currentCount: b._count?.orders || 0,
        }));
        const availableBox = currentCounts.find((b) => b.currentCount < b.capacity);
        if (!availableBox) {
          return {
            available: false,
            error: `All boxes are full for ${getOrderTypeLabel(type, i18n.language)}. Please create a new box.`,
            redirectToBox: true,
          };
        }
      } catch (e) {
        return {
          available: false,
          error: `Failed to check box availability for ${getOrderTypeLabel(type, i18n.language)}.`,
          redirectToBox: false,
        };
      }
    }
    return { available: true };
  };

  const submit = async (mergedInput = form) => {
    const merged = mergedInput;
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

    const boxCheck = await checkBoxAvailability(merged.orderTypes || []);
    if (!boxCheck.available) {
      toast.error(boxCheck.error);
      setError(boxCheck.error);
      if (boxCheck.redirectToBox) {
        navigate("/boxes");
      }
      return;
    }

    const billEmergency = resolveBillEmergency(merged.orderTypes || []);
    const orderItems = buildOrderItems(
      merged.orderTypes || [],
      merged.measurements || {},
    );

    const payload = {
      customerInfo: {
        customerId: merged.customerId,
        firstName: merged.firstName,
        phoneNumber: merged.phoneNumber,
      },
      orders: orderItems.map((item) => {
        const b = merged.billing?.[item.billingKey] || {};
        const meas = sanitize(item.measurements);
        const pricePerItem = parseNumberLocale(b.totalPrice) || 0;
        const qtyRaw = parseNumberLocale(b.quantity);
        const qty = Number.isFinite(qtyRaw)
          ? Math.max(1, Math.floor(qtyRaw))
          : 1;
        return {
          type: item.type,
          orderName: resolveOrderName(item.measurements),
          isEmergency: billEmergency.isEmergency,
          emergencyExpiry: billEmergency.emergencyExpiry,
          measurements: meas,
          totalPrice: toWholeAmount(pricePerItem * qty),
          discount: toWholeAmount(parseNumberLocale(b.discount) || 0),
          paidAmount: toWholeAmount(parseNumberLocale(b.paidAmount) || 0),
          quantity: qty,
        };
      }),
    };

    try {
      const res = await mutation.mutateAsync(payload);
      const createdCustomer = res?.data?.customer;
      setForm((prev) => ({ ...prev, result: res.data }));
      toast.success(t("createOrder.orderCreatedSuccess"));
      navigate("/print-bills", {
        state: {
          preselectCustomerId: createdCustomer?.id || null,
          preselectBillNumber: createdCustomer?.billNumber || null,
          fromOrderCreate: true,
        },
      });
    } catch (e) {
      const errorData = e.response?.data;
      const msg = getApiErrorMessage(e, t("createOrder.createFailed"));
      setError(msg);
      toast.error(msg);

      if (errorData?.code === "BOX_NOT_FOUND_FOR_TYPE" || errorData?.code === "BOX_CAPACITY_FULL") {
        navigate("/boxes");
      }

      console.error("Order creation error:", errorData || e);
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
              onNext={(d) => {
                const orderItems = buildOrderItems(
                  form.orderTypes || [],
                  d.measurements || {},
                );
                next({ ...d, orderItems });
              }}
              onBack={back}
              orderTypes={form.orderTypes}
              initial={form.measurements}
            />
          )}
          {step === 3 && (
            <Step4Billing
              onNext={(d) => {
                const merged = { ...form, ...d };
                merge(d);
                submit(merged);
              }}
              onBack={back}
              orderTypes={form.orderTypes}
              orderItems={form.orderItems}
              initial={form.billing}
              loading={mutation.isPending}
            />
          )}
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

function resolveBillEmergency(orderTypes) {
  const entries = Array.isArray(orderTypes) ? orderTypes : [];
  const emergencyEntry = entries.find((entry) => entry?.isEmergency);
  if (!emergencyEntry) {
    return { isEmergency: false, emergencyExpiry: null };
  }

  if (!emergencyEntry.emergencyExpiry) {
    return { isEmergency: true, emergencyExpiry: null };
  }

  const hour = String(Number(emergencyEntry.emergencyHour) || 0).padStart(
    2,
    "0",
  );
  return {
    isEmergency: true,
    emergencyExpiry: `${emergencyEntry.emergencyExpiry}T${hour}:00:00`,
  };
}

function toWholeAmount(value) {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized)) return 0;
  return Math.max(0, Math.round(normalized));
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

function validateMeasurementsBeforeSubmit(orderTypes, measurements) {
  for (let i = 0; i < orderTypes.length; i += 1) {
    const entry = orderTypes[i];
    const sets = normalizeMeasurementSets(measurements?.[i]);
    const required = REQUIRED_MEASUREMENT_FIELDS[entry.type] || [];
    for (let setIndex = 0; setIndex < sets.length; setIndex += 1) {
      const currentSet = sets[setIndex];
      const sanitized = sanitize(currentSet);
      const missing = required.filter((field) => {
        const value = sanitized[field];
        return (
          value === undefined ||
          value === null ||
          (typeof value === "number" && isNaN(value))
        );
      });
      if (missing.length) {
        const label =
          currentSet?.__name?.trim() ||
          buildDefaultItemName(entry.type, setIndex + 1);
        return i18n.t("createOrder.completeMeasurements", {
          type: getOrderTypeLabel(
            entry.type,
            i18n.resolvedLanguage || i18n.language || "en",
          ),
          label,
          defaultValue: `Please complete required measurements for ${label}.`,
        });
      }
    }
  }
  return "";
}

function getOrderTypeDisplayName(type) {
  return getOrderTypeLabel(
    type,
    i18n.resolvedLanguage || i18n.language || "en",
  );
}

function buildDefaultItemName(type, sequence) {
  return `${getOrderTypeDisplayName(type)} ${sequence}`;
}

function normalizeMeasurementSets(measurementValue) {
  if (Array.isArray(measurementValue) && measurementValue.length > 0) {
    return measurementValue.map((setValue) =>
      setValue && typeof setValue === "object" ? setValue : {},
    );
  }
  if (measurementValue && typeof measurementValue === "object") {
    return [measurementValue];
  }
  return [{}];
}

function buildOrderItems(orderTypes, measurements) {
  const items = [];
  const typeCounter = {};

  (orderTypes || []).forEach((entry, typeIndex) => {
    const sets = normalizeMeasurementSets(measurements?.[typeIndex]);
    sets.forEach((setValue, setIndex) => {
      typeCounter[entry.type] = (typeCounter[entry.type] || 0) + 1;
      const sequence = typeCounter[entry.type];
      const displayName =
        setValue?.__name?.trim() || buildDefaultItemName(entry.type, sequence);
      items.push({
        billingKey: `${typeIndex}-${setIndex}`,
        typeIndex,
        setIndex,
        sequence,
        type: entry.type,
        displayName,
        measurements: {
          ...setValue,
          __name: displayName,
        },
        isEmergency: !!entry?.isEmergency,
      });
    });
  });

  return items;
}
