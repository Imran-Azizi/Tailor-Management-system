import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuArchive,
  LuSearch,
  LuGlobe,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { toAsciiDigits } from "../lib/normalize.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
  getOrderTypeLabel,
  ORDER_TYPE_VALUES,
} from "../lib/orderType.js";
import {
  PageHeader,
  Spinner,
  EmptyState,
  Modal,
  ConfirmDeleteModal,
  Field,
  Card,
  ProgBar,
} from "../components/ui/index.jsx";
import { formatDateLocale } from "../lib/locale.js";

// Only allow box types that are real boxes (no READY_MADE, READY_MADE_WASKAT)
const BOX_TYPE_VALUES = [
  "OUTFIT",
  "WASKAT",
  "KORTY",
  "YAKHANQAQ",
  "FOREIGN_COUNTRY",
];
const TC = {
  OUTFIT: "#2563EB",
  WASKAT: "#0891B2",
  KORTY: "#7C3AED",
  YAKHANQAQ: "#DC2626",
  FOREIGN_COUNTRY: "#16A34A",
};
const TV = {
  OUTFIT: "gold",
  WASKAT: "teal",
  KORTY: "amber",
  YAKHANQAQ: "red",
  FOREIGN_COUNTRY: "green",
};

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function filterBoxOrders(orders, query) {
  const q = normalizeText(query);
  const qDigits = toAsciiDigits(q).replace(/\D/g, "");
  if (!q) return orders;

  return orders.filter((order) => {
    const billNumber = String(order?.customer?.billNumber ?? "");
    const billDigits = toAsciiDigits(billNumber).replace(/\D/g, "");
    const customerName = normalizeText(order?.customer?.firstName);
    const customerPhone = normalizeText(order?.customer?.phoneNumber);
    const orderName = normalizeText(order?.orderName);
    const orderId = normalizeText(order?.id);

    return (
      billNumber.includes(q) ||
      (qDigits && billDigits.includes(qDigits)) ||
      customerName.includes(q) ||
      customerPhone.includes(q) ||
      orderName.includes(q) ||
      orderId.includes(q)
    );
  });
}

