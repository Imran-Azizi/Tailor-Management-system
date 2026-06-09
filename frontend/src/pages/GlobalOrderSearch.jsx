import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LuSearch,
  LuX,
  LuCopy,
  LuUser,
  LuPhone,
  LuHash,
  LuLoader,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatCurrency } from "../lib/currency.js";
import { MONEY_SCALE } from "../lib/decimal.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import { getMonthLabel } from "../lib/months.js";
import { isRtlLanguage } from "../lib/locale.js";
import { getOrderCompletionStatus } from "../lib/orderCompletionStatus.js";
import {
  PageHeader,
  Spinner,
  EmptyState,
  Pagination,
} from "../components/ui/index.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import OrderCreatorBadge from "../components/order/OrderCreatorBadge.jsx";

const SEARCH_DEBOUNCE_MS = 400;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function OrderTypeBadge({ type, language }) {
  const label = getOrderTypeLabel(type, language);
  const colorMap = {
    OUTFIT: "#2563EB",
    WASKAT: "#7C3AED",
    KORTY: "#D97706",
    YAKHANQAQ: "#059669",
    READY_MADE: "#DB2777",
    READY_MADE_WASKAT: "#0284C7",
  };
  const color = colorMap[type] || "#6B7280";
  return (
    <span
      style={{
        display: "inline-block",
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ order, t }) {
  const completionStatus = getOrderCompletionStatus(order, t);
  if (completionStatus.key !== "pending") {
    return (
      <span
        style={{
          color: completionStatus.color,
          fontWeight: 600,
          fontSize: 12,
        }}
        title={completionStatus.detail || completionStatus.label}
      >
        {completionStatus.label}
      </span>
    );
  }

  if (order.inProgress || order.qichikarInProgress || order.dokhtInProgress) {
    return (
      <span style={{ color: "#D97706", fontWeight: 600, fontSize: 12 }}>
        {t("orders.inProgress", "In Progress")}
      </span>
    );
  }
  return (
    <span style={{ color: "#6B7280", fontWeight: 600, fontSize: 12 }}>
      {t("orders.pending", "Pending")}
    </span>
  );
}

function highlightText(text, query) {
  const value = String(text ?? "");
  const search = String(query ?? "").trim();
  if (!value || !search) return value;

  const lowerValue = value.toLowerCase();
  const lowerSearch = search.toLowerCase();
  const index = lowerValue.indexOf(lowerSearch);
  if (index < 0) return value;

  const before = value.slice(0, index);
  const match = value.slice(index, index + search.length);
  const after = value.slice(index + search.length);

  return (
    <>
      {before}
      <mark
        style={{
          background: "rgba(37, 99, 235, 0.16)",
          color: "inherit",
          padding: "0 2px",
          borderRadius: 4,
        }}
      >
        {match}
      </mark>
      {after}
    </>
  );
}

export default function GlobalOrderSearch() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = isRtlLanguage(language);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, user } = useAuth();
  const inputRef = useRef(null);
  const queryFromUrl = (searchParams.get("q") || "").trim();

  const [inputValue, setInputValue] = useState(queryFromUrl);
  const [page, setPage] = useState(1);
  const [copyingId, setCopyingId] = useState(null);

  const debouncedQuery = useDebounce(inputValue, SEARCH_DEBOUNCE_MS);

  // Reset page on new query
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    if (queryFromUrl !== inputValue) {
      setInputValue(queryFromUrl);
      setPage(1);
    }
  }, [queryFromUrl, inputValue]);

  useEffect(() => {
    const nextQuery = debouncedQuery.trim();
    if (nextQuery === queryFromUrl) return;

    const next = new URLSearchParams(searchParams);
    if (nextQuery) {
      next.set("q", nextQuery);
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  }, [debouncedQuery, queryFromUrl, searchParams, setSearchParams]);

  const isQueryReady = debouncedQuery.trim().length >= 1;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["global-order-search", debouncedQuery, page],
    queryFn: async () => {
      const res = await api.get("/orders/global-search", {
        params: { q: debouncedQuery, page, limit: 15 },
      });
      return res.data;
    },
    enabled: isQueryReady,
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const orders = data?.data || [];
  const total = data?.total || 0;
  const trimmedQuery = debouncedQuery.trim();
  const isExactBillQuery =
    /^\d+$/.test(trimmedQuery) && trimmedQuery.length <= 8;

  const handleClear = () => {
    setInputValue("");
    setPage(1);
    inputRef.current?.focus();
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const next = inputValue.trim();
    if (!next) return;
    setPage(1);
    const params = new URLSearchParams();
    params.set("q", next);
    setSearchParams(params, { replace: true });
  };

  const handleNewOrder = useCallback(
    async (order) => {
      setCopyingId(order.id);
      try {
        const res = await api.get(`/orders/${order.id}/prefill`);
        const prefillData = res.data;
        navigate("/orders/create", {
          state: { prefillData },
        });
      } catch (e) {
        toast.error(
          getApiErrorMessage(
            e,
            t("globalSearch.prefillError", "Failed to load order data"),
          ),
        );
      } finally {
        setCopyingId(null);
      }
    },
    [navigate, t],
  );

  const dir = isRtl ? "rtl" : "ltr";
  const emptyValue = t("common.notAvailable", "-");

  return (
    <div
      className="page global-order-search"
      dir={dir}
      style={{ direction: dir }}
    >
      <PageHeader title={t("globalSearch.title", "Global Order Search")} />

      {/* Description */}
      <p className="global-order-search__description">
        {t(
          "globalSearch.description",
          "Search orders across all months by customer name, phone number, or bill number.",
        )}
      </p>

      {/* Search bar */}
      <form
        className="global-order-search__form"
        onSubmit={handleSearchSubmit}
      >
        <div className="global-order-search__input-wrap">
          <LuSearch
            size={16}
            style={{
              position: "absolute",
              top: "50%",
              [isRtl ? "right" : "left"]: 12,
              transform: "translateY(-50%)",
              color: "var(--text3)",
              pointerEvents: "none",
            }}
          />
          <input
            ref={inputRef}
            type="text"
            className="input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t(
              "globalSearch.placeholder",
              "Search by name, phone, or bill number...",
            )}
            style={{
              paddingInlineStart: 38,
              paddingInlineEnd: inputValue ? 36 : 12,
            }}
            autoFocus
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: "absolute",
                top: "50%",
                [isRtl ? "left" : "right"]: 10,
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text3)",
                display: "flex",
                alignItems: "center",
                padding: 2,
              }}
              aria-label={t("common.clear", "Clear")}
            >
              <LuX size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={!inputValue.trim()}
          style={{ whiteSpace: "nowrap" }}
        >
          <LuSearch size={14} />
          {t("common.search", "Search")}
        </button>
      </form>

      <p className="global-order-search__hint">
        {t(
          "globalSearch.searchHint",
          "Search another order by customer name, phone number, or bill number.",
        )}
      </p>

      {/* Search hints */}
      {!isQueryReady && (
        <div
          className="card global-order-search__empty-card"
        >
          <div
            className="global-order-search__quick-hints"
          >
            {[
              {
                icon: LuUser,
                label: t("globalSearch.searchByName", "Customer Name"),
              },
              {
                icon: LuPhone,
                label: t("globalSearch.searchByPhone", "Phone Number"),
              },
              {
                icon: LuHash,
                label: t("globalSearch.searchByBill", "Bill Number"),
              },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="global-order-search__quick-hint"
              >
                <Icon size={15} style={{ color: "var(--primary)" }} />
                {label}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>
            {t(
              "globalSearch.startTyping",
              "Start typing to search across all months",
            )}
          </p>
        </div>
      )}

      {/* Loading state */}
      {isQueryReady && (isLoading || isFetching) && orders.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spinner />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="info-box ib-red" style={{ marginBottom: 16 }}>
          {getApiErrorMessage(
            error,
            t("globalSearch.searchFailed", "Search failed"),
          )}
        </div>
      )}

      {/* Results */}
      {isQueryReady && !isLoading && orders.length === 0 && !error && (
        <EmptyState
          message={t(
            "globalSearch.noResults",
            "No orders found matching your search.",
          )}
        />
      )}

      {orders.length > 0 && (
        <>
          <div
            className="global-order-search__results-meta"
          >
            {isFetching && (
              <LuLoader
                size={12}
                style={{ animation: "spin 1s linear infinite" }}
              />
            )}
            {t("globalSearch.resultsCount", {
              count: total,
              defaultValue: `{{count}} order(s) found`,
            })}
          </div>

          {/* Desktop table */}
          <div className="card global-order-search__table-card order-scroll-x">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--surface2)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {[
                    t("globalSearch.col.billNumber", "Bill Number"),
                    t("globalSearch.col.customer", "Customer"),
                    t("globalSearch.col.phone", "Phone"),
                    t("globalSearch.col.type", "Type"),
                    t("globalSearch.col.month", "Month / Year"),
                    t("globalSearch.col.price", "Price"),
                    t("orders.createdBy", "Created By"),
                    t("globalSearch.col.status", "Status"),
                    t("globalSearch.col.action", "Action"),
                  ].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: "10px 14px",
                        textAlign: isRtl ? "right" : "left",
                        fontWeight: 600,
                        color: "var(--text2)",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => {
                  const monthLabel = order.entryMonth
                    ? `${getMonthLabel(order.entryMonth, language)} ${order.entryYear || ""}`
                    : emptyValue;
                  const isCopying = copyingId === order.id;
                  return (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom:
                          idx < orders.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                        background: isExactBillQuery
                          ? String(order.customer?.billNumber || "") ===
                            trimmedQuery
                            ? "rgba(37, 99, 235, 0.08)"
                            : idx % 2 === 0
                              ? "transparent"
                              : "var(--surface2)"
                          : idx % 2 === 0
                            ? "transparent"
                            : "var(--surface2)",
                        outline:
                          isExactBillQuery &&
                          String(order.customer?.billNumber || "") ===
                            trimmedQuery
                            ? "1px solid rgba(37, 99, 235, 0.22)"
                            : "none",
                        transition: "background 0.15s",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 14px",
                          fontWeight: 700,
                          color: "var(--primary)",
                        }}
                      >
                        {highlightText(
                          order.customer?.billNumber ?? emptyValue,
                          trimmedQuery,
                        )}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {highlightText(
                          order.customer?.firstName || emptyValue,
                          trimmedQuery,
                        )}
                      </td>
                      <td
                        style={{ padding: "10px 14px", color: "var(--text2)" }}
                      >
                        {highlightText(
                          order.customer?.phoneNumber || emptyValue,
                          trimmedQuery,
                        )}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <OrderTypeBadge type={order.type} language={language} />
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          color: "var(--text2)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {monthLabel}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCurrency(
                          order.totalPrice ?? 0,
                          MONEY_SCALE,
                          language,
                        )}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <OrderCreatorBadge order={order} compact />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <StatusBadge order={order} t={t} />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleNewOrder(order)}
                          disabled={isCopying || !!copyingId}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          {isCopying ? (
                            <LuLoader
                              size={12}
                              style={{ animation: "spin 1s linear infinite" }}
                            />
                          ) : (
                            <LuCopy size={12} />
                          )}
                          {t("globalSearch.newOrder", "New Order")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="global-order-search__mobile-cards">
            {orders.map((order) => {
              const monthLabel = order.entryMonth
                ? `${getMonthLabel(order.entryMonth, language)} ${order.entryYear || ""}`
                : emptyValue;
              const isCopying = copyingId === order.id;
              return (
                <div
                  key={order.id}
                  className="card global-order-search__mobile-card"
                >
                  <div
                    className="global-order-search__mobile-head"
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "var(--primary)",
                        }}
                      >
                        {highlightText(
                          `#${order.customer?.billNumber}`,
                          trimmedQuery,
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--text1)",
                          marginInlineStart: 8,
                          fontWeight: 600,
                        }}
                      >
                        {order.customer?.firstName}
                      </span>
                    </div>
                    <StatusBadge order={order} t={t} />
                  </div>
                  <div
                    className="global-order-search__mobile-facts"
                  >
                    <span
                      className="global-order-search__mobile-fact"
                    >
                      <LuPhone size={11} />{" "}
                      {highlightText(
                        order.customer?.phoneNumber || emptyValue,
                        trimmedQuery,
                      )}
                    </span>
                    <OrderTypeBadge type={order.type} language={language} />
                    <span className="global-order-search__mobile-fact">
                      {monthLabel}
                    </span>
                    <OrderCreatorBadge order={order} compact />
                  </div>
                  <div className="global-order-search__mobile-actions">
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {formatCurrency(
                        order.totalPrice ?? 0,
                        MONEY_SCALE,
                        language,
                      )}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleNewOrder(order)}
                      disabled={isCopying || !!copyingId}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                      }}
                    >
                      {isCopying ? (
                        <LuLoader
                          size={12}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                      ) : (
                        <LuCopy size={12} />
                      )}
                      {t("globalSearch.newOrder", "New Order")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={{ marginTop: 20 }}>
            <Pagination
              page={page}
              total={total}
              limit={15}
              onChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
