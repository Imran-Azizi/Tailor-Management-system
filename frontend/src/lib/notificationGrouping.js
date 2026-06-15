import { formatDateLocale } from "./locale.js";

const KABUL_TIMEZONE = "Asia/Kabul";

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getDayKey(value, timezone = KABUL_TIMEZONE) {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getNotificationSummary(rawMessage) {
  const lines = String(rawMessage || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { title: "", message: "" };
  }

  const detail = lines.slice(1).join("\n");

  return {
    title: lines[0] || "",
    message: detail || lines[0] || "",
  };
}

export function getDayHeading({
  dayKey,
  createdAt,
  language,
  t,
  now = new Date(),
}) {
  if (!dayKey) return "";

  const todayKey = getDayKey(now);
  const yesterdayKey = getDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  if (dayKey === todayKey) {
    return t("notificationsPage.today", "Today");
  }

  if (dayKey === yesterdayKey) {
    return t("notificationsPage.yesterday", "Yesterday");
  }

  return formatDateLocale(createdAt, language, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function groupNotificationsByDay(items, { language, t, getDate } = {}) {
  const toCreatedAt =
    typeof getDate === "function" ? getDate : (item) => item?.createdAt;
  const sorted = [...(Array.isArray(items) ? items : [])].sort(
    (a, b) =>
      new Date(toCreatedAt(b) || 0).getTime() -
      new Date(toCreatedAt(a) || 0).getTime(),
  );

  const groupedMap = new Map();

  sorted.forEach((item) => {
    const createdAt = toCreatedAt(item);
    const dayKey = getDayKey(createdAt);
    if (!dayKey) return;

    if (!groupedMap.has(dayKey)) {
      groupedMap.set(dayKey, {
        dayKey,
        createdAt,
        heading: getDayHeading({ dayKey, createdAt, language, t }),
        items: [],
      });
    }

    groupedMap.get(dayKey).items.push(item);
  });

  return Array.from(groupedMap.values()).sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );
}
