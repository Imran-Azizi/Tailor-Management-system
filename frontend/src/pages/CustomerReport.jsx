import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LuChartBar,
  LuUsers,
  LuReceipt,
  LuTrendingDown,
  LuTrendingUp,
  LuPhone,
  LuCalendar,
  LuDownload,
  LuPrinter,
} from "react-icons/lu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api from "../lib/api.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import { formatSystemDate } from "../lib/locale.js";
import { formatCurrency } from "../lib/currency.js";
import { Spinner, Badge } from "../components/ui/index.jsx";

function formatMoney(v, language = "en") {
  return formatCurrency(v, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const ORDER_COLORS = {
  OUTFIT: "#2563EB",
  WASKAT: "#0D9488",
  KORTY: "#D97706",
  YAKHANQAQ: "#DC2626",
};

const PIE_COLORS = ["#2563EB", "#0D9488", "#D97706", "#DC2626", "#7C3AED"];

function isReportRtl(language = "en") {
  const l = String(language || "en").toLowerCase();
  return (
    l.startsWith("dari") ||
    l.startsWith("fa") ||
    l.startsWith("pashto") ||
    l.startsWith("ps")
  );
}

export default function CustomerReport() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = isReportRtl(language);

  // Fetch analytics for chart data
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => api.get("/analytics/dashboard").then((r) => r.data),
  });

  // Fetch customers for the leaderboard
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["customers-report"],
    queryFn: () =>
      api
        .get("/customers", { params: { limit: 10, page: 1 } })
        .then((r) => r.data),
  });

  const isLoading = analyticsLoading || customersLoading;
  const customers = customersData?.data || [];

  // Build order-type breakdown for pie
  const typeBreakdown = analytics?.ordersByType || [];
  const pieData = typeBreakdown.map((item) => ({
    name: getOrderTypeLabel(item.type || item._id, language),
    value: item._count || item.count || item.value || 0,
  }));

  // Monthly revenue for bar chart
  const monthly = analytics?.monthlyRevenue || [];

  const handlePrint = () => window.print();

  return (
    <div
      style={{
        padding: "0 0 40px",
        direction: isRtl ? "rtl" : "ltr",
        textAlign: isRtl ? "right" : "left",
        fontFamily: isRtl
          ? "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Inter', sans-serif"
          : undefined,
      }}
      className="report-root"
    >
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
              background: "#16a34a18",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LuChartBar size={18} style={{ color: "#16a34a" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>
              {t("report.title", "Report")}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              {t("report.subtitle")}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 16px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
            cursor: "pointer",
            color: "var(--text2)",
          }}
          className="no-print"
        >
          <LuPrinter size={14} />
          {t("common.print")}
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {/* KPI Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[
              {
                label: t("report.totalCustomers"),
                value: customersData?.total ?? 0,
                Icon: LuUsers,
                color: "#2563EB",
              },
              {
                label: t("report.totalOrders"),
                value: analytics?.totalOrders ?? 0,
                Icon: LuReceipt,
                color: "#7C3AED",
              },
              {
                label: t("report.totalRevenue"),
                value: formatMoney(analytics?.totalRevenue, language),
                Icon: LuTrendingUp,
                color: "#16a34a",
                isText: true,
              },
              {
                label: t("report.totalPending"),
                value: formatMoney(
                  analytics?.totalRemaining ?? analytics?.totalPending,
                  language,
                ),
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
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: s.color + "15",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <s.Icon size={17} style={{ color: s.color }} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text3)",
                      fontWeight: 500,
                      marginBottom: 2,
                    }}
                  >
                    {s.label}
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: s.color }}>
                    {s.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Monthly Revenue Bar */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                {t("report.monthlyRevenue")}
              </p>
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthly} barSize={18}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--text3)" }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "var(--text3)" }} />
                    <Tooltip
                      formatter={(v) => formatMoney(v, language)}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#2563EB"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--text3)",
                    fontSize: 13,
                    padding: 40,
                  }}
                >
                  {t("common.noData")}
                </p>
              )}
            </div>

            {/* Order type pie */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                {t("report.ordersByType")}
              </p>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                      fontSize={11}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--text3)",
                    fontSize: 13,
                    padding: 40,
                  }}
                >
                  {t("common.noData")}
                </p>
              )}
            </div>
          </div>

          {/* Top customers table */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <LuUsers size={15} style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {t("report.topCustomers")}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface2)" }}>
                    {[
                      "#",
                      t("common.customer"),
                      t("common.phone", "Phone"),
                      t("report.orderCount"),
                      t("common.date"),
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: isRtl ? "right" : "left",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text3)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr
                      key={c.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: 13,
                          color: "var(--text3)",
                          fontWeight: 600,
                        }}
                      >
                        {i + 1}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            flexDirection: isRtl ? "row-reverse" : "row",
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              background: "var(--primary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {c.firstName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 13 }}>
                              {c.firstName}
                            </p>
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--text3)",
                                fontFamily: "monospace",
                              }}
                            >
                              #{c.billNumber}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: 13,
                          color: "var(--text2)",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexDirection: isRtl ? "row-reverse" : "row",
                          }}
                        >
                          <LuPhone size={11} /> {c.phoneNumber}
                        </span>
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: "var(--primary-100)",
                            color: "var(--primary)",
                          }}
                        >
                          {c._count?.orders ?? 0}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: 12,
                          color: "var(--text3)",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexDirection: isRtl ? "row-reverse" : "row",
                          }}
                        >
                          <LuCalendar size={11} />{" "}
                          {formatSystemDate(c.createdAt, language)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: 30,
                          textAlign: "center",
                          color: "var(--text3)",
                          fontSize: 13,
                        }}
                      >
                        {t("common.noData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
