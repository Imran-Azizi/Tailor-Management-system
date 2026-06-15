import { getOrderTypeLabel } from "./orderType.js";
import { formatNumberLocale, formatSystemDate } from "./locale.js";

const LTR_ISOLATE_OPEN = "\u2066";
const LTR_ISOLATE_CLOSE = "\u2069";

const ASSIGNMENT_REGEX =
  /^New order assigned by (.+?): (.+?) - Bill #(\d+) \((.+?)\)(?: - Price: (?:AF\s*)?([\d,]+(?:\.\d+)?)(?:\s*AF)?)?(?:\. Note: (.+))?\.?$/i;
const WORK_STARTED_REGEX =
  /^(.+?) started working on order for (.+?) - Bill #(\d+) \((.+?)\)\.?$/i;
const WORK_STARTED_PIPE_REGEX =
  /^(Worker|Qichikar|Dokht) Name:\s*(.+?)\s*\|\s*Bill Number:\s*(\d+)\s*\|\s*Order Type:\s*(.+?)\s*\|\s*Customer Name:\s*(.+?)\s*\|\s*has started working on this order\.?$/i;
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
const WORK_RECEIVED_PIPE_REGEX =
  /^(Worker|Qichikar|Dokht) Name:\s*(.+?)\s*\|\s*Bill Number:\s*(\d+)\s*\|\s*Order Type:\s*(.+?)\s*\|\s*Customer Name:\s*(.+?)\s*\|\s*(?:accepted|received)(?: and self-assigned)? this order\.?$/i;
const WORK_RECEIVED_REGEX =
  /^(.+?) (?:received|accepted)(?: and self-assigned)?(?: the)? order - (.+?) - Bill #(\d+) \((.+?)\)\.?$/i;
const BOX_CAPACITY_FULL_REGEX =
  /^capacity of this box is full(?: \((.+?)\))? - (.+?) - Bill #(\d+) - (.+?)\.?$/i;
const BOX_NOT_FOUND_REGEX =
  /^No box found for (.+?) orders - (.+?) - Bill #(\d+) - (.+?)\.?$/i;
const ADMIN_PAYMENT_REGEX =
  /^Admin has given you ([\d.]+)(?:\s*AF)? on (\d{4}-\d{2}-\d{2})\.?$/i;
const WORKER_PAYMENT_REGEX =
  /^Admin (paid|updated) your completed (.+?) (?:order|payment) - Bill #(\d+) \((.+?)\) - (?:New Amount|Amount): ([\d,]+(?:\.\d+)?)\s*AF\.?$/i;
const WORKER_PAYMENT_RECEIPT_REGEX =
  /^Receipt confirmed by admin for your (.+?) payment - Bill #(\d+) \((.+?)\) - Amount: ([\d,]+(?:\.\d+)?)\s*AF\.?$/i;
const BOX_NOT_FOUND_CREATE_REGEX =
  /^No box found for (.+?) orders\. Please create a new box for this order type\. (.+?) - Bill #(\d+) - (.+?)\.?$/i;
const BOX_FULL_CREATE_REGEX =
  /^(Box capacity is now full|All boxes are full)(?: \((.+?)\))? for (.+?)\. Please create another box for this order type\. (.+?) - Bill #(\d+) - (.+?)\.?$/i;
const BOX_AVAILABLE_REGEX = /^Capacity available in (.+?) \((.+?)\)\.?$/i;
const DAMAGED_CLOTHES_ASSIGNED_REGEX =
  /^Damaged clothes assigned\s*\|\s*Bill Number:\s*(.+?)\s*\|\s*Role:\s*(.+?)\s*\|\s*Date:\s*(.+?)\s*\|\s*Note:\s*(.+?)\.?$/i;

const normalizeOrderTypeFromText = (typeText) => {
  const raw = String(typeText || "")
    .toUpperCase()
    .trim();
  if (
    [
      "OUTFIT",
      "WASKAT",
      "KORTY",
      "YAKHANQAQ",
      "FOREIGN_SHIPPING",
      "READY_MADE",
      "READY_MADE_WASKAT",
    ].includes(raw)
  ) {
    return raw;
  }
  return "";
};

