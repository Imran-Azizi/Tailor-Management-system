import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { PageHeader, Spinner, Card } from "../components/ui/index.jsx";
import Step1CustomerInfo from "../components/order/Step1CustomerInfo.jsx";
import Step2OrderTypes from "../components/order/Step2OrderTypes.jsx";
import Step3Measurements from "../components/order/Step3Measurements.jsx";
import Step4Billing from "../components/order/Step4Billing.jsx";
import Step5ReviewOrder from "../components/order/Step5ReviewOrder.jsx";
import Step6PrintCenter from "../components/order/Step5PrintCenter.jsx";
import { getMeasurementsFromOrder } from "../components/order/OrderDocumentPack.jsx";
import { parseNumberLocale } from "../lib/normalize.js";

const TABS = [
  { key: "customer", label: "Customer" },
  { key: "types", label: "Order Types" },
  { key: "measurements", label: "Measurements" },
  { key: "billing", label: "Billing" },
  { key: "review", label: "Review" },
  { key: "print", label: "Print Center" },
];

export default function EditOrder() {
  const { id } = useParams();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["order-detail", id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const [form, setForm] = useState(null);
  const initialTab = location?.state?.activeTab || "customer";
  const [activeTab, setActiveTab] = useState(initialTab);
  const completeAfterSave = !!location?.state?.completeAfterSave;

  useEffect(() => {
    if (!data) return;
    const measurements = getMeasurementsFromOrder(data) || {};
    const normalizedMeasurements = {
      0: Array.isArray(measurements) ? measurements : [measurements],
    };
    const orderTypes = [
      {
        type: data.type,
        isEmergency: !!data.isEmergency,
        emergencyExpiry: data.emergencyExpiry
          ? new Date(data.emergencyExpiry).toISOString().split("T")[0]
          : "",
        emergencyHour: data.emergencyExpiry
          ? String(new Date(data.emergencyExpiry).getHours()).padStart(2, "0")
          : "08",
        name: data.orderName || "",
      },
    ];

    const billing = {
      0: {
        totalPrice: String(data.totalPrice ?? ""),
        discount: String(data.discount ?? ""),
        paidAmount: String(data.paidAmount ?? ""),
        quantity: String(data.quantity ?? 1),
      },
    };

    setForm({
      firstName: data.customer?.firstName || "",
      phoneNumber: data.customer?.phoneNumber || "",
      customerId: data.customer?.id,
      orderTypes,
      measurements: normalizedMeasurements,
      billing,
    });
  }, [data]);

  const merge = (d) => setForm((prev) => ({ ...prev, ...d }));

  const customerMut = useMutation({
    mutationFn: ({ id: cid, payload }) => api.put(`/customers/${cid}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("orders.updateFailed"))),
  });

  const orderMut = useMutation({
    mutationFn: ({ id: oid, payload }) => api.put(`/orders/${oid}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-detail", id] });
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("orders.updateFailed"))),
  });

  const saveAll = async () => {
    if (!form || !data) return;

    try {
      // Customer update (if changed)
      if (
        form.customerId &&
        (form.firstName !== data.customer?.firstName ||
          form.phoneNumber !== data.customer?.phoneNumber)
      ) {
        await customerMut.mutateAsync({
          id: form.customerId,
          payload: { firstName: form.firstName, phoneNumber: form.phoneNumber },
        });
      }

      // Order-level update (billing / emergency / quantity)
      const billing0 = form.billing?.[0] || {};
      const orderTypes0 = form.orderTypes?.[0] || {};
      const payload = {};
      if (billing0.totalPrice !== undefined)
        payload.totalPrice =
          parseNumberLocale(String(billing0.totalPrice)) || 0;
      if (billing0.discount !== undefined)
        payload.discount = parseNumberLocale(String(billing0.discount)) || 0;
      if (billing0.paidAmount !== undefined)
        payload.paidAmount =
          parseNumberLocale(String(billing0.paidAmount)) || 0;
      if (billing0.quantity !== undefined)
        payload.quantity = parseInt(String(billing0.quantity), 10) || 1;
      if (orderTypes0.isEmergency !== undefined)
        payload.isEmergency = !!orderTypes0.isEmergency;
      if (orderTypes0.emergencyExpiry !== undefined)
        payload.emergencyExpiry = orderTypes0.emergencyExpiry || null;

      let updatedOrder = null;
      if (Object.keys(payload).length) {
        const resp = await orderMut.mutateAsync({ id, payload });
        updatedOrder = resp?.data || resp;
      }

      // If we were navigated here from the 'Complete' action, attempt completion
      if (completeAfterSave) {
        // fetch latest order state
        const latest =
          updatedOrder || (await api.get(`/orders/${id}`).then((r) => r.data));
        if (latest.remaining > 0) {
          toast.error(t("orders.blockedComplete"));
          return;
        }
        await api.patch(`/orders/${id}/complete`);
        qc.invalidateQueries({ queryKey: ["orders"] });
        qc.invalidateQueries({ queryKey: ["order-detail", id] });
        toast.success(t("orders.completedSuccess"));
        navigate(-1);
        return;
      }

      toast.success(t("orders.updated"));
      navigate(-1);
    } catch (e) {
      // mutation onError handlers show messages
    }
  };

  if (isLoading || !form) return <Spinner />;

  return (
    <div className="page">
      <PageHeader
        title={t("orders.editOrder")}
        subtitle={data ? `#${data.customer?.billNumber}` : ""}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-outline" onClick={() => navigate(-1)}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-gold" onClick={saveAll}>
              {t("orders.saveChanges")}
            </button>
          </div>
        }
      />

      <Card noPad>
        <div
          style={{ display: "flex", gap: 12, padding: 16, flexWrap: "wrap" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`btn btn-outline${activeTab === tab.key ? " active" : ""}`}
              style={{ minWidth: 140 }}
            >
              {t(`createOrder.${tab.label.toLowerCase().replace(/ /g, "")}`, {
                defaultValue: tab.label,
              })}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {activeTab === "customer" && (
            <Step1CustomerInfo
              initial={{
                firstName: form.firstName,
                phoneNumber: form.phoneNumber,
              }}
              onNext={(d) => {
                merge(d);
                setActiveTab("types");
              }}
            />
          )}

          {activeTab === "types" && (
            <Step2OrderTypes
              initial={form.orderTypes}
              onBack={() => setActiveTab("customer")}
              onNext={(d) => {
                merge(d);
                setActiveTab("measurements");
              }}
            />
          )}

          {activeTab === "measurements" && (
            <Step3Measurements
              orderTypes={form.orderTypes}
              initial={form.measurements}
              onBack={() => setActiveTab("types")}
              onNext={(d) => {
                merge(d);
                setActiveTab("billing");
              }}
            />
          )}

          {activeTab === "billing" && (
            <Step4Billing
              orderTypes={form.orderTypes}
              initial={form.billing}
              loading={orderMut.isLoading}
              onBack={() => setActiveTab("measurements")}
              onNext={(d) => {
                merge(d);
                setActiveTab("review");
              }}
            />
          )}

          {activeTab === "review" && (
            <Step5ReviewOrder
              form={form}
              onBack={() => setActiveTab("billing")}
              onSubmit={saveAll}
              loading={orderMut.isLoading || customerMut.isLoading}
            />
          )}

          {activeTab === "print" && <Step6PrintCenter data={form} />}
        </div>
      </Card>
    </div>
  );
}
