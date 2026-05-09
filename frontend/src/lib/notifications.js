import { getOrderTypeLabel } from "./orderType.js";
import { formatSystemDate } from "./locale.js";

const LTR_ISOLATE_OPEN = "\u2066";
const LTR_ISOLATE_CLOSE = "\u2069";

const ASSIGNMENT_REGEX =
  /^New order assigned by (.+?): (.+?) - Bill #(\d+) \((.+?)\)(?: - Price: (?:AF\s*)?([\d,]+(?:\.\d+)?)(?:\s*AF)?)?(?:\. Note: (.+))?\.?$/i;
const WORK_STARTED_REGEX =
  /^(.+?) started working on order for (.+?) - Bill #(\d+) \((.+?)\)\.?$/i;
const WORK_STARTED_PIPE_REGEX =
  /^Worker Name:\s*(.+?)\s*\|\s*Bill Number:\s*(\d+)\s*\|\s*Order Type:\s*(.+?)\s*\|\s*Customer Name:\s*(.+?)\s*\|\s*has started working on this order\.?$/i;
const WORK_COMPLETED_REGEX =
  /^Order completed successfully - (.+?) - (.+?) - Bill #(\d+) \((.+?)\)\.?$/i;
const WORK_COMPLETED_PIPE_REGEX =
  /^Worker Name:\s*(.+?)\s*\|\s*Bill Number:\s*(\d+)\s*\|\s*Order Type:\s*(.+?)\s*\|\s*Customer Name:\s*(.+?)\s*\|\s*This order has been completed successfully\.?$/i;
const DOKHT_COMPLETED_PIPE_REGEX =
  /^Dokht Name:\s*(.+?)\s*\|\s*Bill Number:\s*(\d+)\s*\|\s*Order Type:\s*(.+?)\s*\|\s*Customer Name:\s*(.+?)\s*\|\s*Stitching completed successfully and waiting for full payment \/ admin completion\.?$/i;
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
  /^Admin has given you ([\d.]+)(?:\s*AF)? on (\d{4}-\d{2}-\d{2})\.?$/i;

const normalizeOrderTypeFromText = (typeText) => {
  const raw = String(typeText || "")
    .toUpperCase()
    .trim();
  if (["OUTFIT", "WASKAT", "KORTY", "YAKHANQAQ"].includes(raw)) return raw;
  return "";
};

const isolateLtr = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "-";
  return `${LTR_ISOLATE_OPEN}${normalized}${LTR_ISOLATE_CLOSE}`;
};

const buildNotificationBody = (title, lines = []) =>
  [title, ...lines.filter(Boolean)].join("\n");

const buildLine = (label, value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  return `${label}: ${normalized}`;
};

const getLocalizedCurrencyUnit = (t) =>
  t("notificationMessages.currencyUnit", "AF");

const normalizeCurrencySymbols = (value, t) => {
  const currencyUnit = getLocalizedCurrencyUnit(t);
  return String(value || "")
    .replace(/\bUS\$/gi, currencyUnit)
    .replace(/\bUSD\b/gi, currencyUnit)
    .replace(/\$\s*(?=\d)/g, `${currencyUnit} `)
    .replace(/\$/g, currencyUnit);
};

const localizeFallbackPart = (part, t) => {
  const raw = String(part || "").trim();
  if (!raw) return "";

  const fieldLabels = {
    "worker name": t("notificationMessages.workerLabel", "Worker"),
    "qichikar name": t("notificationMessages.workerLabel", "Worker"),
    "dokht name": t("notificationMessages.workerLabel", "Worker"),
    "customer name": t("notificationMessages.customerLabel", "Customer"),
    "bill number": t("notificationMessages.billNumberLabel", "Bill Number"),
    "order type": t("notificationMessages.orderTypeLabel", "Order Type"),
    price: t("notificationMessages.priceLabel", "Price"),
    note: t("notificationMessages.noteLabel", "Note"),
    amount: t("notificationMessages.amountLabel", "Amount"),
    date: t("notificationMessages.dateLabel", "Date"),
    box: t("notificationMessages.boxLabel", "Box"),
  };

  const colonIndex = raw.indexOf(":");
  if (colonIndex === -1) {
    return normalizeCurrencySymbols(
      raw.replace(/\bAF\b/g, getLocalizedCurrencyUnit(t)),
      t,
    );
  }

  const label = raw.slice(0, colonIndex).trim();
  const value = raw.slice(colonIndex + 1).trim();
  const localizedLabel = fieldLabels[label.toLowerCase()] || label;
  const localizedValue = normalizeCurrencySymbols(
    value.replace(/\bAF\b/g, getLocalizedCurrencyUnit(t)),
    t,
  );

  return buildLine(localizedLabel, localizedValue);
};

