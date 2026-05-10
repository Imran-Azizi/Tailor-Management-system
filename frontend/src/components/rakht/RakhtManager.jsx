import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LuPencil,
  LuTrash2,
  LuFactory,
  LuCalendar,
  LuChartColumn,
  LuBoxes,
  LuFilter,
  LuBuilding2,
  LuHistory,
  LuEye,
} from "react-icons/lu";
import AfCurrencyIcon from "../ui/AfCurrencyIcon.jsx";
import Select from "react-select";
import toast from "react-hot-toast";
import api from "../../lib/api.js";
import { getApiErrorMessage } from "../../lib/feedback.js";
import {
  formatNumberLocale,
  formatSystemDate,
  formatSystemDateTime,
} from "../../lib/locale.js";
import { formatCurrency } from "../../lib/currency.js";
import { Modal, ConfirmDeleteModal, StatCard } from "../ui/index.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useMonth } from "../../context/MonthContext.jsx";
import {
  TON_QTY_OPTIONS,
  buildTonsForQuantity,
  rakhtSchema,
  emptyForm,
  sanitizeIntegerInput,
} from "./rakhtFormConfig.js";

export default function RakhtManager() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const { isAdmin } = useAuth();
  const { viewMonth, viewYear } = useMonth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCompany, setPaymentCompany] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [viewItemId, setViewItemId] = useState(null);
  const [filterCompany, setFilterCompany] = useState(null);
  const [filterBrand, setFilterBrand] = useState(null);
  const [filterStatus, setFilterStatus] = useState({
    value: "ALL",
    label: t("common.all", { defaultValue: "All" }),
  });
  const [form, setForm] = useState(emptyForm());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rakht-list", { viewMonth, viewYear }],
    queryFn: () =>
      api
        .get("/rakhts", {
          params: {
            month: viewMonth,
            year: viewYear,
          },
        })
        .then((res) => res.data),
  });

  const { data: viewDetails, isLoading: isViewLoading } = useQuery({
    queryKey: ["rakht-detail", viewItemId],
    queryFn: () => api.get(`/rakhts/${viewItemId}`).then((res) => res.data),
    enabled: Boolean(viewItemId),
  });

  const formatAmount = (value) =>
    formatNumberLocale(Math.round(Number(value || 0)), language);

  const saveMut = useMutation({
    mutationFn: (payload) => api.put(`/rakhts/${editing.id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rakht-list"] });
      setModal(false);
      setEditing(null);
      setForm(emptyForm());
      toast.success(t("rakht.updated", { defaultValue: "Rakht updated." }));
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("rakht.saveFailed", { defaultValue: "Unable to save Rakht." }),
        ),
      ),
  });

  const delCompanyMut = useMutation({
    mutationFn: (companyName) =>
      api.delete(`/rakhts/company/${encodeURIComponent(companyName)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rakht-list"] });
      qc.invalidateQueries({ queryKey: ["rakht-payment-history"] });
      setDeleteItem(null);
      setFilterCompany(null);
      toast.success(
        t("rakht.companyDeleted", {
          defaultValue: "Company deleted successfully.",
        }),
      );
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("rakht.companyDeleteFailed", {
            defaultValue: "Unable to delete company.",
          }),
        ),
      ),
  });

  const payRemainingMut = useMutation({
    mutationFn: (payload) => api.post("/rakhts/pay-remaining", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rakht-list"] });
      qc.invalidateQueries({ queryKey: ["rakht-payment-history"] });
      toast.success(
        t("rakht.remainingMoneyPaid", {
          defaultValue: "Remaining money paid successfully.",
        }),
      );
      setPayAmount("");
      setPaymentModalOpen(false);
      setPaymentCompany(null);
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("rakht.payRemainingFailed", {
            defaultValue: "Unable to pay remaining money.",
          }),
        ),
      ),
  });

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      companyName: item.companyName || "",
      brandName: item.brandName || "",
      tonQuantity: item.tonQuantity || null,
      tons: (item.tons || []).map((ton) => ({
        id:
          ton.id ||
          `ton_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: ton.name || "",
        colorHex: ton.colorHex || "#94A3B8",
        totalMeters: String(ton.totalMeters ?? ""),
      })),
      totalPrice: String(item.totalPrice ?? ""),
      givenMoney: String(item.givenMoney ?? ""),
    });
    setModal(true);
  };

  const handleTonQtyChange = (option) => {
    const qty = option?.value || 0;
    setForm((prev) => {
      const next = buildTonsForQuantity(prev.tons || [], qty);
      return { ...prev, tonQuantity: qty, tons: next };
    });
  };

  const updateTon = (tonId, field, value) => {
    setForm((prev) => {
      const tons = (prev.tons || []).map((ton) =>
        ton.id === tonId ? { ...ton, [field]: value } : ton,
      );
      return { ...prev, tons };
    });
  };

  const remainingMoney = useMemo(() => {
    const total = parseInt(form.totalPrice, 10) || 0;
    const given = parseInt(form.givenMoney, 10) || 0;
    return Math.max(0, total - given);
  }, [form.totalPrice, form.givenMoney]);

  const pricePerTon = useMemo(() => {
    const total = Number(form.totalPrice || 0);
    const qty = Number(form.tonQuantity || 0);
    if (!Number.isFinite(total) || !Number.isFinite(qty) || qty <= 0) return 0;
    return total / qty;
  }, [form.totalPrice, form.tonQuantity]);

  const todayDisplay = formatSystemDate(new Date(), language);

  const companyOptions = useMemo(() => {
    const unique = [
      ...new Set(rows.map((item) => item.companyName).filter(Boolean)),
    ];
    return unique.map((company) => ({ value: company, label: company }));
  }, [rows]);

  const brandOptions = useMemo(() => {
    const unique = [
      ...new Set(rows.map((item) => item.brandName).filter(Boolean)),
    ];
    return unique.map((brand) => ({ value: brand, label: brand }));
  }, [rows]);

  const paymentStatusOptions = useMemo(
    () => [
      { value: "ALL", label: t("common.all", { defaultValue: "All" }) },
      {
        value: "HAS_REMAINING",
        label: t("rakht.hasRemaining", { defaultValue: "Has Remaining" }),
      },
      {
        value: "PAID",
        label: t("rakht.paid", { defaultValue: "Fully Paid" }),
      },
    ],
    [t],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (filterCompany?.value && item.companyName !== filterCompany.value) {
        return false;
      }
      if (filterBrand?.value && item.brandName !== filterBrand.value) {
        return false;
      }

      const remaining = Math.max(0, Number(item.remainingMoney || 0));
      if (filterStatus?.value === "HAS_REMAINING" && remaining <= 0) {
        return false;
      }
      if (filterStatus?.value === "PAID" && remaining > 0) {
        return false;
      }

      return true;
    });
  }, [rows, filterCompany, filterBrand, filterStatus]);

  const stats = useMemo(() => {
    const totalEntries = filteredRows.length;
    const totalPrice = filteredRows.reduce(
      (sum, row) => sum + Number(row.totalPrice || 0),
      0,
    );
    const totalPaid = filteredRows.reduce(
      (sum, row) => sum + Number(row.givenMoney || 0),
      0,
    );
    const totalRemaining = Math.max(0, totalPrice - totalPaid);
    const totalTons = filteredRows.reduce(
      (sum, row) => sum + Number(row.tonQuantity || 0),
      0,
    );

    return {
      totalEntries,
      totalPrice,
      totalPaid,
      totalRemaining,
      totalTons,
    };
  }, [filteredRows]);

  const paymentSummaries = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      if (!row.companyName) continue;
      const current = map.get(row.companyName) || {
        companyName: row.companyName,
        totalPrice: 0,
        totalPaid: 0,
        remaining: 0,
      };
      current.totalPrice += Number(row.totalPrice || 0);
      current.totalPaid += Number(row.givenMoney || 0);
      current.remaining = Math.max(0, current.totalPrice - current.totalPaid);
      map.set(row.companyName, current);
    }
    return [...map.values()].sort((a, b) =>
      a.companyName.localeCompare(b.companyName),
    );
  }, [rows]);

  const paymentCompanyOptions = useMemo(
    () =>
      paymentSummaries
        .filter((item) => item.remaining > 0)
        .map((item) => ({ value: item.companyName, label: item.companyName })),
    [paymentSummaries],
  );

  const selectedPaymentSummary = useMemo(
    () =>
      paymentSummaries.find(
        (item) => item.companyName === paymentCompany?.value,
      ) || null,
    [paymentSummaries, paymentCompany],
  );

  const payNowLabel = useMemo(
    () => formatSystemDateTime(new Date(), language),
    [paymentModalOpen],
  );

  const submitRemainingPayment = () => {
    if (!paymentCompany?.value) {
      toast.error(
        t("rakht.selectCompanyFirst", {
          defaultValue: "Please select a company first.",
        }),
      );
      return;
    }

    const remaining = Number(selectedPaymentSummary?.remaining || 0);
    const amount = Number(sanitizeIntegerInput(payAmount || "0"));

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(
        t("rakht.enterValidAmount", {
          defaultValue: "Please enter a valid payment amount.",
        }),
      );
      return;
    }

    if (amount > remaining) {
      toast.error(
        t("rakht.paymentExceedsRemaining", {
          defaultValue: "Payment cannot exceed remaining amount.",
        }),
      );
      return;
    }

    payRemainingMut.mutate({
      companyName: paymentCompany.value,
      amount,
    });
  };

  const submit = () => {
    const parsed = rakhtSchema.safeParse({
      ...form,
      tonQuantity: form.tonQuantity,
    });
    if (!parsed.success) {
      toast.error(
        t("rakht.validationError", {
          defaultValue: "Please fill all required fields with valid values.",
        }),
      );
      return;
    }
    saveMut.mutate(parsed.data);
  };

  return (
    <div className="card" style={{ padding: 18 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            flex: "0.78 1 150px",
            minWidth: 136,
            display: "flex",
          }}
        >
          <StatCard
            label={t("rakht.totalRecords", { defaultValue: "Total Records" })}
            value={stats.totalEntries}
            Icon={LuChartColumn}
            accent="#2563EB"
          />
        </div>
        <div
          style={{
            flex: "0.78 1 150px",
            minWidth: 136,
            display: "flex",
          }}
        >
          <StatCard
            label={t("rakht.totalTons", { defaultValue: "Total Tons" })}
            value={stats.totalTons}
            Icon={LuBoxes}
            accent="#0F766E"
          />
        </div>
        <div
          style={{
            flex: "1.28 1 260px",
            minWidth: 235,
            display: "flex",
          }}
        >
          <StatCard
            label={t("rakht.totalPrice", { defaultValue: "Total Price" })}
            value={formatCurrency(Math.round(stats.totalPrice), language)}
            Icon={AfCurrencyIcon}
            accent="#7C3AED"
          />
        </div>
        <div
          style={{
            flex: "1.28 1 260px",
            minWidth: 235,
            display: "flex",
          }}
        >
          <StatCard
            label={t("rakht.givenMoney", { defaultValue: "Given Money" })}
            value={formatCurrency(Math.round(stats.totalPaid), language)}
            Icon={AfCurrencyIcon}
            accent="#15803D"
          />
        </div>
        <div
          style={{
            flex: "1.28 1 260px",
            minWidth: 235,
            display: "flex",
          }}
        >
          <StatCard
            label={t("rakht.remainingMoney", { defaultValue: "Remaining" })}
            value={formatCurrency(Math.round(stats.totalRemaining), language)}
            Icon={AfCurrencyIcon}
            accent="#B45309"
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <p style={{ fontSize: 15, fontWeight: 700 }}>
            {t("rakht.title", { defaultValue: "Rakht Inventory" })}
          </p>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>
            {t("rakht.subtitle", {
              defaultValue: "Manage fabric brands, stock meters, and payments.",
            })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/rakhts/payment-history" className="btn btn-outline">
            <LuHistory size={13} />
            {t("rakht.paymentHistory", { defaultValue: "Payment History" })}
          </Link>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setPaymentModalOpen(true);
                setPayAmount("");
              }}
              className="btn btn-gold"
              style={{ gap: 6 }}
            >
              <AfCurrencyIcon size={13} />
              {t("rakht.giveRemainingMoney", {
                defaultValue: "Give Remaining Money",
              })}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <label className="lbl">
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <LuFilter size={13} />
              {t("rakht.companyName", { defaultValue: "Company Name" })}
            </span>
          </label>
          <Select
            classNamePrefix="rs"
            value={filterCompany}
            onChange={setFilterCompany}
            options={companyOptions}
            isClearable
            placeholder={t("common.all", { defaultValue: "All" })}
          />
        </div>

        <div>
          <label className="lbl">
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <LuFilter size={13} />
              {t("rakht.brandName", { defaultValue: "Brand Name" })}
            </span>
          </label>
          <Select
            classNamePrefix="rs"
            value={filterBrand}
            onChange={setFilterBrand}
            options={brandOptions}
            isClearable
            placeholder={t("common.all", { defaultValue: "All" })}
          />
        </div>

        <div>
          <label className="lbl">
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <LuFilter size={13} />
              {t("rakht.paymentStatus", { defaultValue: "Payment Status" })}
            </span>
          </label>
          <Select
            classNamePrefix="rs"
            value={filterStatus}
            onChange={setFilterStatus}
            options={paymentStatusOptions}
            isSearchable={false}
          />
        </div>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          {t("common.loading")}
        </p>
      ) : filteredRows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
          {t("rakht.empty", { defaultValue: "No Rakht records yet." })}
        </p>
      ) : (
        <div className="tbl-wrap" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("rakht.companyName", { defaultValue: "Company" })}</th>
                <th>{t("rakht.brandName", { defaultValue: "Brand" })}</th>
                <th>{t("rakht.tonQuantity", { defaultValue: "Tons" })}</th>
                <th>
                  {t("rakht.totalPrice", { defaultValue: "Total Price" })}
                </th>
                <th>{t("rakht.givenMoney", { defaultValue: "Given" })}</th>
                <th>
                  {t("rakht.remainingMoney", { defaultValue: "Remaining" })}
                </th>
                <th>{t("rakht.date", { defaultValue: "Date" })}</th>
                <th>{t("common.actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.companyName}</td>
                  <td>{item.brandName}</td>
                  <td>{item.tonQuantity}</td>
                  <td>
                    {formatCurrency(
                      Math.round(Number(item.totalPrice || 0)),
                      language,
                    )}
                  </td>
                  <td>
                    {formatCurrency(
                      Math.round(Number(item.givenMoney || 0)),
                      language,
                    )}
                  </td>
                  <td>
                    {formatCurrency(
                      Math.round(
                        item.remainingMoney ??
                          Math.max(
                            0,
                            (item.totalPrice || 0) - (item.givenMoney || 0),
                          ),
                      ),
                      language,
                    )}
                  </td>
                  <td>
                    {item.date ? formatSystemDate(item.date, language) : "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setViewItemId(item.id)}
                        title={t("common.view", { defaultValue: "View" })}
                      >
                        <LuEye size={12} />
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openEdit(item)}
                      >
                        <LuPencil size={12} />
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: "#DC2626", borderColor: "#fecaca" }}
                        onClick={() => setDeleteItem(item)}
                      >
                        <LuTrash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!viewItemId}
        onClose={() => setViewItemId(null)}
        title={t("rakht.viewDetails", { defaultValue: "Rakht Details" })}
        maxW={1100}
      >
        {isViewLoading || !viewDetails ? (
          <p style={{ fontSize: 13, color: "var(--text3)" }}>
            {t("common.loading")}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--surface2)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 4,
                  }}
                >
                  {t("rakht.companyName", { defaultValue: "Company Name" })}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700 }}>
                  {viewDetails.companyName || "-"}
                </p>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--surface2)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 4,
                  }}
                >
                  {t("rakht.brandName", { defaultValue: "Brand Name" })}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700 }}>
                  {viewDetails.brandName || "-"}
                </p>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--surface2)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 4,
                  }}
                >
                  {t("rakht.tonQuantity", {
                    defaultValue: "Total Ton Quantity",
                  })}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700 }}>
                  {formatNumberLocale(
                    Number(viewDetails.tonQuantity || 0),
                    language,
                  )}
                </p>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--surface2)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 4,
                  }}
                >
                  {t("rakht.totalPrice", { defaultValue: "Total Price" })}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700 }}>
                  {formatAmount(viewDetails.totalPrice)}
                </p>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--surface2)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 4,
                  }}
                >
                  {t("rakht.givenMoney", { defaultValue: "Given Money" })}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700 }}>
                  {formatAmount(viewDetails.givenMoney)}
                </p>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--surface2)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 4,
                  }}
                >
                  {t("rakht.remainingMoney", {
                    defaultValue: "Remaining Money",
                  })}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700 }}>
                  {formatAmount(viewDetails.remainingMoney)}
                </p>
              </div>
            </div>

            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: "var(--text2)",
                }}
              >
                {t("rakht.tonDetails", { defaultValue: "Ton Details" })}
              </p>
              <div className="tbl-wrap" style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t("rakht.ton", { defaultValue: "Ton" })}</th>
                      <th>
                        {t("rakht.tonName", { defaultValue: "Ton Name" })}
                      </th>
                      <th>
                        {t("rakht.tonTotalMeters", {
                          defaultValue: "Total Meters",
                        })}
                      </th>
                      <th>
                        {t("rakht.tonTotalPrice", {
                          defaultValue: "Ton Price",
                        })}
                      </th>
                      <th>
                        {t("rakht.pricePerMeter", {
                          defaultValue: "Price / Meter",
                        })}
                      </th>
                      <th>
                        {t("rakht.consumedMeters", {
                          defaultValue: "Consumed Meters",
                        })}
                      </th>
                      <th>
                        {t("rakht.remainingMeters", {
                          defaultValue: "Remaining Meters",
                        })}
                      </th>
                      <th>
                        {t("rakht.totalProfit", {
                          defaultValue: "Profit Per Ton",
                        })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewDetails.tons || []).map((ton) => (
                      <tr key={ton.id}>
                        <td>{ton.tonIdentifier}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: ton.colorHex || "#94A3B8",
                                border: "1px solid rgba(0,0,0,.12)",
                              }}
                            />
                            {ton.name || "-"}
                          </span>
                        </td>
                        <td>{formatAmount(ton.totalMeters)}</td>
                        <td>{formatAmount(ton.tonPrice)}</td>
                        <td>{formatAmount(ton.pricePerMeter)}</td>
                        <td>{formatAmount(ton.consumedMeters)}</td>
                        <td>{formatAmount(ton.remainingMeters)}</td>
                        <td>{formatAmount(ton.profitGenerated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--surface2)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 4,
                  }}
                >
                  {t("rakht.totalConsumedMeters", {
                    defaultValue: "Total Consumed Meters",
                  })}
                </p>
                <p style={{ fontSize: 15, fontWeight: 700 }}>
                  {formatAmount(viewDetails.summary?.totalConsumedMeters)}
                </p>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--surface2)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 4,
                  }}
                >
                  {t("rakht.totalRemainingMeters", {
                    defaultValue: "Total Remaining Meters",
                  })}
                </p>
                <p style={{ fontSize: 15, fontWeight: 700 }}>
                  {formatAmount(viewDetails.summary?.totalRemainingMeters)}
                </p>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  background: "var(--surface2)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 4,
                  }}
                >
                  {t("rakht.totalProfitGenerated", {
                    defaultValue: "Total Company Profit",
                  })}
                </p>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--success, #15803D)",
                  }}
                >
                  {formatAmount(viewDetails.summary?.totalProfitGenerated)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentCompany(null);
          setPayAmount("");
        }}
        title={t("rakht.giveRemainingMoney", {
          defaultValue: "Give Remaining Money",
        })}
        maxW={580}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="lbl">
              {t("rakht.companyName", { defaultValue: "Company Name" })}
            </label>
            <Select
              classNamePrefix="rs"
              value={paymentCompany}
              onChange={setPaymentCompany}
              options={paymentCompanyOptions}
              placeholder={t("common.select", { defaultValue: "Select" })}
            />
          </div>

          <div>
            <label className="lbl">
              {t("rakht.totalPrice", { defaultValue: "Total Price" })}
            </label>
            <input
              className="inp"
              value={formatCurrency(
                Math.round(Number(selectedPaymentSummary?.totalPrice || 0)),
                language,
              )}
              readOnly
            />
          </div>

          <div>
            <label className="lbl">
              {t("rakht.totalPaidMoney", { defaultValue: "Total Paid Money" })}
            </label>
            <input
              className="inp"
              value={formatCurrency(
                Math.round(Number(selectedPaymentSummary?.totalPaid || 0)),
                language,
              )}
              readOnly
            />
          </div>

          <div>
            <label className="lbl">
              {t("rakht.remainingMoney", { defaultValue: "Remaining Amount" })}
            </label>
            <input
              className="inp"
              value={formatCurrency(
                Math.round(Number(selectedPaymentSummary?.remaining || 0)),
                language,
              )}
              readOnly
            />
          </div>

          <div>
            <label className="lbl">
              {t("rakht.payRemainingAmount", {
                defaultValue: "Pay Remaining Amount",
              })}
            </label>
            <input
              className="inp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={payAmount}
              onChange={(e) =>
                setPayAmount(sanitizeIntegerInput(e.target.value))
              }
            />
          </div>

          <div>
            <label className="lbl">
              {t("rakht.dateTime", { defaultValue: "Date & Time" })}
            </label>
            <input className="inp" value={payNowLabel} readOnly />
          </div>

          <div style={{ display: "flex", justifyContent: "end", gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setPaymentModalOpen(false);
                setPaymentCompany(null);
                setPayAmount("");
              }}
              disabled={payRemainingMut.isPending}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              className="btn btn-gold"
              onClick={submitRemainingPayment}
              disabled={payRemainingMut.isPending || !isAdmin}
            >
              {payRemainingMut.isPending
                ? t("customersPage.saving", { defaultValue: "Saving..." })
                : t("common.save", { defaultValue: "Save" })}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
          setEditing(null);
        }}
        title={t("rakht.editTitle", { defaultValue: "Edit Rakht" })}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label className="lbl">
              {t("rakht.companyName", { defaultValue: "Company Name" })}
            </label>
            <div className="iw">
              <LuFactory size={14} className="ico" />
              <input
                className="inp"
                value={form.companyName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, companyName: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="lbl">
              {t("rakht.brandName", { defaultValue: "Brand Name" })}
            </label>
            <div className="iw">
              <LuFactory size={14} className="ico" />
              <input
                className="inp"
                value={form.brandName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, brandName: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="lbl">
              {t("rakht.tonQuantity", { defaultValue: "Ton Quantity" })}
            </label>
            <Select
              classNamePrefix="rs"
              options={TON_QTY_OPTIONS}
              value={
                form.tonQuantity
                  ? { value: form.tonQuantity, label: String(form.tonQuantity) }
                  : null
              }
              onChange={handleTonQtyChange}
              placeholder={t("common.select", { defaultValue: "Select" })}
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: 40,
                  borderRadius: 10,
                  borderColor: state.isFocused
                    ? "var(--primary)"
                    : "var(--border)",
                  boxShadow: "none",
                }),
                menu: (base) => ({ ...base, zIndex: 20 }),
              }}
            />
          </div>

          {form.tons.length > 0 && (
            <div style={{ display: "grid", gap: 12 }}>
              <p
                style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}
              >
                {t("rakht.tonDetails", { defaultValue: "Ton Details" })}
              </p>
              {form.tons.map((ton, idx) => (
                <div
                  key={ton.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "grid",
                    gap: 10,
                    background: "var(--surface2)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text3)",
                    }}
                  >
                    {t("rakht.ton", { defaultValue: "Ton" })} #{idx + 1}
                  </p>

                  <div>
                    <label className="lbl">
                      {t("rakht.tonName", { defaultValue: "Name" })}
                    </label>
                    <div className="iw">
                      <input
                        className="inp"
                        value={ton.name}
                        onChange={(e) =>
                          updateTon(ton.id, "name", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: 10,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <label className="lbl">
                        {t("rakht.tonColor", { defaultValue: "Color" })}
                      </label>
                      <input
                        type="color"
                        aria-label={t("rakht.tonColor", {
                          defaultValue: "Color",
                        })}
                        value={ton.colorHex}
                        onChange={(e) =>
                          updateTon(ton.id, "colorHex", e.target.value)
                        }
                        style={{
                          display: "block",
                          width: 48,
                          height: 40,
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: 4,
                          cursor: "pointer",
                          background: "transparent",
                        }}
                      />
                    </div>
                    <div>
                      <label className="lbl">
                        {t("rakht.tonTotalMeters", {
                          defaultValue: "Total Meters",
                        })}
                      </label>
                      <div className="iw">
                        <input
                          className="inp"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={ton.totalMeters}
                          onChange={(e) =>
                            updateTon(
                              ton.id,
                              "totalMeters",
                              sanitizeIntegerInput(e.target.value),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {pricePerTon > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                        padding: "10px 8px",
                        background: "rgba(37,99,235,.05)",
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text3)",
                            marginBottom: 4,
                          }}
                        >
                          {t("rakht.pricePerMeter", {
                            defaultValue: "Price per Meter",
                          })}
                        </p>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--primary)",
                          }}
                        >
                          {(parseInt(ton.totalMeters, 10) || 0) > 0
                            ? (
                                pricePerTon /
                                (parseInt(ton.totalMeters, 10) || 1)
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text3)",
                            marginBottom: 4,
                          }}
                        >
                          {t("rakht.tonTotalPrice", {
                            defaultValue: "Ton Total Price",
                          })}
                        </p>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--success, #15803D)",
                          }}
                        >
                          {pricePerTon.toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <label className="lbl">
                {t("rakht.totalPrice", { defaultValue: "Total Price" })}
              </label>
              <div className="iw">
                <AfCurrencyIcon size={14} className="ico" />
                <input
                  className="inp"
                  type="number"
                  min="0"
                  step="1"
                  value={form.totalPrice}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      totalPrice: sanitizeIntegerInput(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="lbl">
                {t("rakht.givenMoney", { defaultValue: "Given Money" })}
              </label>
              <div className="iw">
                <AfCurrencyIcon size={14} className="ico" />
                <input
                  className="inp"
                  type="number"
                  min="0"
                  step="1"
                  value={form.givenMoney}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      givenMoney: sanitizeIntegerInput(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <label className="lbl">
              {t("rakht.remainingMoney", { defaultValue: "Remaining Money" })}
            </label>
            <div
              className="iw"
              style={{ background: "var(--surface2)", opacity: 0.8 }}
            >
              <AfCurrencyIcon size={14} className="ico" />
              <input
                className="inp"
                readOnly
                value={remainingMoney.toLocaleString("en-US")}
                style={{ cursor: "default" }}
              />
            </div>
          </div>

          <div>
            <label className="lbl">
              {t("rakht.date", { defaultValue: "Date" })}
            </label>
            <div
              className="iw"
              style={{ background: "var(--surface2)", opacity: 0.8 }}
            >
              <LuCalendar size={14} className="ico" />
              <input
                className="inp"
                readOnly
                value={
                  editing?.date
                    ? formatSystemDate(editing.date, language)
                    : todayDisplay
                }
                style={{ cursor: "default" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={submit}
              className="btn btn-gold"
              style={{ flex: 1 }}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending
                ? t("customersPage.saving", { defaultValue: "Saving..." })
                : t("common.save")}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => {
          if (!deleteItem) return;
          delCompanyMut.mutate(deleteItem.companyName);
        }}
        title={t("rakht.deleteCompany", { defaultValue: "Delete Company" })}
        message={t("rakht.deleteCompanyWarning", {
          defaultValue:
            "Deleting this company will permanently remove all its payment history. This action cannot be undone.",
        })}
        itemName={deleteItem?.companyName || ""}
        isPending={delCompanyMut.isPending}
      />
    </div>
  );
}
