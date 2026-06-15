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
import {
  formatSystemNotificationMessage,
  formatUserNotificationMessage,
} from "../lib/notifications.js";
import {
  formatDateTimeLocale,
  formatRelativeTimeLocale,
} from "../lib/locale.js";
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

  const { data: systemNotifs = [], isLoading: systemLoading } = useQuery({
    queryKey: ["notifications", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/notifications", {
          params: { unread: false, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: userNotifs = [], isLoading: userLoading } = useQuery({
    queryKey: ["admin-worker-notifications", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/users/me/notifications", {
          params: { unread: false, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
    refetchInterval: 30_000,
  });

  const readSystemMut = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifs-count"] });
      qc.invalidateQueries({ queryKey: ["notifs-nav"] });
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, t("notificationsPage.markReadFailed")),
      ),
  });

  const readUserMut = useMutation({
    mutationFn: (id) => api.patch(`/users/me/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-worker-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-worker-notifs-count"] });
      qc.invalidateQueries({ queryKey: ["admin-worker-notifs-nav"] });
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, t("notificationsPage.markReadFailed")),
      ),
  });

  const readAllMut = useMutation({
    mutationFn: () =>
      Promise.all([
        api.patch("/notifications/read-all"),
        api.patch("/users/me/notifications/read-all"),
      ]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifs-count"] });
      qc.invalidateQueries({ queryKey: ["notifs-nav"] });
      qc.invalidateQueries({ queryKey: ["admin-worker-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-worker-notifs-count"] });
      qc.invalidateQueries({ queryKey: ["admin-worker-notifs-nav"] });
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
      qc.invalidateQueries({ queryKey: ["notifs-count"] });
      qc.invalidateQueries({ queryKey: ["notifs-nav"] });
      toast.success(t("notificationsPage.deleted"));
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, t("notificationsPage.deleteFailed")),
      ),
  });

  const systemItems = Array.isArray(systemNotifs) ? systemNotifs : [];
  const userItems = Array.isArray(userNotifs) ? userNotifs : [];
  const mergedNotifs = [
    ...systemItems.map((entry) => ({ kind: "emergency", entry })),
    ...userItems.map((entry) => ({ kind: "worker", entry })),
  ].sort(
    (a, b) =>
      new Date(b.entry?.createdAt || 0).getTime() -
      new Date(a.entry?.createdAt || 0).getTime(),
  );
  const unread = mergedNotifs.filter((item) => !item.entry?.isRead).length;
  const groupedNotifs = groupNotificationsByDay(mergedNotifs, {
    language,
    t,
    getDate: (item) => item?.entry?.createdAt,
  });
  const isLoading = systemLoading || userLoading;

  useEffect(() => {
    if (!Array.isArray(systemItems) || systemItems.length === 0) return;

    let muted = false;
    try {
      muted = localStorage.getItem(EMERGENCY_SOUND_MUTED_KEY) === "1";
    } catch {
      muted = false;
    }

    if (muted) return;

    const unreadEmergency = systemItems.filter((item) => !item?.isRead);
    if (shouldPlayEmergencyAlertCycle(unreadEmergency)) {
      playEmergencyAlertSound();
    }
  }, [systemItems]);

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
      ) : !mergedNotifs.length ? (
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
                {group.items.map(({ kind, entry: n }) => {
                  const isEmergency = kind === "emergency";
                  const message = isEmergency
                    ? formatSystemNotificationMessage(n, t, language)
                    : formatUserNotificationMessage(n, t, language);
                  const summary = getNotificationSummary(message);
                  const fallbackTitle = n.order?.customer?.firstName
                    ? `${n.order.customer.firstName}${
                        n.order?.customer?.billNumber
                          ? ` #${n.order.customer.billNumber}`
                          : ""
                      }`
                    : isEmergency
                      ? t("createOrder.emergencyOrder", "Emergency")
                      : t("navbar.workUpdates", "Work Updates");
                  const isActionableWorker =
                    !isEmergency &&
                    n.orderId &&
                    (n.type === "WORK_COMPLETED" ||
                      n.type === "QICHIKAR_READY_FOR_DOKHT");

                  return (
                    <article
                      key={`${kind}-${n.id}`}
                      className={`notif-feed-item notif-feed-item--page ${
                        !n.isRead ? "notif-feed-item--unread" : ""
                      }`}
                      onClick={() => {
                        if (!n?.orderId) return;
                        if (isEmergency) {
                          if (!n.isRead) readSystemMut.mutate(n.id);
                          navigate(`/orders/${n.orderId}/edit`);
                          return;
                        }
                        if (isActionableWorker) {
                          if (!n.isRead) readUserMut.mutate(n.id);
                          navigate(
                            `/orders/completed-workers?orderId=${encodeURIComponent(n.orderId)}`,
                          );
                        }
                      }}
                      style={{
                        cursor:
                          isEmergency || isActionableWorker
                            ? "pointer"
                            : "default",
                      }}
                    >
                      <span
                        className="notif-feed-item__icon"
                        aria-hidden="true"
                      >
                        {isEmergency ? (
                          <LuTriangleAlert
                            size={15}
                            style={{
                              color: n.isRead
                                ? "var(--text3)"
                                : "var(--danger)",
                            }}
                          />
                        ) : (
                          <LuBell
                            size={15}
                            style={{
                              color: n.isRead
                                ? "var(--text3)"
                                : "var(--primary)",
                            }}
                          />
                        )}
                      </span>
                      <div className="notif-feed-item__copy">
                        <div className="notif-feed-item__topline">
                          {!n.isRead && (
                            <span className="notif-feed-item__dot" />
                          )}
                          <span
                            className={`badge ${isEmergency ? "bg-red" : "bg-teal"}`}
                            style={{ fontSize: 10 }}
                          >
                            {isEmergency
                              ? t("createOrder.emergencyOrder", "Emergency")
                              : t("navbar.workUpdates", "Work Updates")}
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
                          <span title={formatDateTimeLocale(n.createdAt, language)}>
                            {t("notificationsPage.created")}:{" "}
                            {formatRelativeTimeLocale(n.createdAt, language)}
                          </span>
                        </div>
                      </div>
                      <div className="notif-feed-item__actions">
                        {!n.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isEmergency) {
                                readSystemMut.mutate(n.id);
                              } else {
                                readUserMut.mutate(n.id);
                              }
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
                        {isEmergency && (
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
                        )}
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
