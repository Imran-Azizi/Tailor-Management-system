import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LuFactory, LuCalendar } from "react-icons/lu";
import Select from "react-select";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatSystemDate } from "../lib/locale.js";
import { formatCurrency } from "../lib/currency.js";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import { Field, PageHeader } from "../components/ui/index.jsx";
import {
  TON_QTY_OPTIONS,
  buildTonsForQuantity,
  makeRakhtSchema,
  emptyForm,
  sanitizeIntegerInput,
} from "../components/rakht/rakhtFormConfig.js";
import { mapZodFieldErrors, nestFieldErrors } from "../lib/toast.js";

export default function CreateRakht() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const rakhtSchema = useMemo(() => makeRakhtSchema(t), [t]);

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev?.[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const saveMut = useMutation({
    mutationFn: (payload) => api.post("/rakhts", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rakht-list"] });
      qc.invalidateQueries({ queryKey: ["rakht-list-company-options"] });
      qc.invalidateQueries({ queryKey: ["rakht-payment-history-page"] });
      toast.success(t("rakht.created", { defaultValue: "Rakht created." }));
      navigate("/rakhts");
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("rakht.saveFailed", { defaultValue: "Unable to save Rakht." }),
        ),
      ),
  });

  const remainingMoney = useMemo(() => {
    const total = parseInt(form.totalPrice, 10) || 0;
    const given = parseInt(form.givenMoney, 10) || 0;
    return Math.max(0, total - given);
  }, [form.totalPrice, form.givenMoney]);

  const tonPrice = useMemo(() => {
    const total = Number(form.totalPrice || 0);
    const qty = Number(form.tonQuantity || 0);
    if (!Number.isFinite(total) || !Number.isFinite(qty) || qty <= 0) return 0;
    return total / qty;
  }, [form.totalPrice, form.tonQuantity]);
  const hasTotalPrice = Number(form.totalPrice || 0) > 0;

  const handleTonQtyChange = (option) => {
    const qty = option?.value || 0;
    clearFieldError("tonQuantity");
    clearFieldError("tons");
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
    setFieldErrors((errors) => {
      if (!errors?.tons) return errors;
      const tonIndex = form.tons.findIndex((ton) => ton.id === tonId);
      if (tonIndex < 0) return errors;
      const idxKey = String(tonIndex);
      if (!errors.tons[idxKey]?.[field] && !errors.tons[tonIndex]?.[field]) {
        return errors;
      }
      const nextTons = { ...errors.tons };
      nextTons[idxKey] = { ...(nextTons[idxKey] || {}) };
      delete nextTons[idxKey][field];
      if (!Object.keys(nextTons[idxKey]).length) delete nextTons[idxKey];
      const next = { ...errors, tons: nextTons };
      if (!Object.keys(nextTons).length) delete next.tons;
      return next;
    });
  };

  const submit = (event) => {
    event.preventDefault();
    const parsed = rakhtSchema.safeParse({
      ...form,
      tonQuantity: form.tonQuantity,
    });

    if (!parsed.success) {
      setFieldErrors(nestFieldErrors(mapZodFieldErrors(parsed.error)));
      return;
    }

    setFieldErrors({});
    saveMut.mutate(parsed.data);
  };

  const tonError = (index, key) =>
    fieldErrors?.tons?.[index]?.[key] || fieldErrors?.tons?.[String(index)]?.[key];

  return (
    <div className="page">
      <div
        style={{
          width: "100%",
          maxWidth: 880,
          margin: "0 auto",
        }}
      >
        <PageHeader
          title={t("rakht.addTitle", { defaultValue: "Create Rakht" })}
          subtitle={t("rakht.createSubtitle", {
            defaultValue:
              "Create Rakht records with tons, stock meters, and payment details.",
          })}
        />

        <form
          className="card"
          style={{
            padding: 20,
            width: "100%",
            maxWidth: 820,
            margin: "0 auto",
          }}
          onSubmit={submit}
          noValidate
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            <Field
              label={t("rakht.companyName", { defaultValue: "Company Name" })}
              error={fieldErrors.companyName}
              required
            >
              <div className="iw">
                <LuFactory size={14} className="ico" />
                <input
                  className={`inp${fieldErrors.companyName ? " inp-err" : ""}`}
                  value={form.companyName}
                  onChange={(e) => {
                    clearFieldError("companyName");
                    setForm((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }));
                  }}
                />
              </div>
            </Field>

            <Field
              label={t("rakht.brandName", { defaultValue: "Brand Name" })}
              error={fieldErrors.brandName}
              required
            >
              <div className="iw">
                <LuFactory size={14} className="ico" />
                <input
                  className={`inp${fieldErrors.brandName ? " inp-err" : ""}`}
                  value={form.brandName}
                  onChange={(e) => {
                    clearFieldError("brandName");
                    setForm((prev) => ({ ...prev, brandName: e.target.value }));
                  }}
                />
              </div>
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <Field
              label={t("rakht.tonQuantity", { defaultValue: "Ton Quantity" })}
              error={fieldErrors.tonQuantity || (typeof fieldErrors.tons === "string" ? fieldErrors.tons : null)}
              required
            >
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
                    borderColor: fieldErrors.tonQuantity
                      ? "var(--danger)"
                      : state.isFocused
                        ? "var(--primary)"
                        : "var(--border)",
                    boxShadow: "none",
                  }),
                  menu: (base) => ({ ...base, zIndex: 20 }),
                }}
              />
            </Field>
          </div>

          {form.tons.length > 0 && (
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
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

                  <Field
                    label={t("rakht.tonName", {
                      defaultValue: "Ton Color Name",
                    })}
                    error={tonError(idx, "name")}
                    required
                  >
                    <div className="iw">
                      <input
                        className={`inp${tonError(idx, "name") ? " inp-err" : ""}`}
                        value={ton.name}
                        onChange={(e) =>
                          updateTon(ton.id, "name", e.target.value)
                        }
                      />
                    </div>
                  </Field>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: 10,
                      alignItems: "end",
                    }}
                  >
                    <Field
                      label={t("rakht.tonColor", { defaultValue: "Color" })}
                      error={tonError(idx, "colorHex")}
                    >
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
                          border: `1px solid ${tonError(idx, "colorHex") ? "var(--danger)" : "var(--border)"}`,
                          borderRadius: 10,
                          padding: 4,
                          cursor: "pointer",
                          background: "transparent",
                        }}
                      />
                    </Field>
                    <Field
                      label={t("rakht.tonTotalMeters", {
                        defaultValue: "Total Meters",
                      })}
                      error={tonError(idx, "totalMeters")}
                      required
                    >
                      <div className="iw">
                        <input
                          className={`inp${tonError(idx, "totalMeters") ? " inp-err" : ""}`}
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
                    </Field>
                  </div>

                  {hasTotalPrice ? (
                    <div
                      className="info-box ib-gold"
                      style={{
                        marginTop: 2,
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 8,
                      }}
                    >
                      <span>
                        {t("rakht.tonTotalPrice", {
                          defaultValue: "Total price of this ton",
                        })}
                        : {formatCurrency(tonPrice, language)}
                      </span>
                      <span>
                        {t("rakht.purchasePricePerMeter", {
                          defaultValue: "Price per meter (cost)",
                        })}
                        :{" "}
                        {tonPrice > 0 && Number(ton.totalMeters || 0) > 0
                          ? formatCurrency(
                              tonPrice / Number(ton.totalMeters || 0),
                              language,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )
                          : "-"}
                      </span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <Field
              label={t("rakht.totalPrice", { defaultValue: "Total Price" })}
              error={fieldErrors.totalPrice}
            >
              <div className="iw">
                <AfCurrencyIcon size={14} className="ico" />
                <input
                  className={`inp${fieldErrors.totalPrice ? " inp-err" : ""}`}
                  type="number"
                  min="0"
                  step="1"
                  value={form.totalPrice}
                  onChange={(e) => {
                    clearFieldError("totalPrice");
                    clearFieldError("givenMoney");
                    setForm((prev) => ({
                      ...prev,
                      totalPrice: sanitizeIntegerInput(e.target.value),
                    }));
                  }}
                />
              </div>
            </Field>
            <Field
              label={t("rakht.givenMoney", { defaultValue: "Given Money" })}
              error={fieldErrors.givenMoney}
            >
              <div className="iw">
                <AfCurrencyIcon size={14} className="ico" />
                <input
                  className={`inp${fieldErrors.givenMoney ? " inp-err" : ""}`}
                  type="number"
                  min="0"
                  step="1"
                  value={form.givenMoney}
                  onChange={(e) => {
                    clearFieldError("givenMoney");
                    setForm((prev) => ({
                      ...prev,
                      givenMoney: sanitizeIntegerInput(e.target.value),
                    }));
                  }}
                />
              </div>
            </Field>
            <div>
              <label className="lbl">
                {t("rakht.remainingMoney", { defaultValue: "Remaining Money" })}
              </label>
              <div
                className="iw"
                style={{ background: "var(--surface2)", opacity: 0.85 }}
              >
                <AfCurrencyIcon size={14} className="ico" />
                <input
                  className="inp"
                  readOnly
                  value={formatCurrency(remainingMoney, language)}
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
                style={{ background: "var(--surface2)", opacity: 0.85 }}
              >
                <LuCalendar size={14} className="ico" />
                <input
                  className="inp"
                  readOnly
                  value={formatSystemDate(new Date(), language)}
                  style={{ cursor: "default" }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "end",
              gap: 10,
              marginTop: 18,
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/rakhts")}
              className="btn btn-outline"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-gold"
              disabled={saveMut.isPending}
            >
              {saveMut.isPending
                ? t("customersPage.saving", { defaultValue: "Saving..." })
                : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
