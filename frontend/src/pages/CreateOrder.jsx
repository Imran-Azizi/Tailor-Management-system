import { useEffect, useState } from "react";
import { parseNumberLocale } from "../lib/normalize.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { LuCheck, LuFileText, LuCalendarDays } from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import i18n from "../i18n/index.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import {
  deleteOrderDraft,
  getOrderDraft,
  upsertOrderDraft,
} from "../lib/orderDraftApi.js";
import { getMonthLabel } from "../lib/months.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import Step1CustomerInfo from "../components/order/Step1CustomerInfo.jsx";
import Step2RakhtSelection from "../components/order/Step2RakhtSelection.jsx";
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

const STEPS = [
  { label: "Customer" },
  { label: "Order Types" },
  { label: "Measurements" },
  { label: "Rakht" },
  { label: "Billing" },
];

const STEP_I18N = {
  Customer: "createOrder.customerInfo",
  Rakht: "createOrder.rakhtSelection",
  "Order Types": "createOrder.orderTypes",
  Measurements: "createOrder.measurements",
  Billing: "createOrder.billing",
};

const STEP_FALLBACKS = {
  Customer: "Customer Information",
  Rakht: "Rakht Selection",
  "Order Types": "Order Types",
  Measurements: "Measurements",
  Billing: "Billing",
};

const MEASUREMENT_STEP_INDEX = 2;
const RAKHT_STEP_INDEX = 3;
const RAKHT_SELECTION_TYPES = new Set([
  "OUTFIT",
  "WASKAT",
  "KORTY",
  "YAKHANQAQ",
]);

