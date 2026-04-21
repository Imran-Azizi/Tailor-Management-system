import { getOrderTypeLabel } from "./orderType.js";

const ASSIGNMENT_REGEX =
  /^New order assigned by (.+?): (.+?) - Bill #(\d+) \((.+?)\)(?: - Price: \$([\d,]+(?:\.\d+)?))?(?:\. Note: (.+))?\.?$/i;
const WORK_STARTED_REGEX =
  /^(.+?) started working on order for (.+?) - Bill #(\d+) \((.+?)\)\.?$/i;
const WORK_STARTED_PIPE_REGEX =
  /^Worker Name:\s*(.+?)\s*\|\s*Bill Number:\s*(\d+)\s*\|\s*Order Type:\s*(.+?)\s*\|\s*Customer Name:\s*(.+?)\s*\|\s*has started working on this order\.?$/i;
const WORK_COMPLETED_REGEX =
  /^Order completed successfully - (.+?) - (.+?) - Bill #(\d+) \((.+?)\)\.?$/i;
const WORK_COMPLETED_PIPE_REGEX =
  /^Worker Name:\s*(.+?)\s*\|\s*Bill Number:\s*(\d+)\s*\|\s*Order Type:\s*(.+?)\s*\|\s*Customer Name:\s*(.+?)\s*\|\s*This order has been completed successfully\.?$/i;
const QICHIKAR_READY_PIPE_REGEX =
  /^Qichikar Name:\s*(.+?)\s*\|\s*Bill Number:\s*(\d+)\s*\|\s*Order Type:\s*(.+?)\s*\|\s*Customer Name:\s*(.+?)\s*\|\s*Cutting completed successfully and ready for Dokht\.?$/i;
const ORDER_COMPLETED_BY_REGEX =
  /^Order completed - (.+?) - Bill #(\d+) \((.+?)\) by (.+?)\.?$/i;
const WORK_RECEIVED_REGEX =
  /^(.+?) (?:received|accepted)(?: and self-assigned)?(?: the)? order - (.+?) - Bill #(\d+) \((.+?)\)\.?$/i;
const BOX_CAPACITY_FULL_REGEX =
  /^capacity of this box is full(?: \((.+?)\))? - (.+?) - Bill #(\d+) - (.+?)\.?$/i;
const BOX_NOT_FOUND_REGEX =
  /^No box found for (.+?) orders - (.+?) - Bill #(\d+) - (.+?)\.?$/i;
const ADMIN_PAYMENT_REGEX =
  /^Admin has given you ([\d.]+) on (\d{4}-\d{2}-\d{2})\.?$/i;

const normalizeOrderTypeFromText = (typeText) => {
  const raw = String(typeText || "")
    .toUpperCase()
    .trim();
  if (["OUTFIT", "WASKAT", "KORTY", "YAKHANQAQ"].includes(raw)) return raw;
  return "";
};

const parseKnownUserNotification = (notification) => {
  const msg = String(notification?.message || "");
  let matched = msg.match(ASSIGNMENT_REGEX);
  if (matched) {
    return {
      kind: "ASSIGNMENT",
      actor: matched[1],
      customerName: matched[2],
      billNumber: matched[3],
      orderType: normalizeOrderTypeFromText(matched[4]),
      price: matched[5] || "",
      note: matched[6] || "",
    };
  }

  matched = msg.match(WORK_STARTED_REGEX);
  if (matched) {
    return {
      kind: "WORK_STARTED",
      actor: matched[1],
      customerName: matched[2],
      billNumber: matched[3],
      orderType: normalizeOrderTypeFromText(matched[4]),
    };
  }

  matched = msg.match(WORK_STARTED_PIPE_REGEX);
  if (matched) {
    return {
      kind: "WORK_STARTED",
      actor: matched[1],
      billNumber: matched[2],
      orderType: normalizeOrderTypeFromText(matched[3]),
      customerName: matched[4],
    };
  }

  matched = msg.match(WORK_COMPLETED_REGEX);
  if (matched) {
    return {
      kind: "WORK_COMPLETED",
      actor: matched[1],
      orderType: normalizeOrderTypeFromText(matched[2]),
      billNumber: matched[3],
      customerName: matched[4],
    };
  }

  matched = msg.match(WORK_COMPLETED_PIPE_REGEX);
  if (matched) {
    return {
      kind: "WORK_COMPLETED",
      actor: matched[1],
      billNumber: matched[2],
      orderType: normalizeOrderTypeFromText(matched[3]),
      customerName: matched[4],
    };
  }

  matched = msg.match(QICHIKAR_READY_PIPE_REGEX);
  if (matched) {
    return {
      kind: "QICHIKAR_READY_FOR_DOKHT",
      actor: matched[1],
      billNumber: matched[2],
      orderType: normalizeOrderTypeFromText(matched[3]),
      customerName: matched[4],
    };
  }

  matched = msg.match(ORDER_COMPLETED_BY_REGEX);
  if (matched) {
    return {
      kind: "WORK_COMPLETED",
      orderType: normalizeOrderTypeFromText(matched[1]),
      billNumber: matched[2],
      customerName: matched[3],
      actor: matched[4],
    };
  }

  matched = msg.match(WORK_RECEIVED_REGEX);
  if (matched) {
    return {
      kind: "WORK_RECEIVED",
      actor: matched[1],
      orderType: normalizeOrderTypeFromText(matched[2]),
      billNumber: matched[3],
      customerName: matched[4],
    };
  }

  matched = msg.match(BOX_CAPACITY_FULL_REGEX);
  if (matched) {
    return {
      kind: "BOX_CAPACITY_FULL",
      boxName: matched[1] || "",
      customerName: matched[2],
      billNumber: matched[3],
      orderType: normalizeOrderTypeFromText(matched[4]),
    };
  }

  matched = msg.match(BOX_NOT_FOUND_REGEX);
  if (matched) {
    return {
      kind: "BOX_NOT_FOUND",
      orderType: normalizeOrderTypeFromText(matched[1]),
      customerName: matched[2],
      billNumber: matched[3],
    };
  }

  matched = msg.match(ADMIN_PAYMENT_REGEX);
  if (matched) {
    return {
      kind: "ADMIN_PAYMENT",
      amount: matched[1],
      date: matched[2],
    };
  }

  return null;
};

