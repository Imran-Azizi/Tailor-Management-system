import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LuFactory, LuBadgeDollarSign, LuCalendar } from "react-icons/lu";
import Select from "react-select";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { PageHeader } from "../components/ui/index.jsx";
import {
  TON_QTY_OPTIONS,
  buildTonsForQuantity,
  rakhtSchema,
  emptyForm,
  sanitizeIntegerInput,
} from "../components/rakht/rakhtFormConfig.js";

export default function CreateRakht() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm());

  const saveMut = useMutation({
    mutationFn: (payload) => api.post("/rakhts", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rakht-list"] });
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

  const submit = (event) => {
    event.preventDefault();
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
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
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
                    setForm((prev) => ({
                      ...prev,
                      companyName: e.target.value,
                    }))
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
                    setForm((prev) => ({ ...prev, brandName: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
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
                      : {tonPrice > 0 ? tonPrice.toLocaleString() : "-"}
                    </span>
                    <span>
                      {t("rakht.purchasePricePerMeter", {
                        defaultValue: "Price per meter (cost)",
                      })}
                      :{" "}
                      {tonPrice > 0 && Number(ton.totalMeters || 0) > 0
                        ? (
                            tonPrice / Number(ton.totalMeters || 0)
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "-"}
                    </span>
                  </div>
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
            <div>
              <label className="lbl">
                {t("rakht.totalPrice", { defaultValue: "Total Price" })}
              </label>
              <div className="iw">
                <LuBadgeDollarSign size={14} className="ico" />
                <input
                  className="inp"
                  type="number"
                  min="0"
                  step="1"
                  value={form.totalPrice}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
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
                <LuBadgeDollarSign size={14} className="ico" />
                <input
                  className="inp"
                  type="number"
                  min="0"
                  step="1"
                  value={form.givenMoney}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      givenMoney: sanitizeIntegerInput(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="lbl">
                {t("rakht.remainingMoney", { defaultValue: "Remaining Money" })}
              </label>
              <div
                className="iw"
                style={{ background: "var(--surface2)", opacity: 0.85 }}
              >
                <LuBadgeDollarSign size={14} className="ico" />
                <input
                  className="inp"
                  readOnly
                  value={remainingMoney.toLocaleString()}
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
                  value={new Date().toLocaleDateString()}
                  style={{ cursor: "default" }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
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
