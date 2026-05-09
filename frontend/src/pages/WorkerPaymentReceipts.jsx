import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LuReceiptText, LuRefreshCcw, LuSearch } from "react-icons/lu";
import api from "../lib/api.js";
import { formatCurrency } from "../lib/currency.js";
import { formatDateLocale } from "../lib/locale.js";
import { useMonth } from "../context/MonthContext.jsx";
import { formatMonthYearLabel } from "../lib/months.js";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  StatCard,
} from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";

const LIMIT = 15;

function orderTypeLabel(type, t) {
  if (!type) return "-";
  if (type === "OUTFIT") return t("orderTypes.outfit", "Outfit");
  if (type === "WASKAT") return t("orderTypes.waskat", "Waskat");
  if (type === "KORTY") return t("orderTypes.korty", "Korty");
  if (type === "YAKHANQAQ") return t("orderTypes.yakhanqaq", "Yakhanqaq");
  return type;
}

function roleLabel(role, t) {
  if (role === "QICHIKAR")
    return t("completedWorkerOrders.qichikarRole", "Qichikar");
  if (role === "DOKHT") return t("completedWorkerOrders.dokhtRole", "Dokht");
  return t("common.worker", "Worker");
}

export default function WorkerPaymentReceipts() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const { viewMonth, viewYear } = useMonth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [workerRole, setWorkerRole] = useState("");
  const [status, setStatus] = useState("RECEIVED");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const next = {
      page,
      limit: LIMIT,
      month: viewMonth,
      year: viewYear,
    };
    if (search.trim()) next.search = search.trim();
    if (workerId) next.workerId = workerId;
    if (workerRole) next.workerRole = workerRole;
    if (status !== "ALL") next.status = status;
    return next;
  }, [page, search, status, viewMonth, viewYear, workerId, workerRole]);

  const { data: workerOptions = [], isLoading: isWorkersLoading } = useQuery({
    queryKey: ["assignable-workers"],
    queryFn: () => api.get("/users/assignable").then((r) => r.data),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["worker-payment-receipts", params],
    queryFn: () =>
      api.get("/orders/completed/receipts", { params }).then((r) => r.data),
    keepPreviousData: true,
  });

  const rows = data?.data || [];
  const total = Number(data?.total || 0);
  const stats = data?.stats || {
    totalReceipts: 0,
    totalPaidAmount: 0,
  };

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setWorkerId("");
    setWorkerRole("");
    setStatus("RECEIVED");
    setPage(1);
  };

  return (
    <div className="page">
      <PageHeader
        title={t("workerReceipts.title", "Worker Payment Receipt History")}
        subtitle={t(
          "workerReceipts.subtitle",
          "Track all worker payment receipts with monthly, role, and worker filters.",
        )}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <StatCard
          label={t("workerReceipts.totalReceipts", "Total Receipts")}
          value={stats.totalReceipts}
          Icon={LuReceiptText}
          accent="#0F766E"
        />
        <StatCard
          label={t("workerReceipts.totalAmount", "Total Amount")}
          value={formatCurrency(stats.totalPaidAmount || 0, "en")}
          Icon={AfCurrencyIcon}
          accent="#2563EB"
        />
      </div>

      <Card>
        <form
          onSubmit={onSearch}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label className="lbl">{t("common.search", "Search")}</label>
            <div style={{ position: "relative" }}>
              <LuSearch
                size={14}
                style={{
                  position: "absolute",
                  insetInlineStart: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                }}
              />
              <input
                className="inp"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t(
                  "workerReceipts.searchPlaceholder",
                  "Search by bill, worker, admin, customer",
                )}
                style={{ paddingInlineStart: 32 }}
              />
            </div>
          </div>

          <div>
            <label className="lbl">
              {t("workerReceipts.worker", "Worker")}
            </label>
            <select
              className="inp"
              value={workerId}
              onChange={(e) => {
                setWorkerId(e.target.value);
                setPage(1);
              }}
              disabled={isWorkersLoading}
            >
              <option value="">
                {t("workerReceipts.allWorkers", "All workers")}
              </option>
              {workerOptions
                .filter(
                  (worker) =>
                    worker.accountType === "QICHIKAR" ||
                    worker.accountType === "DOKHT",
                )
                .map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="lbl">
              {t("workerReceipts.workerRole", "Worker Role")}
            </label>
            <select
              className="inp"
              value={workerRole}
              onChange={(e) => {
                setWorkerRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("common.all", "All")}</option>
              <option value="QICHIKAR">
                {t("completedWorkerOrders.qichikarRole", "Qichikar")}
              </option>
              <option value="DOKHT">
                {t("completedWorkerOrders.dokhtRole", "Dokht")}
              </option>
            </select>
          </div>

          <div>
            <label className="lbl">{t("common.status", "Status")}</label>
            <select
              className="inp"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">{t("common.all", "All")}</option>
              <option value="RECEIVED">
                {t("workerReceipts.received", "Received")}
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-outline"
            style={{ minWidth: 110, height: 40, fontWeight: 600, gap: 8 }}
          >
            <LuSearch size={14} />
            {t("common.search", "Search")}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={resetFilters}
          >
            <LuRefreshCcw size={14} />
            {t("completedWorkerOrders.clearFilters", "Clear Filters")}
          </button>
        </form>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            color: "var(--text3)",
            fontSize: 12,
          }}
        >
          <span>
            {t("common.viewingMonth", "Viewing data for")}:{" "}
            <b>{formatMonthYearLabel(viewMonth, viewYear, language)}</b>
          </span>
        </div>
      </Card>

      <Card
        title={t("workerReceipts.tableTitle", "Receipt Orders")}
        action={
          isFetching ? (
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              {t("common.loading", "Loading...")}
            </span>
          ) : null
        }
      >
        {isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState
            Icon={LuReceiptText}
            message={t("workerReceipts.empty", "No receipt records found.")}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("orders.billNumber", "Bill Number")}</th>
                  <th>
                    {t("completedWorkerOrders.workerName", "Worker Name")}
                  </th>
                  <th>
                    {t("completedWorkerOrders.workerRole", "Worker Role")}
                  </th>
                  <th>{t("workerPanel.orderType", "Order Type")}</th>
                  <th>{t("workerReceipts.paidAmount", "Paid Amount")}</th>
                  <th>{t("workerReceipts.receiptDate", "Receipt Date")}</th>
                  <th>{t("workerReceipts.adminName", "Admin Name")}</th>
                  <th>{t("common.status", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>#{row.order?.customer?.billNumber || "-"}</td>
                    <td>{row.worker?.name || "-"}</td>
                    <td>{roleLabel(row.workerRole, t)}</td>
                    <td>{orderTypeLabel(row.order?.type, t)}</td>
                    <td>{formatCurrency(row.paidAmount || 0, "en")}</td>
                    <td>{formatDateLocale(row.receiptDate, language)}</td>
                    <td>{row.receivedByAdmin?.name || "-"}</td>
                    <td>
                      <Badge v="green">
                        {t("workerReceipts.received", "Received")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          total={total}
          limit={LIMIT}
          onChange={(nextPage) => setPage(nextPage)}
        />
      </Card>
    </div>
  );
}