const normalizeWorkerRoleFromText = (roleText) => {
  const raw = String(roleText || "").toUpperCase().trim();
  if (raw === "DOKHT") return "DOKHT";
  if (raw === "QICHIKAR") return "QICHIKAR";
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

const buildWorkerLine = (t, name, role) =>
  buildLine(getWorkerRoleLabel(role, t), name);

const buildCompactContext = (t, parts = {}) => {
  const entries = [];
  if (parts.billNumber) {
    entries.push(
      `${t("notificationMessages.billShortLabel", "Bill")} ${isolateLtr(
        `#${parts.billNumber}`,
      )}`,
    );
  }
  if (parts.customerName) entries.push(parts.customerName);
  if (parts.orderTypeLabel) entries.push(parts.orderTypeLabel);
  return entries.filter(Boolean).join(" - ");
};

const buildCompactMessage = (title, ...lines) =>
  buildNotificationBody(title, lines);

const getLocalizedCurrencyUnit = (t) =>
  t("notificationMessages.currencyUnit", "AF");

const normalizeAmount = (value) =>
  String(value || "")
    .replace(/,/g, "")
    .trim();

const formatAmount = (value, t, language) => {
  const amount = Number(normalizeAmount(value));
  const rendered = Number.isFinite(amount)
    ? formatNumberLocale(amount, language)
    : normalizeAmount(value) || "0";
  return `${isolateLtr(rendered)} ${getLocalizedCurrencyUnit(t)}`;
};

const getWorkerRoleLabel = (role, t) => {
  const normalized = String(role || "").toUpperCase().trim();
  if (normalized === "DOKHT") {
    return t("notificationMessages.dokhtWorkerLabel", "Dokht");
  }
  if (normalized === "QICHIKAR") {
    return t("notificationMessages.qichikarWorkerLabel", "Qichikar");
  }
  return t("notificationMessages.workerLabel", "Worker");
};

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
    "qichikar name": t("notificationMessages.qichikarWorkerLabel", "Qichikar"),
    "dokht name": t("notificationMessages.dokhtWorkerLabel", "Dokht"),
    "customer name": t("notificationMessages.customerLabel", "Customer"),
    customer: t("notificationMessages.customerLabel", "Customer"),
    "bill number": t("notificationMessages.billNumberLabel", "Bill Number"),
    "bill #": t("notificationMessages.billNumberLabel", "Bill Number"),
    "order type": t("notificationMessages.orderTypeLabel", "Order Type"),
    price: t("notificationMessages.priceLabel", "Price"),
    note: t("notificationMessages.noteLabel", "Note"),
    amount: t("notificationMessages.amountLabel", "Amount"),
    date: t("notificationMessages.dateLabel", "Date"),
    created: t("notificationsPage.created", "Created"),
    phone: t("common.phone", "Phone"),
    status: t("common.status", "Status"),
    box: t("notificationMessages.boxLabel", "Box"),
  };

  const colonIndex = raw.indexOf(":");
  if (colonIndex === -1) {
    if (/Emergency Alert/i.test(raw)) {
      return t("notificationMessages.emergencyOrderTitle", "Emergency order alert");
    }
    if (/Emergency order (created|reminder)/i.test(raw)) {
      return t(
        "notificationMessages.emergencyOrderIntro",
        "Please prioritize and complete this order first.",
      );
    }
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
      workerRole: normalizeWorkerRoleFromText(matched[1]),
      actor: matched[2],
      billNumber: matched[3],
      orderType: normalizeOrderTypeFromText(matched[4]),
      customerName: matched[5],
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
      workerRole: "DOKHT",
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
      workerRole: "QICHIKAR",
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

  matched = msg.match(WORK_RECEIVED_PIPE_REGEX);
  if (matched) {
    return {
      kind: "WORK_RECEIVED",
      workerRole: normalizeWorkerRoleFromText(matched[1]),
      actor: matched[2],
      billNumber: matched[3],
      orderType: normalizeOrderTypeFromText(matched[4]),
      customerName: matched[5],
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

  matched = msg.match(WORKER_PAYMENT_REGEX);
  if (matched) {
    return {
      kind: "WORKER_PAYMENT",
      paymentAction: matched[1].toLowerCase(),
      workerRole: matched[2],
      billNumber: matched[3],
      customerName: matched[4],
      amount: matched[5],
    };
  }

  matched = msg.match(WORKER_PAYMENT_RECEIPT_REGEX);
  if (matched) {
    return {
      kind: "WORKER_PAYMENT_RECEIPT",
      workerRole: matched[1],
      billNumber: matched[2],
      customerName: matched[3],
      amount: matched[4],
    };
  }

  matched = msg.match(BOX_NOT_FOUND_CREATE_REGEX);
  if (matched) {
    return {
      kind: "BOX_CREATE_NEEDED",
      boxName: "",
      orderType: normalizeOrderTypeFromText(matched[1]),
      customerName: matched[2],
      billNumber: matched[3],
    };
  }

  matched = msg.match(BOX_FULL_CREATE_REGEX);
  if (matched) {
    return {
      kind: "BOX_CREATE_NEEDED",
      boxName: matched[2] || "",
      orderType: normalizeOrderTypeFromText(matched[3]),
      customerName: matched[4],
      billNumber: matched[5],
    };
  }

  matched = msg.match(BOX_AVAILABLE_REGEX);
  if (matched) {
    return {
      kind: "BOX_AVAILABLE",
      boxName: matched[1],
      orderType: normalizeOrderTypeFromText(matched[2]),
    };
  }

  matched = msg.match(DAMAGED_CLOTHES_ASSIGNED_REGEX);
  if (matched) {
    return {
      kind: "DAMAGED_CLOTHES_ASSIGNED",
      billNumber: matched[1],
      workerRole: matched[2],
      date: matched[3],
      note: matched[4],
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
  const context = buildCompactContext(t, {
    billNumber: parsed.billNumber,
    customerName: parsed.customerName,
    orderTypeLabel,
  });
  const workerLine = buildWorkerLine(t, parsed.actor, parsed.workerRole);

  if (parsed.kind === "ASSIGNMENT") {
    return buildCompactMessage(
      t("notificationMessages.assignmentTitle", "New order assigned"),
      t("notificationMessages.assignmentShort", "Order assigned to a worker."),
      context,
    );
  }

  if (parsed.kind === "WORK_STARTED") {
    return buildCompactMessage(
      t("notificationMessages.workStartedTitle", "Work started"),
      t("notificationMessages.workStartedShort", "Worker started the order."),
      workerLine,
      context,
    );
  }

  if (parsed.kind === "WORK_COMPLETED") {
    return buildCompactMessage(
      t(
        "notificationMessages.workCompletedTitle",
        "Work completed successfully",
      ),
      t("notificationMessages.workCompletedShort", "Order work is complete."),
      workerLine,
      context,
    );
  }

  if (parsed.kind === "QICHIKAR_READY_FOR_DOKHT") {
    return buildCompactMessage(
      t("notificationMessages.qichikarReadyForDokhtTitle", "Ready for Dokht"),
      t(
        "notificationMessages.qichikarReadyForDokhtShort",
        "Cutting is complete. Send it to Dokht.",
      ),
      workerLine,
      context,
    );
  }

  if (parsed.kind === "WORK_RECEIVED") {
    return buildCompactMessage(
      t("notificationMessages.workReceivedTitle", "Order received"),
      t("notificationMessages.workReceivedShort", "Worker received the order."),
      workerLine,
      context,
    );
  }

  if (parsed.kind === "BOX_CAPACITY_FULL") {
    return buildCompactMessage(
      t("notificationMessages.boxCapacityFullTitle", "Box capacity full"),
      t("notificationMessages.boxCapacityFullShort", "This box has no free space."),
      context,
    );
  }

  if (parsed.kind === "BOX_NOT_FOUND") {
    return buildCompactMessage(
      t("notificationMessages.boxNotFoundTitle", "Box not found"),
      t("notificationMessages.boxNotFoundShort", "Create a box for this order type."),
      context,
    );
  }

  if (parsed.kind === "ADMIN_PAYMENT") {
    const formattedDate = parsed.date
      ? formatSystemDate(parsed.date, language)
      : parsed.date;
    return buildCompactMessage(
      t("notificationMessages.adminPaymentTitle", "Payment received"),
      t("notificationMessages.adminPaymentShort", "A payment was recorded for you."),
      [
        formatAmount(parsed.amount, t, language),
        formattedDate,
      ].filter(Boolean).join(" - "),
    );
  }

  if (parsed.kind === "WORKER_PAYMENT") {
    const titleKey =
      parsed.paymentAction === "updated"
        ? "notificationMessages.workerPaymentUpdatedTitle"
        : "notificationMessages.workerPaymentTitle";
    const fallbackTitle =
      parsed.paymentAction === "updated"
        ? "Worker payment updated"
        : "Worker payment paid";
    return buildCompactMessage(
      t(titleKey, fallbackTitle),
      t("notificationMessages.workerPaymentShort", "Worker payment was saved."),
      [
        context,
        formatAmount(parsed.amount, t, language),
      ].filter(Boolean).join(" - "),
    );
  }

  if (parsed.kind === "WORKER_PAYMENT_RECEIPT") {
    return buildCompactMessage(
      t(
        "notificationMessages.workerPaymentReceiptTitle",
        "Payment receipt confirmed",
      ),
      t("notificationMessages.workerPaymentReceiptShort", "Payment receipt was confirmed."),
      [
        context,
        formatAmount(parsed.amount, t, language),
      ].filter(Boolean).join(" - "),
    );
  }

  if (parsed.kind === "BOX_CREATE_NEEDED") {
    return buildCompactMessage(
      t("notificationMessages.boxCreateNeededTitle", "Box action needed"),
      t("notificationMessages.boxCreateNeededShort", "Create another box to continue."),
      context,
    );
  }

  if (parsed.kind === "BOX_AVAILABLE") {
    return buildCompactMessage(
      t("notificationMessages.boxCapacityAvailableTitle", "Box has capacity"),
      t("notificationMessages.boxCapacityAvailableShort", "You can add more orders to this box."),
      [parsed.boxName, orderTypeLabel].filter(Boolean).join(" - "),
    );
  }

  if (parsed.kind === "DAMAGED_CLOTHES_ASSIGNED") {
    return buildCompactMessage(
      t("notificationMessages.damagedClothesAssignedTitle", "Damaged clothes assigned"),
      t("notificationMessages.damagedClothesAssignedShort", "A damaged-clothes task was assigned."),
      [
        `${t("notificationMessages.billShortLabel", "Bill")} ${isolateLtr(
          `#${parsed.billNumber || "-"}`,
        )}`,
        getWorkerRoleLabel(parsed.workerRole, t),
      ].join(" - "),
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
      t(
        "notificationMessages.emergencyOrderShort",
        "This order needs priority attention.",
      ),
      buildCompactContext(t, {
        billNumber: order.customer.billNumber,
        customerName: order.customer.firstName,
        orderTypeLabel: getOrderTypeLabel(order.type, language),
      }),
    ],
  );
}