export default function CreateOrder() {
  const { t, i18n: i18nInstance } = useTranslation();
  const language =
    i18nInstance.resolvedLanguage || i18nInstance.language || "en";
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const {
    viewMonth,
    viewYear,
    setViewMonth,
    setViewYear,
    monthPolicy,
    isSelectableMonth,
    currentGregorianMonth,
    currentGregorianYear,
  } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(0);

  // Pre-fill from global order search (copy/duplicate)
  const prefillData = location.state?.prefillData || null;

  const buildInitialFormFromPrefill = (pd) => {
    if (!pd) return {};
    // Step3Measurements expects measurements keyed by order type index: { 0: [{ field: value }] }
    const measurementSet = {
      ...(pd.measurements || {}),
      ...(pd.orderName ? { __name: pd.orderName } : {}),
    };
    const measurementsForForm =
      Object.keys(measurementSet).length > 0 ? { 0: [measurementSet] } : {};

    const orderTypes = pd.orderType
      ? [
          {
            type: pd.orderType,
            isForeignOrder: pd.isForeignOrder || false,
            isEmergency: pd.isEmergency || false,
            emergencyExpiry: pd.emergencyExpiry
              ? String(pd.emergencyExpiry).slice(0, 10)
              : "",
            emergencyHour:
              pd.emergencyHour != null
                ? String(Number(pd.emergencyHour)).padStart(2, "0")
                : "08",
            readyMadeClothingId: pd.readyMadeClothingId || null,
            readyMadeClothingCode: pd.readyMadeClothingCode || null,
            readyMadeOriginalPrice: pd.readyMadeOriginalPrice ?? null,
            readyMadeWaskatClothingId: pd.readyMadeWaskatClothingId || null,
            readyMadeWaskatClothingCode: pd.readyMadeWaskatClothingCode || null,
            readyMadeWaskatOriginalPrice:
              pd.readyMadeWaskatOriginalPrice ?? null,
          },
        ]
      : [];

    const orderItems = buildOrderItems(orderTypes, measurementsForForm);
    const primaryBillingKey = orderItems[0]?.billingKey || "0-0";

    const billing = orderTypes.length
      ? {
          [primaryBillingKey]: {
            totalPrice: pd.billing?.totalPrice ?? "",
            discount: pd.billing?.discount ?? "",
            paidAmount:
              pd.orderType === "READY_MADE" ||
              pd.orderType === "READY_MADE_WASKAT"
                ? ""
                : (pd.billing?.paidAmount ?? ""),
          },
        }
      : {};

    const rakhtSelections = pd.rakhtSelection
      ? [
          {
            ...pd.rakhtSelection,
            orderId: pd.orderId,
            type: pd.orderType,
            orderItemKey: primaryBillingKey,
          },
        ]
      : [];

    return {
      customerId: pd.customer?.customerId || "",
      firstName: pd.customer?.firstName || "",
      phoneNumber: pd.customer?.phoneNumber || "",
      orderTypes,
      measurements: measurementsForForm,
      orderItems,
      rakhtSelections,
      billing,
    };
  };

  const [form, setForm] = useState(() =>
    buildInitialFormFromPrefill(prefillData),
  );
  const [error, setError] = useState("");
  const [draftId, setDraftId] = useState("");
  const [draftClientKey, setDraftClientKey] = useState(
    () => `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  );
  const [draftSaveLabel, setDraftSaveLabel] = useState("");
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const draftParam = searchParams.get("draft") || "";

  const mutation = useMutation({ mutationFn: (d) => api.post("/orders", d) });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    let cancelled = false;
    const requestedId = draftParam;

    if (!requestedId) {
      setForm(buildInitialFormFromPrefill(prefillData));
      setStep(0);
      setDraftId("");
      setDraftClientKey(
        `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      );
      setDraftSaveLabel("");
      setIsDraftLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsDraftLoading(true);
    const hydrateDraft = async () => {
      try {
        const draft = await getOrderDraft(requestedId);
        if (cancelled || !draft) return;

        setForm({
          ...(draft.draftData?.customerInfo || {}),
          orderTypes: draft.draftData?.orderTypes || [],
          measurements: draft.draftData?.measurements || {},
        });
        setStep(Math.max(0, Math.min(Number(draft.step || 0), 2)));
        setDraftId(draft.id);
        setDraftClientKey(
          draft.clientKey ||
            `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        );
        setDraftSaveLabel(i18n.t("orders.draftLoaded", "Draft restored"));
      } catch {
        if (!cancelled) {
          setForm({});
          setStep(0);
          setDraftId("");
          setDraftSaveLabel("");
          setSearchParams({}, { replace: true });
          toast.error(i18n.t("orders.draftNotFound", "Draft not found"));
        }
      } finally {
        if (!cancelled) {
          setIsDraftLoading(false);
        }
      }
    };

    hydrateDraft();
    return () => {
      cancelled = true;
    };
  }, [draftParam, prefillData, setSearchParams]);

  const saveDraft = async () => {
    const hasCustomer =
      Boolean(String(form.firstName || "").trim()) ||
      Boolean(String(form.phoneNumber || "").trim()) ||
      Boolean(String(form.customerId || "").trim());
    const hasOrderTypes =
      Array.isArray(form.orderTypes) && form.orderTypes.length > 0;
    const hasMeasurements =
      form.measurements &&
      typeof form.measurements === "object" &&
      Object.keys(form.measurements).length > 0;

    if (!hasCustomer && !hasOrderTypes && !hasMeasurements) {
      toast.error(t("orders.emptyDraftNotAllowed", "Nothing to save as draft"));
      return;
    }

    setDraftSaveLabel(t("orders.savingDraft", "Saving draft..."));
    const payload = {
      id: draftId || undefined,
      clientKey: draftClientKey,
      step: Math.max(0, Math.min(Number(step || 0), 2)),
      customerInfo: {
        customerId: form.customerId || "",
        firstName: form.firstName || "",
        phoneNumber: form.phoneNumber || "",
      },
      orderTypes: form.orderTypes || [],
      measurements: form.measurements || {},
    };

    try {
      const saved = await upsertOrderDraft(payload);
      if (!saved) return;
      setDraftId(saved.id);
      setDraftClientKey(saved.clientKey || draftClientKey);
      setDraftSaveLabel(t("orders.draftSaved", "Draft saved"));
      toast.success(t("orders.draftSaved", "Draft saved"));
      qc.invalidateQueries({ queryKey: ["order-drafts"] });
      qc.invalidateQueries({ queryKey: ["order-drafts-navbar"] });

      if (searchParams.get("draft") !== saved.id) {
        setSearchParams({ draft: saved.id }, { replace: true });
      }
    } catch (e) {
      setDraftSaveLabel("");
      toast.error(
        getApiErrorMessage(
          e,
          t("orders.draftSaveFailed", "Failed to save draft"),
        ),
      );
    }
  };

  const merge = (d) => setForm((prev) => ({ ...prev, ...d }));

  // Professional step logic for READY_MADE_CLOTHES and READY_MADE_WASKAT
  const getVisibleStepIndices = (orderTypes) => {
    const types = Array.isArray(orderTypes)
      ? orderTypes.map((e) => e?.type)
      : [];
    const hasReadyMade = types.includes("READY_MADE");
    const hasReadyMadeWaskat = types.includes("READY_MADE_WASKAT");
    const hasRakhtSelectionType = types.some((type) =>
      RAKHT_SELECTION_TYPES.has(type),
    );
    const withRakhtStep = (steps) =>
      hasRakhtSelectionType && !steps.includes(RAKHT_STEP_INDEX)
        ? [...steps.slice(0, -1), RAKHT_STEP_INDEX, steps[steps.length - 1]]
        : steps;
    // Preserve existing non-Rakht step behavior; add Rakht only for tailored types.
    if (hasReadyMade && hasReadyMadeWaskat) {
      return withRakhtStep([0, 1, 2, 4]); // Customer, Order Types, Measurements, Billing
    }
    if (hasReadyMade) {
      return withRakhtStep([0, 1, 2, 4]); // Customer, Order Types, Measurements, Billing
    }
    if (hasReadyMadeWaskat) {
      return withRakhtStep([0, 1, 4]); // Customer, Order Types, Billing
    }
    // Default: show all steps
    return withRakhtStep([0, 1, 2, 4]);
  };

  const visibleStepIndices = getVisibleStepIndices(form.orderTypes);
  const activeVisibleStepIndex = Math.max(0, visibleStepIndices.indexOf(step));

  // Step skipping helpers for rendering
  const types = Array.isArray(form.orderTypes)
    ? form.orderTypes.map((e) => e?.type)
    : [];
  const hasReadyMade = types.includes("READY_MADE");
  const hasReadyMadeWaskat = types.includes("READY_MADE_WASKAT");
  const hasRakhtSelectionType = types.some((type) =>
    RAKHT_SELECTION_TYPES.has(type),
  );
  const skipMeasurements = hasReadyMadeWaskat && !hasReadyMade;
  const skipRakht = !hasRakhtSelectionType;

  const next = (d) => {
    merge(d);
    const mergedOrderTypes = d?.orderTypes ?? form.orderTypes;
    // If skipping measurements (READY_MADE_WASKAT only), build orderItems
    const types = Array.isArray(mergedOrderTypes)
      ? mergedOrderTypes.map((e) => e?.type)
      : [];
    const hasReadyMade = types.includes("READY_MADE");
    const hasReadyMadeWaskat = types.includes("READY_MADE_WASKAT");
    const skipMeasurements = hasReadyMadeWaskat && !hasReadyMade;
    if (skipMeasurements) {
      const builtOrderItems = buildOrderItems(mergedOrderTypes, {});
      merge({ orderItems: builtOrderItems });
    }
    setStep((s) => {
      const idx = visibleStepIndices.indexOf(s);
      if (idx === -1 || idx === visibleStepIndices.length - 1) return s;
      return visibleStepIndices[idx + 1];
    });
  };

  const back = () => {
    setStep((s) => {
      const idx = visibleStepIndices.indexOf(s);
      if (idx <= 0) return 0;
      return visibleStepIndices[idx - 1];
    });
    setError("");
  };

  const checkBoxAvailability = async (orderTypes) => {
    const entries = Array.isArray(orderTypes) ? orderTypes : [];
    const checkedBoxTypes = new Set();

    for (const entry of entries) {
      const type = entry?.type;
      if (
        !type ||
        entry?.isForeignOrder ||
        type === "READY_MADE_WASKAT"
      ) {
        continue;
      }
      const boxType = type === "READY_MADE" ? "OUTFIT" : type;
      if (checkedBoxTypes.has(boxType)) continue;
      checkedBoxTypes.add(boxType);

      try {
        const { data: boxes } = await api.get("/boxes", {
          params: { type: boxType },
        });
        if (!boxes?.length) {
          return {
            available: false,
            error: `No box available for ${getOrderTypeLabel(boxType, i18n.language)}. Please create a box first.`,
            redirectToBox: true,
          };
        }
        const currentCounts = boxes.map((b) => ({
          ...b,
          currentCount: b._count?.orders || 0,
        }));
        const availableBox = currentCounts.find(
          (b) => b.currentCount < b.capacity,
        );
        if (!availableBox) {
          return {
            available: false,
            error: `All boxes are full for ${getOrderTypeLabel(boxType, i18n.language)}. Please create a new box.`,
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

    const hasForeignOrder = entries.some((entry) => entry?.isForeignOrder);
    if (hasForeignOrder) {
      try {
        const { data: foreignBoxes } = await api.get("/boxes", {
          params: { type: "FOREIGN_COUNTRY" },
        });

        if (!foreignBoxes?.length) {
          return {
            available: false,
            error: t(
              "createOrder.foreignBoxMissing",
              "No Foreign Country box exists. Please create one first.",
            ),
            redirectToBox: true,
          };
        }

        const availableForeign = foreignBoxes.find(
          (box) => (box._count?.orders || 0) < Number(box.capacity || 0),
        );

        if (!availableForeign) {
          return {
            available: false,
            error: t(
              "createOrder.foreignBoxFull",
              "Foreign Country box is full. Please increase capacity or create another one.",
            ),
            redirectToBox: true,
          };
        }
      } catch {
        return {
          available: false,
          error: t(
            "createOrder.foreignBoxCheckFailed",
            "Failed to validate Foreign Country box availability.",
          ),
          redirectToBox: false,
        };
      }
    }

    return { available: true };
  };

  const submit = async (mergedInput = form) => {
    const merged = mergedInput;
    setError("");

    const currentEntryMonth = currentGregorianMonth;
    const currentEntryYear = currentGregorianYear;

    const isCurrentMonthSelected =
      Number(viewMonth) === currentEntryMonth &&
      Number(viewYear) === currentEntryYear;

    if (!isCurrentMonthSelected) {
      setViewYear(currentEntryYear);
      setViewMonth(currentEntryMonth);
      const currentMonthOnlyMessage = t(
        "createOrder.currentMonthOnly",
        "New entries are allowed only in the current month.",
      );
      setError(currentMonthOnlyMessage);
      toast.error(currentMonthOnlyMessage);
      return;
    }

    if (!isSelectableMonth(currentEntryMonth, currentEntryYear)) {
      const monthLockedMessage = t(
        "navbar.futureMonthDisabled",
        "Future months are locked until the current month is fully completed.",
      );
      setError(monthLockedMessage);
      toast.error(monthLockedMessage);
      return;
    }

    const boxCheck = await checkBoxAvailability(merged.orderTypes || []);
    if (!boxCheck.available) {
      toast.error(boxCheck.error);
      setError(boxCheck.error);
      navigate("/boxes");
      return;
    }

    const billEmergency = resolveBillEmergency(merged.orderTypes || []);
    const orderItems = buildOrderItems(
      merged.orderTypes || [],
      merged.measurements || {},
    );

    const payload = {
      createNewBillNumber: Boolean(prefillData?.orderId),
      customerInfo: {
        customerId: prefillData?.orderId ? "" : merged.customerId,
        firstName: merged.firstName,
        phoneNumber: merged.phoneNumber,
      },
      entryMonth: Number(viewMonth),
      entryYear: Number(viewYear),
      rakhtSelections: (merged?.rakhtSelections || []).map((selection) => ({
        type: selection.type,
        orderItemKey: selection.orderItemKey,
        rakhtId: selection.rakhtId,
        rakhtTonId: selection.rakhtTonId,
        requiredMeters: parseNumberLocale(selection.requiredMeters || 0),
        piecePrice: parseNumberLocale(selection.piecePrice || 0),
        priceForCustomer: parseNumberLocale(selection.priceForCustomer || 0),
        totalPriceForCustomer: parseNumberLocale(
          selection.totalPriceForCustomer || 0,
        ),
      })),
      orders: orderItems.map((item) => {
        const b = merged.billing?.[item.billingKey] || {};
        const meas = sanitize(item.measurements);
        const pricePerItem = parseNumberLocale(b.totalPrice) || 0;
        return {
          orderItemKey: item.billingKey,
          type: item.type,
          orderName: resolveOrderName(item.measurements),
          isEmergency: billEmergency.isEmergency,
          emergencyExpiry: billEmergency.emergencyExpiry,
          isForeignOrder: !!item.isForeignOrder,
          measurements: meas,
          totalPrice: toWholeAmount(pricePerItem),
          discount: toWholeAmount(parseNumberLocale(b.discount) || 0),
          paidAmount: toWholeAmount(parseNumberLocale(b.paidAmount) || 0),
          quantity: 1,
          readyMadeClothingId: item.readyMadeClothingId || null,
          readyMadeClothingCode: item.readyMadeClothingCode || null,
          readyMadeOriginalPrice:
            item.readyMadeOriginalPrice != null
              ? Number(item.readyMadeOriginalPrice)
              : null,
          readyMadeWaskatClothingId: item.readyMadeWaskatClothingId || null,
          readyMadeWaskatClothingCode: item.readyMadeWaskatClothingCode || null,
          readyMadeWaskatOriginalPrice:
            item.readyMadeWaskatOriginalPrice != null
              ? Number(item.readyMadeWaskatOriginalPrice)
              : null,
        };
      }),
    };

    try {
      const res = await mutation.mutateAsync(payload);
      const createdCustomer = res?.data?.customer;
      if (draftId) {
        try {
          await deleteOrderDraft(draftId);
          qc.invalidateQueries({ queryKey: ["order-drafts"] });
          qc.invalidateQueries({ queryKey: ["order-drafts-navbar"] });
        } catch {
          // Best effort cleanup.
        }
      }
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

      if (
        errorData?.code === "BOX_NOT_FOUND_FOR_TYPE" ||
        errorData?.code === "BOX_CAPACITY_FULL"
      ) {
        navigate("/boxes");
      }

      if (import.meta.env.DEV) {
        console.error("Order creation error:", errorData || e);
      }
    }
  };

  return (
    <div
      className="page create-order-shell"
      style={{ maxWidth: 920, margin: "0 auto" }}
    >
      {/* Prefill notice banner */}
      {prefillData && (
        <div
          className="info-box ib-blue"
          style={{
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ flex: 1 }}>
            {t(
              "globalSearch.prefillNotice",
              "Order data has been pre-filled from an existing order. Please review and update before saving.",
            )}
          </span>
        </div>
      )}
      {/* Step indicator */}
      <div
        className="step-progress-wrap"
        style={{ display: "flex", alignItems: "center", marginBottom: 32 }}
      >
        {visibleStepIndices.map((stepIndex, i) => {
          const s = STEPS[stepIndex];
          const isDone = i < activeVisibleStepIndex;
          const isActive = i === activeVisibleStepIndex;
          return (
            <div
              key={stepIndex}
              className="step-progress-node"
              style={{
                display: "flex",
                alignItems: "center",
                flex: i < visibleStepIndices.length - 1 ? 1 : "none",
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
                  className={`step-dot ${isDone ? "done" : isActive ? "active" : "pending"}`}
                >
                  {isDone ? <LuCheck size={13} /> : <span>{i + 1}</span>}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    color:
                      i <= activeVisibleStepIndex
                        ? "var(--primary)"
                        : "var(--text3)",
                    whiteSpace: "nowrap",
                  }}
                  className="step-lbl"
                >
                  {t(STEP_I18N[s.label] || s.label, {
                    defaultValue: STEP_FALLBACKS[s.label] || s.label,
                  })}
                </span>
              </div>
              {i < visibleStepIndices.length - 1 && (
                <div
                  className={`step-line ${isDone ? "done" : "pending"}`}
                  style={{ margin: "0 6px", marginBottom: 18 }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="card step-shell-card" style={{ padding: 28 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {draftSaveLabel || ""}
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={saveDraft}
            disabled={isDraftLoading || mutation.isPending}
          >
            <LuFileText size={13} />
            {t("orders.saveDraft", "Save Draft")}
          </button>
        </div>
        {error && (
          <div className="info-box ib-red" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}
        {isDraftLoading ? (
          <div
            style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}
          >
            {t("common.loading", "Loading...")}
          </div>
        ) : null}
        <div key={step} className="step-panel">
          {step === 0 && <Step1CustomerInfo onNext={next} initial={form} />}
          {step === 1 && (
            <Step2OrderTypes
              onNext={next}
              onBack={back}
              initial={form.orderTypes}
            />
          )}
          {step === 2 && !skipMeasurements && (
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
          {step === 3 && !skipRakht && (
            <Step2RakhtSelection
              onNext={next}
              onBack={back}
              initial={form}
              orderTypes={form.orderTypes}
              orderItems={form.orderItems}
            />
          )}
          {step === 4 && (
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
        isForeignOrder: !!entry?.isForeignOrder,
        measurements: {
          ...setValue,
          __name: displayName,
        },
        isEmergency: !!entry?.isEmergency,
        readyMadeClothingId: entry?.readyMadeClothingId || null,
        readyMadeClothingCode: entry?.readyMadeClothingCode || null,
        readyMadeOriginalPrice: entry?.readyMadeOriginalPrice ?? null,
        readyMadeWaskatClothingId: entry?.readyMadeWaskatClothingId || null,
        readyMadeWaskatClothingCode: entry?.readyMadeWaskatClothingCode || null,
        readyMadeWaskatOriginalPrice:
          entry?.readyMadeWaskatOriginalPrice ?? null,
      });
    });
  });

  return items;
}