const formatReadableFallback = (message) => {
  const raw = String(message || "").trim();
  if (!raw) return "";
  if (!raw.includes("|")) return raw;
  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" • ");
};

export function formatUserNotificationMessage(
  notification,
  t,
  language = "en",
) {
  const parsed = parseKnownUserNotification(notification);
  if (!parsed) return formatReadableFallback(notification?.message);

  const orderTypeLabel = parsed.orderType
    ? getOrderTypeLabel(parsed.orderType, language)
    : parsed.orderType;

  if (parsed.kind === "ASSIGNMENT") {
    const notePart = parsed.note
      ? t("notificationMessages.notePart", { note: parsed.note })
      : "";
    return t("notificationMessages.assignment", {
      assignedBy: parsed.actor || "-",
      customer: parsed.customerName || "-",
      billNumber: parsed.billNumber || "-",
      orderType: orderTypeLabel || "-",
      price: parsed.price || "0",
      notePart,
    });
  }

  if (parsed.kind === "WORK_STARTED") {
    return t("notificationMessages.workStarted", {
      user: parsed.actor || "-",
      customer: parsed.customerName || "-",
      billNumber: parsed.billNumber || "-",
      orderType: orderTypeLabel || "-",
    });
  }

  if (parsed.kind === "WORK_COMPLETED") {
    return t("notificationMessages.workCompleted", {
      user: parsed.actor || "-",
      customer: parsed.customerName || "-",
      billNumber: parsed.billNumber || "-",
      orderType: orderTypeLabel || "-",
    });
  }

  if (parsed.kind === "QICHIKAR_READY_FOR_DOKHT") {
    return t("notificationMessages.qichikarReadyForDokht", {
      user: parsed.actor || "-",
      customer: parsed.customerName || "-",
      billNumber: parsed.billNumber || "-",
      orderType: orderTypeLabel || "-",
    });
  }

  if (parsed.kind === "WORK_RECEIVED") {
    return t("notificationMessages.workReceived", {
      user: parsed.actor || "-",
      customer: parsed.customerName || "-",
      billNumber: parsed.billNumber || "-",
      orderType: orderTypeLabel || "-",
    });
  }

  if (parsed.kind === "BOX_CAPACITY_FULL") {
    if (parsed.boxName) {
      return t("notificationMessages.boxCapacityFull", {
        boxName: parsed.boxName,
        customer: parsed.customerName || "-",
        billNumber: parsed.billNumber || "-",
        orderType: orderTypeLabel || "-",
      });
    }
    return t("notificationMessages.boxCapacityFullNoName", {
      customer: parsed.customerName || "-",
      billNumber: parsed.billNumber || "-",
      orderType: orderTypeLabel || "-",
    });
  }

  if (parsed.kind === "BOX_NOT_FOUND") {
    return t("notificationMessages.boxNotFound", {
      customer: parsed.customerName || "-",
      billNumber: parsed.billNumber || "-",
      orderType: orderTypeLabel || "-",
    });
  }

  if (parsed.kind === "ADMIN_PAYMENT") {
    const formattedDate = parsed.date
      ? new Date(parsed.date).toLocaleDateString(
          language === "dari" || language === "pashto" ? "fa" : "en-US",
          { year: "numeric", month: "long", day: "numeric" },
        )
      : parsed.date;
    return t("notificationMessages.adminPayment", {
      amount: parsed.amount,
      date: formattedDate,
    });
  }

  return formatReadableFallback(notification?.message);
}

export function formatSystemNotificationMessage(
  notification,
  t,
  language = "en",
) {
  const order = notification?.order;
  if (!order?.type || !order?.customer?.firstName) {
    return formatReadableFallback(notification?.message);
  }
  return t("notificationMessages.emergencyOrder", {
    orderType: getOrderTypeLabel(order.type, language),
    customer: order.customer.firstName,
    billNumber: order.customer.billNumber ?? "-",
  });
}
