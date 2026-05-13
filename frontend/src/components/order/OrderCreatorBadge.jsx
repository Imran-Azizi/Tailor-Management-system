import { useTranslation } from "react-i18next";
import { LuUserCheck } from "react-icons/lu";

const ROLE_COLORS = {
  ADMIN: "#2563EB",
  DOKAN: "#0D9488",
  DOKHT: "#DB2777",
  QICHIKAR: "#D97706",
  FINANCE: "#059669",
};

export function getOrderCreator(order) {
  const role = order?.createdByRole || order?.createdBy?.accountType || "";
  const name = order?.createdByName || order?.createdBy?.name || "";

  if (!name && !role) return null;

  return {
    name: name || "-",
    role,
  };
}

export default function OrderCreatorBadge({
  order,
  compact = false,
  muted = false,
  style,
}) {
  const { t } = useTranslation();
  const creator = getOrderCreator(order);

  if (!creator) return null;

  const roleColor = ROLE_COLORS[creator.role] || "#64748B";
  const roleLabel = creator.role
    ? t(`users.roles.${creator.role.toLowerCase()}`, {
        defaultValue: creator.role,
      })
    : t("orders.unknownCreatorRole", "Unknown role");

  return (
    <div
      className="order-creator-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 5 : 7,
        flexWrap: "wrap",
        minWidth: 0,
        color: muted ? "var(--text3)" : "var(--text2)",
        fontSize: compact ? 11 : 12,
        lineHeight: 1.3,
        ...style,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          minWidth: 0,
        }}
      >
        <LuUserCheck size={compact ? 12 : 13} style={{ color: roleColor }} />
        <span style={{ fontWeight: 600 }}>
          {t("orders.createdBy", "Created By")}:
        </span>
        <span
          style={{
            color: "var(--text1)",
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: compact ? "nowrap" : "normal",
            maxWidth: compact ? 160 : "100%",
          }}
        >
          {creator.name}
        </span>
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          padding: compact ? "1px 6px" : "2px 8px",
          background: `${roleColor}18`,
          border: `1px solid ${roleColor}35`,
          color: roleColor,
          fontSize: compact ? 10 : 11,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        {roleLabel}
      </span>
    </div>
  );
}