export default function Boxes() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const contextBoxType = searchParams.get("type") || "";
  const linkedDraftId = searchParams.get("draft") || "";
  const shouldOpenCreate = searchParams.get("openCreate") === "1";
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteBoxTarget, setDeleteBoxTarget] = useState(null);
  const [searches, setSearches] = useState({});
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const { data: boxes, isLoading } = useQuery({
    queryKey: ["boxes"],
    queryFn: () => api.get("/boxes").then((r) => r.data),
  });

  const sortedBoxes = useMemo(() => {
    const list = Array.isArray(boxes) ? [...boxes] : [];
    if (!contextBoxType) return list;
    return list.sort((a, b) => {
      const aMatch = a.boxType === contextBoxType ? 0 : 1;
      const bMatch = b.boxType === contextBoxType ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [boxes, contextBoxType]);

  useEffect(() => {
    if (!shouldOpenCreate || !contextBoxType) return;
    setEditing(null);
    reset({
      boxName: "",
      boxType: contextBoxType,
      capacity: "",
    });
    setModal(true);
  }, [shouldOpenCreate, contextBoxType, reset]);

  const saveMut = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.put(`/boxes/${editing.id}`, {
            ...payload,
            capacity: Number(payload.capacity),
          })
        : api.post("/boxes", {
            ...payload,
            capacity: Number(payload.capacity),
          }),
    onSuccess: () => {
      const wasCreate = !editing;
      qc.invalidateQueries({ queryKey: ["boxes"] });
      setModal(false);
      reset();
      setEditing(null);
      toast.success(wasCreate ? t("boxesPage.created") : t("boxesPage.updated"));
      if (wasCreate && linkedDraftId) {
        toast.success(
          t(
            "boxesPage.boxCreatedResumeDraft",
            "Box created successfully. You can now resume your saved order.",
          ),
          { duration: 5000 },
        );
      }
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("boxesPage.saveFailed"))),
  });

  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/boxes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boxes"] });
      toast.success(t("boxesPage.deleted"));
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("boxesPage.deleteFailed"))),
  });

  const setBoxSearch = (boxId, value) => {
    setSearches((prev) => ({ ...prev, [boxId]: value }));
  };

  return (
    <div className="page">
      <PageHeader
        title={t("boxesPage.title")}
        subtitle={t("boxesPage.subtitle", { count: boxes?.length || 0 })}
        action={
          <button
            className="btn btn-gold"
            onClick={() => {
              setEditing(null);
              reset({});
              setModal(true);
            }}
          >
            <LuPlus size={15} /> {t("boxesPage.newBox")}
          </button>
        }
      />

      {linkedDraftId ? (
        <div
          className="info-box ib-gold"
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>
              {t(
                "boxesPage.waitingForBoxDraftTitle",
                "Order waiting for box design",
              )}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text2)" }}>
              {contextBoxType
                ? t("boxesPage.waitingForBoxDraftBody", {
                    type:
                      contextBoxType === "FOREIGN_COUNTRY"
                        ? t("createOrder.sendToForeignCountry", {
                            defaultValue: "Foreign Country",
                          })
                        : getOrderTypeLabel(
                            contextBoxType,
                            i18n.resolvedLanguage || i18n.language,
                          ),
                    defaultValue:
                      "Create a box for {{type}} below, then resume the saved draft order.",
                  })
                : t(
                    "boxesPage.waitingForBoxDraftBodyGeneric",
                    "Create the required box below, then resume your saved draft order.",
                  )}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() =>
              navigate(`/orders/create?draft=${encodeURIComponent(linkedDraftId)}`)
            }
          >
            {t("orders.resume", "Resume order")}
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <Spinner />
      ) : !sortedBoxes.length ? (
        <Card>
          <EmptyState message={t("boxesPage.noBoxesYet")} Icon={LuArchive} />
          {shouldOpenCreate && contextBoxType ? (
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => {
                  setEditing(null);
                  reset({
                    boxName: "",
                    boxType: contextBoxType,
                    capacity: "",
                  });
                  setModal(true);
                }}
              >
                <LuPlus size={15} /> {t("boxesPage.newBox")}
              </button>
            </div>
          ) : null}
        </Card>
      ) : (
        <div className="g-boxes">
          {sortedBoxes.map((box) => {
            const used = box._count?.orders || box.orders?.length || 0;
            const accent = TC[box.boxType] || "#2563EB";
            const query = searches[box.id] || "";
            const ordersInBox = box.orders || [];
            const filteredOrders = filterBoxOrders(ordersInBox, query);
            const isContextMatch =
              contextBoxType && box.boxType === contextBoxType;

            return (
              <div
                key={box.id}
                className="card"
                style={{
                  overflow: "hidden",
                  cursor: "default",
                  transition: "box-shadow .2s,transform .2s",
                  boxShadow: isContextMatch ? "0 0 0 2px rgba(217,119,6,.35)" : undefined,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--sh-md)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.transform = "";
                }}
              >
                <div style={{ height: 3, background: accent }} />
                <div style={{ padding: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 9,
                          background: `${accent}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <LuArchive size={18} style={{ color: accent }} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15 }}>
                          {box.boxName}
                        </p>
                        <span
                          className={`badge bg-${TV[box.boxType] || "gold"}`}
                          style={{ fontSize: 11 }}
                        >
                          {box.boxType === "FOREIGN_COUNTRY"
                            ? t("createOrder.sendToForeignCountry", {
                                defaultValue: "Foreign Country",
                              })
                            : getOrderTypeLabel(
                                box.boxType,
                                i18n.resolvedLanguage || i18n.language,
                              )}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button
                        onClick={() => {
                          setEditing(box);
                          reset({
                            boxName: box.boxName,
                            boxType: box.boxType,
                            capacity: box.capacity,
                          });
                          setModal(true);
                        }}
                        className="btn btn-icon"
                        style={{ width: 30, height: 30 }}
                        title={t("customersPage.edit")}
                      >
                        <LuPencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteBoxTarget({
                            id: box.id,
                            name: box.boxName,
                            type: box.boxType,
                          });
                        }}
                        style={{
                          background: "#FFF1F2",
                          color: "#BE123C",
                          border: "none",
                          borderRadius: 5,
                          width: 30,
                          height: 30,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <LuTrash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div style={{ position: "relative", marginBottom: 10 }}>
                    <LuSearch
                      size={13}
                      style={{
                        position: "absolute",
                        insetInlineStart: 11,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text3)",
                      }}
                    />
                    <input
                      className="inp"
                      style={{ height: 36, paddingInlineStart: 32 }}
                      placeholder={t("boxesPage.searchInBox")}
                      value={query}
                      onChange={(e) => setBoxSearch(box.id, e.target.value)}
                    />
                  </div>

                  <ProgBar value={used} max={box.capacity} />

                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text3)",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      marginTop: 12,
                      marginBottom: 8,
                    }}
                  >
                    {t("boxesPage.inThisBox", { count: used })}
                  </p>

                  {!filteredOrders.length ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text3)",
                        fontStyle: "italic",
                      }}
                    >
                      {ordersInBox.length
                        ? t("boxesPage.noBoxOrderMatch")
                        : t("boxesPage.noBoxOrders")}
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        maxHeight: 230,
                        overflowY: "auto",
                      }}
                    >
                      {filteredOrders.map((order) => {
                        const orderLabel = getOrderLabelParts(
                          order,
                          i18n.resolvedLanguage || i18n.language,
                        );
                        return (
                          <div
                            key={order.id}
                            style={{
                              padding: "8px 12px",
                              background: "var(--surface2)",
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                marginBottom: 3,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "var(--primary)",
                                    marginInlineEnd: 6,
                                  }}
                                >
                                  #{order.customer?.billNumber}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>
                                  {getOrderPrimaryDisplayName(
                                    order,
                                    order.customer?.firstName,
                                    i18n.resolvedLanguage || i18n.language,
                                  )}
                                </span>
                              </div>
                              <span
                                className={`badge bg-${TV[order.type] || "gold"}`}
                                style={{ fontSize: 10 }}
                              >
                                {orderLabel.typeWithSequenceLabel}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text3)",
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span>{orderLabel.typeWithSequenceLabel}</span>
                              <span>
                                {formatDateLocale(
                                  order.createdAt,
                                  i18n.resolvedLanguage || i18n.language,
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {used >= box.capacity && (
                    <div className="info-box ib-gold" style={{ marginTop: 10 }}>
                      {t("boxesPage.fullCapacity")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
          setEditing(null);
        }}
        title={editing ? t("boxesPage.modalEdit") : t("boxesPage.modalNew")}
      >
        <form
          onSubmit={handleSubmit((formData) => saveMut.mutate(formData))}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <Field
            label={t("boxesPage.boxName")}
            error={errors.boxName?.message}
            required
          >
            <input
              {...register("boxName", { required: t("boxesPage.required") })}
              className="inp"
              placeholder="e.g. Box A1"
            />
          </Field>
          <Field
            label={t("boxesPage.boxType")}
            error={errors.boxType?.message}
            required
          >
            <select
              {...register("boxType", { required: t("boxesPage.required") })}
              className="inp"
            >
              <option value="">{t("boxesPage.selectType")}</option>
              {/* Remove duplicate and invalid box types */}
              {BOX_TYPE_VALUES.filter(
                (type, idx, arr) =>
                  type !== "READY_MADE" &&
                  type !== "READY_MADE_WASKAT" &&
                  arr.indexOf(type) === idx,
              ).map((type) => (
                <option key={type} value={type}>
                  {type === "FOREIGN_COUNTRY"
                    ? t("createOrder.sendToForeignCountry", {
                        defaultValue: "Foreign Country",
                      })
                    : getOrderTypeLabel(
                        type,
                        i18n.resolvedLanguage || i18n.language,
                      )}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("boxesPage.capacity")} required>
            <input
              type="text"
              inputMode="numeric"
              {...register("capacity", { required: t("boxesPage.required") })}
              className="inp"
              placeholder="50"
            />
          </Field>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              {t("boxesPage.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-gold"
              style={{ flex: 1 }}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? t("boxesPage.saving") : t("boxesPage.save")}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={!!deleteBoxTarget}
        onClose={() => setDeleteBoxTarget(null)}
        onConfirm={() => {
          if (!deleteBoxTarget) return;
          delMut.mutate(deleteBoxTarget.id, {
            onSettled: () => setDeleteBoxTarget(null),
          });
        }}
        title={t("boxesPage.deleteTitle", { defaultValue: t("common.delete") })}
        message={t("boxesPage.deleteConfirmDetail", {
          name: deleteBoxTarget?.name || "-",
          type: deleteBoxTarget
            ? getOrderTypeLabel(
                deleteBoxTarget.type,
                i18n.resolvedLanguage || i18n.language,
              )
            : "-",
          defaultValue:
            "Delete this box permanently? This action cannot be undone.",
        })}
        itemName={deleteBoxTarget?.name || ""}
        isPending={delMut.isPending}
      />
    </div>
  );
}
