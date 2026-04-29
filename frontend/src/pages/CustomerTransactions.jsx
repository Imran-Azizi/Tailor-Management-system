import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LuArrowLeftRight,
  LuSearch,
  LuPhone,
  LuReceipt,
  LuTrendingUp,
  LuTrendingDown,
  LuClock,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getOrderDisplayName } from "../lib/orderType.js";
import { formatSystemDate } from "../lib/locale.js";
import { formatCurrency } from "../lib/currency.js";
import {
  Spinner,
  EmptyState,
  Pagination,
  Badge,
} from "../components/ui/index.jsx";

function formatMoney(v) {
  return formatCurrency(v, "en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function CustomerRow({ customer, expanded, onToggle }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const orders = customer.orders || [];
  const totalBilled = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalPaid = orders.reduce((s, o) => s + (o.paidAmount || 0), 0);
  const totalDiscount = orders.reduce((s, o) => s + (o.discount || 0), 0);
  const totalRemaining = orders.reduce((s, o) => s + (o.remaining || 0), 0);

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: "pointer",
          background: expanded ? "var(--primary-50)" : undefined,
          transition: "background .15s",
        }}
      >
        <td style={{ padding: "13px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {customer.firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>
                {customer.firstName}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <LuPhone size={10} /> {customer.phoneNumber}
              </p>
            </div>
          </div>
        </td>
        <td style={{ padding: "13px 16px" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--primary)",
            }}
          >
            #{customer.billNumber}
          </span>
        </td>
        <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600 }}>
          {orders.length}
        </td>
        <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700 }}>
          {formatMoney(totalBilled)}
        </td>
        <td
          style={{
            padding: "13px 16px",
            fontSize: 13,
            color: "#16a34a",
            fontWeight: 600,
          }}
        >
          {formatMoney(totalPaid)}
        </td>
        <td
          style={{ padding: "13px 16px", fontSize: 13, color: "var(--text3)" }}
        >
          {formatMoney(totalDiscount)}
        </td>
        <td style={{ padding: "13px 16px" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: totalRemaining > 0 ? "#DC2626" : "#16a34a",
            }}
          >
            {totalRemaining > 0
              ? formatMoney(totalRemaining)
              : t("orders.paidInFull")}
          </span>
        </td>
        <td style={{ padding: "13px 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: "var(--primary)",
            }}
          >
            {expanded ? t("common.close") : t("common.view")}
          </div>
        </td>
      </tr>

      {/* Expanded transaction detail */}
      {expanded && orders.length > 0 && (
        <tr>
          <td
            colSpan={8}
            style={{
              padding: "0 16px 16px 56px",
              background: "var(--surface2)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {[
                    "#",
                    t("common.type"),
                    t("common.total"),
                    t("common.paid"),
                    t("createOrder.discount"),
                    t("common.remaining"),
                    t("common.status", "Status"),
                    t("common.date"),
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "7px 10px",
                        textAlign: "left",
                        color: "var(--text3)",
                        fontWeight: 600,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr
                    key={o.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "8px 10px", color: "var(--text3)" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <Badge
                        v={
                          {
                            OUTFIT: "gold",
                            WASKAT: "teal",
                            KORTY: "amber",
                            YAKHANQAQ: "red",
                          }[o.type] || "gold"
                        }
                      >
                        {getOrderDisplayName(o, language)}
                      </Badge>
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>
                      {formatMoney(o.totalPrice)}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#16a34a" }}>
                      {formatMoney(o.paidAmount)}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text3)" }}>
                      {formatMoney(o.discount)}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        color: o.remaining > 0 ? "#DC2626" : "#16a34a",
                        fontWeight: o.remaining > 0 ? 700 : 400,
                      }}
                    >
                      {formatMoney(o.remaining)}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <Badge v={o.isCompleted ? "green" : "amber"}>
                        {o.isCompleted ? t("orders.done") : t("orders.pending")}
                      </Badge>
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--text3)" }}>
                      {formatSystemDate(o.createdAt, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

export default function CustomerTransactions() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers-transactions", page, search],
    queryFn: () =>
      api
        .get("/customers", { params: { page, limit: 20, search } })
        .then((r) => r.data),
  });

  // Fetch full orders for expanded customer
  const { data: customerDetail } = useQuery({
    queryKey: ["customer-detail", expanded],
    queryFn: () => api.get(`/customers/${expanded}`).then((r) => r.data),
    enabled: !!expanded,
  });

  // Build a map so the expanded row shows the fetched orders
  const detailMap = customerDetail
    ? { [customerDetail.id]: customerDetail }
    : {};

  const customers = data?.data || [];

  // Summary totals from current page
  const totalBilled = customers.reduce(
    (s, c) => s + (c._sum?.totalPrice || 0),
    0,
  );
  const totalRemaining = customers.reduce(
    (s, c) => s + (c._sum?.remaining || 0),
    0,
  );

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#7C3AED18",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LuArrowLeftRight size={18} style={{ color: "#7C3AED" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>
              {t("sidebar.dadAndStud")}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              {t("dadAndStud.subtitle")}
            </p>
          </div>
        </div>
        {/* Search */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <LuSearch
            size={13}
            style={{
              position: "absolute",
              left: 10,
              color: "var(--text3)",
              pointerEvents: "none",
            }}
          />
          <input
            className="inp"
            style={{ paddingLeft: 32, width: 200, height: 36 }}
            placeholder={t("orders.searchCustomers")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: t("common.customers"),
            value: data?.total ?? 0,
            Icon: LuReceipt,
            color: "#2563EB",
          },
          {
            label: t("dadAndStud.totalTransactions"),
            value: customers.reduce((s, c) => s + (c._count?.orders || 0), 0),
            Icon: LuArrowLeftRight,
            color: "#7C3AED",
          },
          {
            label: t("dadAndStud.totalOutstanding"),
            value: formatMoney(totalRemaining),
            Icon: LuTrendingDown,
            color: "#DC2626",
            isText: true,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: s.color + "15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <s.Icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <p
                style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500 }}
              >
                {s.label}
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: s.color }}>
                {s.isText ? s.value : s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <Spinner />
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface2)" }}>
                    {[
                      t("common.customer"),
                      "Bill #",
                      t("orders.titleAll"),
                      t("common.total"),
                      t("common.paid"),
                      t("createOrder.discount"),
                      t("common.remaining"),
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "11px 16px",
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text3)",
                          borderBottom: "1px solid var(--border)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          message={t("common.noData")}
                          Icon={LuArrowLeftRight}
                        />
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => {
                      const isExpanded = expanded === c.id;
                      const detail = detailMap[c.id];
                      const displayCustomer = detail
                        ? { ...c, orders: detail.orders }
                        : { ...c, orders: [] };
                      return (
                        <CustomerRow
                          key={c.id}
                          customer={displayCustomer}
                          expanded={isExpanded}
                          onToggle={() => setExpanded(isExpanded ? null : c.id)}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "10px 20px 16px" }}>
              <Pagination
                page={page}
                total={data?.total || 0}
                limit={20}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
