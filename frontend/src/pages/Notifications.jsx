import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LuBell,
  LuCheck,
  LuTrash2,
  LuTriangleAlert,
  LuCheckCheck,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatSystemNotificationMessage } from "../lib/notifications.js";
import { formatDateTimeLocale, formatDateLocale } from "../lib/locale.js";
import {
  EMERGENCY_SOUND_MUTED_KEY,
  playEmergencyAlertSound,
  shouldPlayEmergencyAlertCycle,
} from "../lib/emergencyAlert.js";
import {
  PageHeader,
  Spinner,
  EmptyState,
  ConfirmDeleteModal,
  NotificationText,
} from "../components/ui/index.jsx";

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.resolvedLanguage || i18n.language;
  const qc = useQueryClient();
  const [deleteNotifTarget, setDeleteNotifTarget] = useState(null);

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const readMut = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifs-count"] });
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, t("notificationsPage.markReadFailed")),
      ),
  });

  const readAllMut = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifs-count"] });
      toast.success(t("notificationsPage.markedAllRead"));
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, t("notificationsPage.markAllReadFailed")),
      ),
  });

  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("notificationsPage.deleted"));
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, t("notificationsPage.deleteFailed")),
      ),
  });

  const unread = notifs.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!Array.isArray(notifs) || notifs.length === 0) return;

    let muted = false;
    try {
      muted = localStorage.getItem(EMERGENCY_SOUND_MUTED_KEY) === "1";
    } catch {
      muted = false;
    }

    if (muted) return;

    const unreadEmergency = notifs.filter((item) => !item?.isRead);
    if (shouldPlayEmergencyAlertCycle(unreadEmergency)) {
      playEmergencyAlertSound();
    }
  }, [notifs]);

  return (
    <div className="page">
      <PageHeader
        title={t("notificationsPage.title")}
        subtitle={t("notificationsPage.unread", { count: unread })}
        action={
          unread > 0 && (
            <button
              onClick={() => readAllMut.mutate()}
              className="btn btn-outline btn-sm"
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <LuCheckCheck size={13} /> {t("notificationsPage.markAllRead")}
            </button>
          )
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !notifs.length ? (
        <div className="card" style={{ padding: 40 }}>
          <EmptyState message={t("notificationsPage.empty")} Icon={LuBell} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifs.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: "14px 18px",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                borderLeft: !n.isRead
                  ? "3px solid var(--primary)"
                  : "3px solid transparent",
                cursor: n?.orderId ? "pointer" : "default",
              }}
              onClick={() => {
                if (!n?.orderId) return;
                if (!n.isRead) readMut.mutate(n.id);
                navigate(`/orders/${n.orderId}/edit`);
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: n.isRead
                    ? "var(--surface2)"
                    : "var(--primary-100)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <LuTriangleAlert
                  size={16}
                  style={{
                    color: n.isRead ? "var(--text3)" : "var(--primary)",
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 3,
                  }}
                >
                  {!n.isRead && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        background: "var(--primary)",
                        borderRadius: "50%",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span className="badge bg-red" style={{ fontSize: 10 }}>
                    {t("createOrder.emergencyOrder", "Emergency")}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {n.order?.customer?.firstName}
                    {n.order?.customer?.billNumber && (
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 400,
                          color: "var(--primary)",
                          marginLeft: 6,
                        }}
                      >
                        #{n.order.customer.billNumber}
                      </span>
                    )}
                  </span>
                </div>
                <NotificationText
                  language={language}
                  style={{ fontSize: 13, lineHeight: 1.5 }}
                >
                  {formatSystemNotificationMessage(n, t, language)}
                </NotificationText>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginTop: 5,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>
                    {t("notificationsPage.created")}:{" "}
                    {formatDateTimeLocale(n.createdAt, language)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>
                    {t("notificationsPage.next")}:{" "}
                    {formatDateTimeLocale(n.nextAlert, language)}
                  </span>
                  {n.expiresAt && (
                    <span style={{ fontSize: 11, color: "#DC2626" }}>
                      {t("notificationsPage.expires")}:{" "}
                      {formatDateLocale(n.expiresAt, language)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {!n.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      readMut.mutate(n.id);
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <LuCheck size={12} /> {t("notificationsPage.read")}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteNotifTarget(n);
                  }}
                  style={{
                    background: "#FFF1F2",
                    color: "#BE123C",
                    border: "none",
                    borderRadius: 5,
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <LuTrash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteNotifTarget}
        onClose={() => setDeleteNotifTarget(null)}
        onConfirm={() => {
          if (!deleteNotifTarget) return;
          delMut.mutate(deleteNotifTarget.id, {
            onSettled: () => setDeleteNotifTarget(null),
          });
        }}
        title={t("notificationsPage.deleteTitle", {
          defaultValue: t("common.delete"),
        })}
        message={t("notificationsPage.deleteConfirm", {
          defaultValue:
            "Delete this notification permanently? This action cannot be undone.",
        })}
        itemName={deleteNotifTarget?.order?.customer?.firstName || ""}
        isPending={delMut.isPending}
      />
    </div>
  );
}
