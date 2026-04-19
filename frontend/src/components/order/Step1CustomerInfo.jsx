import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { LuUser, LuPhone, LuSearch } from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../../lib/api.js";
import { getApiErrorMessage } from "../../lib/feedback.js";
import { normalizePhone } from "../../lib/normalize.js";
import { Field } from "../ui/index.jsx";

export default function Step1CustomerInfo({ onNext, initial = {} }) {
  const { t } = useTranslation();
  const [isSearching, setIsSearching] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  const schema = z.object({
    customerId: z.string().optional(),
    firstName: z
      .string()
      .min(
        1,
        t("createOrder.fieldRequired", { field: t("createOrder.firstName") }),
      ),
    phoneNumber: z
      .string()
      .min(
        7,
        t("createOrder.fieldRequired", { field: t("createOrder.phoneNumber") }),
      ),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: initial.customerId || "",
      firstName: initial.firstName || "",
      phoneNumber: initial.phoneNumber || "",
    },
  });
  const phoneNumber = watch("phoneNumber");
  const phoneNumberField = register("phoneNumber", {
    onBlur: () => handlePhoneSearch({ silent: true }),
    onChange: (e) => {
      const current = normalizePhone(e.target.value || "");
      const matched = normalizePhone(matchedCustomer?.phoneNumber || "");
      if (matchedCustomer && current && current !== matched) {
        setMatchedCustomer(null);
        setValue("customerId", "", { shouldDirty: true });
      }
    },
  });

  async function handlePhoneSearch({ silent = false } = {}) {
    const raw = (phoneNumber || "").trim();
    const normalized = normalizePhone(raw) || "";

    // require at least 7 digits for a valid phone lookup
    const digitCount = (normalized.replace(/\D/g, "") || "").length;
    if (digitCount < 7) {
      if (!silent) {
        toast.error(
          t("createOrder.fieldRequired", {
            field: t("createOrder.phoneNumber"),
          }),
        );
      }
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await api.get("/customers/search/phone", {
        params: { phone: normalized },
      });
      const customer = data?.customer;

      if (!customer) {
        setMatchedCustomer(null);
        setValue("customerId", "");
        if (!silent) toast.error(t("createOrder.customerNotFound"));
        return;
      }

      setValue("customerId", customer.id || "", {
        shouldDirty: true,
      });
      setValue("firstName", customer.firstName || "", {
        shouldValidate: true,
        shouldDirty: true,
      });
      // prefer server value, but fall back to the normalized input
      setValue("phoneNumber", customer.phoneNumber || normalized, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setMatchedCustomer(customer);
      if (!silent) toast.success(t("createOrder.customerFound"));
    } catch (error) {
      setMatchedCustomer(null);
      setValue("customerId", "");
      if (!silent) {
        toast.error(
          getApiErrorMessage(error, t("createOrder.customerLookupFailed")),
        );
      }
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <style>{`
        .search-btn{ width:40px; height:40px; padding:0; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; background:var(--surface); border:1px solid var(--border2); color:var(--primary); transition:all .14s ease; }
        .search-btn:hover:not(:disabled){ background:var(--primary); color:#fff; transform:translateY(-2px); box-shadow:0 8px 20px rgba(37,99,235,0.10); }
        .search-btn:active:not(:disabled){ transform:translateY(0); box-shadow:none }
        .search-btn:disabled{ opacity:.6; pointer-events:none }
        .search-btn:focus-visible{ outline:2px solid rgba(37,99,235,0.14); outline-offset:3px; border-color:var(--primary) }
        .search-spinner{ width:16px; height:16px; border:2px solid rgba(37,99,235,0.15); border-top-color: var(--primary); border-radius:50%; animation: spin .7s linear infinite; display:inline-block }
        @keyframes spin{ to { transform: rotate(360deg); } }
      `}</style>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
        {t("createOrder.customerInfo")}
      </h2>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        {t("createOrder.customerInfoCopy")}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 18,
          marginBottom: 20,
        }}
      >
        <Field
          label={t("createOrder.firstName")}
          error={errors.firstName?.message}
          required
        >
          <div className="iw">
            <LuUser size={14} className="ico" />
            <input
              {...register("firstName")}
              className={`inp${errors.firstName ? " err" : ""}`}
              placeholder={t("createOrder.firstName")}
              autoFocus
            />
          </div>
        </Field>

        <Field
          label={t("createOrder.phoneNumber")}
          error={errors.phoneNumber?.message}
          required
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div className="iw">
              <LuPhone size={14} className="ico" />
              <input
                {...phoneNumberField}
                className={`inp${errors.phoneNumber ? " err" : ""}`}
                placeholder={t("createOrder.phoneNumber")}
                type="tel"
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary search-btn"
              onClick={handlePhoneSearch}
              disabled={isSearching}
              aria-label={t("common.search")}
            >
              {isSearching ? (
                <span className="search-spinner" />
              ) : (
                <LuSearch size={14} style={{ color: "currentColor" }} />
              )}
            </button>
          </div>
        </Field>
      </div>

      {matchedCustomer ? (
        <div className="info-box ib-gold" style={{ marginBottom: 20 }}>
          <span>
            {t("createOrder.customerFoundSummary", {
              name: matchedCustomer.firstName || "-",
              phone: matchedCustomer.phoneNumber || "-",
            })}
          </span>
        </div>
      ) : null}

      <button
        type="submit"
        className="btn btn-gold"
        style={{ width: "100%", height: 44 }}
      >
        {t("createOrder.continueToOrderTypes")}
      </button>

      <input type="hidden" {...register("customerId")} />
    </form>
  );
}
