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
  getNotificationSummary,
  groupNotificationsByDay,
} from "../lib/notificationGrouping.js";
import { useMonth } from "../context/MonthContext.jsx";
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
  const { viewMonth, viewYear } = useMonth();
  const qc = useQueryClient();
  const [deleteNotifTarget, setDeleteNotifTarget] = useState(null);

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/notifications", {
          params: { unread: false, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
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
  const groupedNotifs = groupNotificationsByDay(notifs, {
    language,
    t,
    getDate: (item) => item?.createdAt,
  });

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
        <div className="notifications-feed">
          {groupedNotifs.map((group) => (
            <section key={group.dayKey} className="notifications-day-group">
              <header className="notifications-day-heading">
                {group.heading}
              </header>
              <div className="notifications-day-list">
                {group.items.map((n) => {
                  const message = formatSystemNotificationMessage(
                    n,
                    t,
                    language,
                  );
                  const summary = getNotificationSummary(message);
                  const fallbackTitle = n.order?.customer?.firstName
                    ? `${n.order.customer.firstName}${
                        n.order?.customer?.billNumber
                          ? ` #${n.order.customer.billNumber}`
                          : ""
                      }`
                    : t("createOrder.emergencyOrder", "Emergency");

                  return (
                    <article
                      key={n.id}
                      className={`notif-feed-item notif-feed-item--page ${
                        !n.isRead ? "notif-feed-item--unread" : ""
                      }`}
                      onClick={() => {
                        if (!n?.orderId) return;
                        if (!n.isRead) readMut.mutate(n.id);
                        navigate(`/orders/${n.orderId}/edit`);
                      }}
                      style={{ cursor: n?.orderId ? "pointer" : "default" }}
                    >
                      <span
                        className="notif-feed-item__icon"
                        aria-hidden="true"
                      >
                        <LuTriangleAlert
                          size={15}
                          style={{
                            color: n.isRead ? "var(--text3)" : "var(--danger)",
                          }}
                        />
                      </span>
                      <div className="notif-feed-item__copy">
                        <div className="notif-feed-item__topline">
                          {!n.isRead && (
                            <span className="notif-feed-item__dot" />
                          )}
                          <span
                            className="badge bg-red"
                            style={{ fontSize: 10 }}
                          >
                            {t("createOrder.emergencyOrder", "Emergency")}
                          </span>
                          <p className="notif-feed-item__title">
                            {summary.title || fallbackTitle}
                          </p>
                        </div>
                        {summary.message && (
                          <NotificationText
                            language={language}
                            className="notif-feed-item__message"
                          >
                            {summary.message}
                          </NotificationText>
                        )}
                        <div className="notif-feed-item__meta">
                          <span>
                            {t("notificationsPage.created")}:{" "}
                            {formatDateTimeLocale(n.createdAt, language)}
                          </span>
                          <span>
                            {t("notificationsPage.next")}:{" "}
                            {formatDateTimeLocale(n.nextAlert, language)}
                          </span>
                          {n.expiresAt && (
                            <span className="notif-feed-item__meta-danger">
                              {t("notificationsPage.expires")}:{" "}
                              {formatDateLocale(n.expiresAt, language)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="notif-feed-item__actions">
                        {!n.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              readMut.mutate(n.id);
                            }}
                            className="btn btn-outline btn-sm"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <LuCheck size={12} /> {t("notificationsPage.read")}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteNotifTarget(n);
                          }}
                          className="notif-feed-item__delete"
                          title={t("common.delete")}
                        >
                          <LuTrash2 size={12} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
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
