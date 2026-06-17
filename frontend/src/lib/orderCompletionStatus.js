const ROLE_STATUS = {
  qichikar: {
    tone: "blue",
    color: "#2563EB",
    soft: "#DBEAFE",
  },
  dokht: {
    tone: "orange",
    color: "#D97706",
    soft: "#FEF3C7",
  },
  ready: {
    tone: "green",
    color: "#16A34A",
    soft: "#DCFCE7",
  },
  legacy: {
    tone: "green",
    color: "#16A34A",
    soft: "#DCFCE7",
  },
  pending: {
    tone: "amber",
    color: "#D97706",
    soft: "#FEF3C7",
  },
  damage: {
    tone: "red",
    color: "#DC2626",
    soft: "#FEE2E2",
  },
};

const getRoleWorker = (order, role) => {
  if (role === "QICHIKAR") {
    return (
      order?.qichikarAssignedTo ||
      (order?.assignedTo?.accountType === "QICHIKAR" ? order.assignedTo : null)
    );
  }

  if (role === "DOKHT") {
    return (
      order?.dokhtAssignedTo ||
      (order?.assignedTo?.accountType === "DOKHT" ? order.assignedTo : null)
    );
  }

  return null;
};

export function getOrderCompletionStatus(order, t, options = {}) {
  const variant = options?.variant === "long" ? "long" : "short";
  const showLongText = variant === "long";
  const qichikarDone = Boolean(order?.qichikarCompletedAt);
  const dokhtDone = Boolean(order?.dokhtCompletedAt);
  const qichikarName =
    getRoleWorker(order, "QICHIKAR")?.name ||
    t("orderCompletion.qichikarFallback", "Qichikar");
  const dokhtName =
    getRoleWorker(order, "DOKHT")?.name ||
    t("orderCompletion.dokhtFallback", "Dokht worker");

  if (order?.isDamageOrder) {
    return {
      key: "damage",
      ...ROLE_STATUS.damage,
      label: t("orders.damageOrderStatus", "Damage Order"),
      detail: "",
    };
  }

  if (qichikarDone && dokhtDone) {
    return {
      key: "readyForDelivery",
      ...ROLE_STATUS.ready,
      label: showLongText
        ? t("orderCompletion.bothCompleted", {
            qichikarName,
            dokhtName,
            defaultValue:
              "Qichikar {{qichikarName}} and Dokht worker {{dokhtName}} completed work on this order.",
          })
        : t("orderCompletion.bothCompletedShort", {
            defaultValue: "Ready for delivery",
          }),
      detail: showLongText
        ? t("orderCompletion.readyForDelivery", {
            defaultValue:
              "Work on this order is complete and ready for delivery to the customer.",
          })
        : "",
    };
  }

  if (qichikarDone) {
    return {
      key: "qichikarCompleted",
      ...ROLE_STATUS.qichikar,
      label: showLongText
        ? t("orderCompletion.qichikarCompleted", {
            name: qichikarName,
            defaultValue: "Qichikar {{name}} completed work on this order.",
          })
        : t("orderCompletion.qichikarCompletedShort", {
            defaultValue: "Qichikar completed",
          }),
      detail: "",
    };
  }

  if (dokhtDone) {
    return {
      key: "dokhtCompleted",
      ...ROLE_STATUS.dokht,
      label: showLongText
        ? t("orderCompletion.dokhtCompleted", {
            name: dokhtName,
            defaultValue: "Dokht worker {{name}} completed work on this order.",
          })
        : t("orderCompletion.dokhtCompletedShort", {
            defaultValue: "Dokht completed",
          }),
      detail: "",
    };
  }

  if (order?.isCompleted) {
    return {
      key: "legacyCompleted",
      ...ROLE_STATUS.legacy,
      label: t("common.completed", "Completed"),
      detail: "",
    };
  }

  return {
    key: "pending",
    ...ROLE_STATUS.pending,
    label: t("delivery.notFullyPaidBadge", "Not Completed"),
    detail: "",
  };
}

export function getOrderCompletionBadgeStyle(status) {
  return {
    background: status?.soft || ROLE_STATUS.pending.soft,
    color: status?.color || ROLE_STATUS.pending.color,
    border: `1px solid ${status?.color || ROLE_STATUS.pending.color}40`,
  };
}