const parseKnownUserNotification = (notification) => {
  const msg = String(notification?.message || "")
    .replace(/\bUS\$/gi, "AF")
    .replace(/\bUSD\b/gi, "AF")
    .replace(/\$\s*(?=\d)/g, "AF ")
    .replace(/\$/g, "AF");
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

  matched = msg.match(DOKHT_COMPLETED_PIPE_REGEX);
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

const formatReadableFallback = (message, t) => {
  const raw = String(message || "").trim();
  if (!raw) return "";
  if (!raw.includes("|")) {
    return t ? localizeFallbackPart(raw, t) : raw;
  }
  return raw
    .split("|")
    .map((part) => (t ? localizeFallbackPart(part, t) : part.trim()))
    .filter(Boolean)
    .join("\n");
};

export function formatUserNotificationMessage(
  notification,
  t,
  language = "en",
) {
  const parsed = parseKnownUserNotification(notification);
  if (!parsed) return formatReadableFallback(notification?.message, t);

  const orderTypeLabel = parsed.orderType
    ? getOrderTypeLabel(parsed.orderType, language)
    : parsed.orderType;
  const currencyUnit = getLocalizedCurrencyUnit(t);
  const labels = {
    assignedBy: t("notificationMessages.assignedByLabel", "Assigned by"),
    worker: t("notificationMessages.workerLabel", "Worker"),
    customer: t("notificationMessages.customerLabel", "Customer"),
    billNumber: t("notificationMessages.billNumberLabel", "Bill Number"),
    orderType: t("notificationMessages.orderTypeLabel", "Order Type"),
    price: t("notificationMessages.priceLabel", "Price"),
    note: t("notificationMessages.noteLabel", "Note"),
    box: t("notificationMessages.boxLabel", "Box"),
    amount: t("notificationMessages.amountLabel", "Amount"),
    date: t("notificationMessages.dateLabel", "Date"),
    nextStep: t("notificationMessages.nextStepLabel", "Next step"),
  };

  if (parsed.kind === "ASSIGNMENT") {
    return buildNotificationBody(
      t("notificationMessages.assignmentTitle", "New order assigned"),
      [
        buildLine(labels.assignedBy, parsed.actor || "-"),
        buildLine(labels.customer, parsed.customerName || "-"),
        buildLine(
          labels.billNumber,
          isolateLtr(`#${parsed.billNumber || "-"}`),
        ),
        buildLine(labels.orderType, orderTypeLabel || "-"),
        buildLine(
          labels.price,
          `${isolateLtr(parsed.price || "0")} ${currencyUnit}`,
        ),
        parsed.note ? buildLine(labels.note, parsed.note) : "",
      ],
    );
  }

  if (parsed.kind === "WORK_STARTED") {
    return buildNotificationBody(
      t("notificationMessages.workStartedTitle", "Work started"),
      [
        buildLine(labels.worker, parsed.actor || "-"),
        buildLine(labels.customer, parsed.customerName || "-"),
        buildLine(
          labels.billNumber,
          isolateLtr(`#${parsed.billNumber || "-"}`),
        ),
        buildLine(labels.orderType, orderTypeLabel || "-"),
      ],
    );
  }

  if (parsed.kind === "WORK_COMPLETED") {
    return buildNotificationBody(
      t(
        "notificationMessages.workCompletedTitle",
        "Work completed successfully",
      ),
      [
        buildLine(labels.worker, parsed.actor || "-"),
        buildLine(labels.customer, parsed.customerName || "-"),
        buildLine(
          labels.billNumber,
          isolateLtr(`#${parsed.billNumber || "-"}`),
        ),
        buildLine(labels.orderType, orderTypeLabel || "-"),
      ],
    );
  }

  if (parsed.kind === "QICHIKAR_READY_FOR_DOKHT") {
    return buildNotificationBody(
      t("notificationMessages.qichikarReadyForDokhtTitle", "Ready for Dokht"),
      [
        buildLine(labels.worker, parsed.actor || "-"),
        buildLine(labels.customer, parsed.customerName || "-"),
        buildLine(
          labels.billNumber,
          isolateLtr(`#${parsed.billNumber || "-"}`),
        ),
        buildLine(labels.orderType, orderTypeLabel || "-"),
        buildLine(
          labels.nextStep,
          t("notificationMessages.readyForDokhtValue", "Hand over to Dokht"),
        ),
      ],
    );
  }

  if (parsed.kind === "WORK_RECEIVED") {
    return buildNotificationBody(
      t("notificationMessages.workReceivedTitle", "Order received"),
      [
        buildLine(labels.worker, parsed.actor || "-"),
        buildLine(labels.customer, parsed.customerName || "-"),
        buildLine(
          labels.billNumber,
          isolateLtr(`#${parsed.billNumber || "-"}`),
        ),
        buildLine(labels.orderType, orderTypeLabel || "-"),
      ],
    );
  }

  if (parsed.kind === "BOX_CAPACITY_FULL") {
    return buildNotificationBody(
      t("notificationMessages.boxCapacityFullTitle", "Box capacity full"),
      [
        parsed.boxName ? buildLine(labels.box, parsed.boxName) : "",
        buildLine(labels.customer, parsed.customerName || "-"),
        buildLine(
          labels.billNumber,
          isolateLtr(`#${parsed.billNumber || "-"}`),
        ),
        buildLine(labels.orderType, orderTypeLabel || "-"),
      ],
    );
  }

  if (parsed.kind === "BOX_NOT_FOUND") {
    return buildNotificationBody(
      t("notificationMessages.boxNotFoundTitle", "Box not found"),
      [
        buildLine(labels.customer, parsed.customerName || "-"),
        buildLine(
          labels.billNumber,
          isolateLtr(`#${parsed.billNumber || "-"}`),
        ),
        buildLine(labels.orderType, orderTypeLabel || "-"),
      ],
    );
  }

  if (parsed.kind === "ADMIN_PAYMENT") {
    const formattedDate = parsed.date
      ? formatSystemDate(parsed.date, language)
      : parsed.date;
    return buildNotificationBody(
      t("notificationMessages.adminPaymentTitle", "Payment received"),
      [
        buildLine(
          labels.amount,
          `${isolateLtr(parsed.amount)} ${currencyUnit}`,
        ),
        buildLine(labels.date, formattedDate || "-"),
      ],
    );
  }

  return formatReadableFallback(notification?.message, t);
}

export function formatSystemNotificationMessage(
  notification,
  t,
  language = "en",
) {
  const order = notification?.order;
  if (!order?.type || !order?.customer?.firstName) {
    return formatReadableFallback(notification?.message, t);
  }
  return buildNotificationBody(
    t("notificationMessages.emergencyOrderTitle", "Emergency order alert"),
    [
      buildLine(
        t("notificationMessages.customerLabel", "Customer"),
        order.customer.firstName,
      ),
      buildLine(
        t("notificationMessages.billNumberLabel", "Bill Number"),
        isolateLtr(`#${order.customer.billNumber ?? "-"}`),
      ),
      buildLine(
        t("notificationMessages.orderTypeLabel", "Order Type"),
        getOrderTypeLabel(order.type, language),
      ),
    ],
  );
}
