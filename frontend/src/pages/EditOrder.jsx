import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LuCheck } from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import i18n from "../i18n/index.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import { Spinner } from "../components/ui/index.jsx";
import Step1CustomerInfo from "../components/order/Step1CustomerInfo.jsx";
import Step2OrderTypes from "../components/order/Step2OrderTypes.jsx";
import Step3Measurements from "../components/order/Step3Measurements.jsx";
import Step4Billing from "../components/order/Step4Billing.jsx";
import { getMeasurementsFromOrder } from "../components/order/OrderDocumentPack.jsx";

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

export default function EditOrder() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["order-bill", id],
    queryFn: () => api.get(`/orders/${id}/bill`).then((r) => r.data),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (payload) => api.put(`/orders/${id}/bill`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-detail"] });
      qc.invalidateQueries({ queryKey: ["order-bill", id] });
    },
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    if (!data?.customer || !Array.isArray(data?.orders)) return;
    const customer = data.customer;
    const orders = data.orders;
    const byType = new Map();

    orders.forEach((order) => {
      const list = byType.get(order.type) || [];
      list.push(order);
      byType.set(order.type, list);
    });

    const emergencyOrder = orders.find((o) => o.isEmergency);
    const emergencyDate = emergencyOrder?.emergencyExpiry
      ? new Date(emergencyOrder.emergencyExpiry)
      : null;
    const emergencyExpiry = emergencyDate ? emergencyDate.toISOString().split("T")[0] : "";
    const emergencyHour = emergencyDate
      ? String(emergencyDate.getHours()).padStart(2, "0")
      : "08";

    const orderTypes = Array.from(byType.keys()).map((type) => ({
      type,
      isEmergency: !!emergencyOrder,
      emergencyExpiry,
      emergencyHour,
    }));

    const measurements = {};
    const billing = {};

    orderTypes.forEach((entry, typeIdx) => {
      const ordersForType = byType.get(entry.type) || [];
      measurements[typeIdx] = ordersForType.map((order, setIdx) => {
        const meas = getMeasurementsFromOrder(order) || {};
        const safe = meas && typeof meas === "object" ? meas : {};
        return {
          ...safe,
          __name: order.orderName || `${getOrderTypeLabel(entry.type, i18n.resolvedLanguage || i18n.language)} ${setIdx + 1}`,
          __orderId: order.id,
        };
      });

      ordersForType.forEach((order, setIdx) => {
        const billingKey = `${typeIdx}-${setIdx}`;
        billing[billingKey] = {
          totalPrice: String(order.totalPrice ?? ""),
          discount: String(order.discount ?? ""),
          paidAmount: String(order.paidAmount ?? ""),
          quantity: String(order.quantity ?? 1),
        };
      });
    });

    setForm({
      customerId: customer.id,
      firstName: customer.firstName || "",
      phoneNumber: customer.phoneNumber || "",
      orderTypes,
      measurements,
      billing,
      existingBill: data,
    });
  }, [data]);

  const merge = (d) => setForm((prev) => ({ ...(prev || {}), ...d }));
  const next = (d) => {
    merge(d);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
    setError("");
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

    const billEmergency = resolveBillEmergency(merged.orderTypes || []);
    const orderItems = buildOrderItems(merged.orderTypes || [], merged.measurements || {});

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
        const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;
        return {
          id: item.orderId || undefined,
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
      toast.success(t("orders.updated"));
      navigate("/orders", { state: { search: String(res?.customer?.firstName || "") } });
    } catch (e) {
      const msg = getApiErrorMessage(e, t("orders.updateFailed"));
      setError(msg);
      toast.error(msg);
    }
  };

  if (isLoading || !form) return <Spinner />;

  return (
    <div className="page create-order-shell" style={{ maxWidth: 920, margin: "0 auto" }}>
      <div className="step-progress-wrap" style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
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
              <div className={`step-dot ${i < step ? "done" : i === step ? "active" : "pending"}`}>
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
              <div className={`step-line ${i < step ? "done" : "pending"}`} style={{ margin: "0 6px", marginBottom: 18 }} />
            )}
          </div>
        ))}
      </div>

      <div className="card step-shell-card" style={{ padding: 28 }}>
        {error && (
          <div className="info-box ib-red" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div key={step} className="step-panel">
          {step === 0 && (
            <Step1CustomerInfo
              onNext={next}
              initial={{
                customerId: form.customerId,
                firstName: form.firstName,
                phoneNumber: form.phoneNumber,
              }}
            />
          )}
          {step === 1 && (
            <Step2OrderTypes onNext={next} onBack={back} initial={form.orderTypes} />
          )}
          {step === 2 && (
            <Step3Measurements
              onNext={(d) => {
                const orderItems = buildOrderItems(form.orderTypes || [], d.measurements || {});
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
  const sets = Array.isArray(measurementValue) ? measurementValue : [measurementValue || {}];
  const namedSet = sets.find((set) => set?.__name?.trim());
  return namedSet?.__name?.trim() || undefined;
}

function resolveBillEmergency(orderTypes) {
  const entries = Array.isArray(orderTypes) ? orderTypes : [];
  const emergencyEntry = entries.find((entry) => entry?.isEmergency);
  if (!emergencyEntry) return { isEmergency: false, emergencyExpiry: null };
  if (!emergencyEntry.emergencyExpiry) return { isEmergency: true, emergencyExpiry: null };

  const hour = String(Number(emergencyEntry.emergencyHour) || 0).padStart(2, "0");
  return { isEmergency: true, emergencyExpiry: `${emergencyEntry.emergencyExpiry}T${hour}:00:00` };
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
    if (v === undefined || v === null || v === "" || k === "__name" || k === "__orderId") continue;
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
        return value === undefined || value === null || (typeof value === "number" && isNaN(value));
      });
      if (missing.length) {
        const label = currentSet?.__name?.trim() || `Set ${setIndex + 1}`;
        return i18n.t("createOrder.completeMeasurements", {
          type: getOrderTypeLabel(entry.type, i18n.resolvedLanguage || i18n.language || "en"),
          label,
          defaultValue: `Please complete required measurements for ${label}.`,
        });
      }
    }
  }
  return "";
}

function normalizeMeasurementSets(measurementValue) {
  if (Array.isArray(measurementValue) && measurementValue.length > 0) {
    return measurementValue.map((setValue) => (setValue && typeof setValue === "object" ? setValue : {}));
  }
  if (measurementValue && typeof measurementValue === "object") return [measurementValue];
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
        setValue?.__name?.trim() ||
        `${getOrderTypeLabel(entry.type, i18n.resolvedLanguage || i18n.language || "en")} ${sequence}`;
      items.push({
        billingKey: `${typeIndex}-${setIndex}`,
        typeIndex,
        setIndex,
        sequence,
        type: entry.type,
        displayName,
        measurements: { ...setValue, __name: displayName },
        orderId: setValue?.__orderId || null,
      });
    });
  });

  return items;
}
