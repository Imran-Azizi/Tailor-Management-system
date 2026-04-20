import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuFactory, LuPalette, LuRuler, LuWallet } from "react-icons/lu";
import api from "../../lib/api.js";
import { resolveRakhtColorHex } from "../../lib/rakhtColors.js";
import { Field } from "../ui/index.jsx";

const numberText = z
  .string()
  .min(1)
  .refine((value) => Number(value) >= 0 && Number.isFinite(Number(value)), {
    message: "Invalid number",
  });

export default function Step2RakhtSelection({ onNext, onBack, initial = {} }) {
  const { t } = useTranslation();

  const schema = z.object({
    brandName: z.string().min(1),
    rakhtId: z.string().min(1),
    requiredMeters: numberText.refine((value) => Number(value) > 0, {
      message: t("createOrder.requiredMetersPositive", {
        defaultValue: "Required meters must be greater than 0",
      }),
    }),
    piecePrice: numberText,
  });

  const { data: rakhtRows = [], isLoading } = useQuery({
    queryKey: ["rakht-list"],
    queryFn: () => api.get("/rakhts").then((res) => res.data),
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      brandName: initial?.rakhtSelection?.rakhtBrandName || "",
      rakhtId: initial?.rakhtSelection?.rakhtId || "",
      requiredMeters:
        initial?.rakhtSelection?.requiredMeters !== undefined
          ? String(initial.rakhtSelection.requiredMeters)
          : "",
      piecePrice:
        initial?.rakhtSelection?.piecePrice !== undefined
          ? String(initial.rakhtSelection.piecePrice)
          : "",
    },
  });

  const brandName = watch("brandName");
  const rakhtId = watch("rakhtId");
  const requiredMeters = Number(watch("requiredMeters") || 0);

  const brandOptions = useMemo(() => {
    const seen = new Set();
    return (rakhtRows || [])
      .filter((item) => {
        if (!item?.brandName || seen.has(item.brandName)) return false;
        seen.add(item.brandName);
        return true;
      })
      .map((item) => item.brandName)
      .sort((left, right) => left.localeCompare(right));
  }, [rakhtRows]);

  const filteredByBrand = useMemo(
    () => (rakhtRows || []).filter((item) => item.brandName === brandName),
    [rakhtRows, brandName],
  );

  const selectedRakht = useMemo(
    () => (rakhtRows || []).find((item) => item.id === rakhtId) || null,
    [rakhtRows, rakhtId],
  );

  const remainingMeters = selectedRakht
    ? Number(selectedRakht.availableMeters || 0) - requiredMeters
    : 0;

  const onSubmit = (values) => {
    const selected = (rakhtRows || []).find(
      (item) => item.id === values.rakhtId,
    );

    if (!selected) {
      toast.error(
        t("createOrder.selectRakhtFirst", {
          defaultValue: "Please select a Rakht option first.",
        }),
      );
      return;
    }

    const requestedMeters = Number(values.requiredMeters || 0);
    const currentAvailable = Number(selected.availableMeters || 0);

    if (requestedMeters > currentAvailable) {
      toast.error(
        t("createOrder.insufficientRakhtMeters", {
          available: currentAvailable,
          defaultValue: `Insufficient meters. Available: ${currentAvailable}`,
        }),
      );
      return;
    }

    onNext({
      rakhtSelection: {
        rakhtId: selected.id,
        rakhtBrandName: selected.brandName,
        rakhtColor: selected.color,
        rakhtColorHex: resolveRakhtColorHex(selected.color, selected.colorHex),
        requiredMeters: requestedMeters,
        piecePrice: Number(values.piecePrice || 0),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {t("createOrder.rakhtSelection", { defaultValue: "Rakht Selection" })}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 18 }}>
        {t("createOrder.rakhtSelectionCopy", {
          defaultValue:
            "Select fabric stock for this order and verify available meters before continuing.",
        })}
      </p>

      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 18 }}>
          {t("common.loading")}
        </p>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field
          label={t("rakht.brandName", { defaultValue: "Brand Name" })}
          error={errors.brandName?.message}
          required
        >
          <div className="iw">
            <LuFactory size={14} className="ico" />
            <select
              className={`inp${errors.brandName ? " err" : ""}`}
              {...register("brandName")}
              onChange={(event) => {
                const { value } = event.target;
                setValue("brandName", value, { shouldValidate: true });
                setValue("rakhtId", "", { shouldValidate: true });
                setValue("piecePrice", "", { shouldValidate: false });
              }}
            >
              <option value="">
                {t("common.select", { defaultValue: "Select" })}
              </option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field
          label={t("rakht.color", { defaultValue: "Color" })}
          error={errors.rakhtId?.message}
          required
        >
          <div className="iw">
            <LuPalette size={14} className="ico" />
            <select
              className={`inp${errors.rakhtId ? " err" : ""}`}
              {...register("rakhtId")}
              onChange={(event) => {
                const { value } = event.target;
                const selected = filteredByBrand.find(
                  (item) => item.id === value,
                );
                setValue("rakhtId", value, { shouldValidate: true });
                if (selected) {
                  setValue("piecePrice", String(Number(selected.price || 0)), {
                    shouldValidate: true,
                  });
                }
              }}
              disabled={!brandName}
            >
              <option value="">
                {t("common.select", { defaultValue: "Select" })}
              </option>
              {filteredByBrand.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.color} ({item.companyName})
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field
          label={t("rakht.requiredMeters", { defaultValue: "Required Meters" })}
          error={errors.requiredMeters?.message}
          required
        >
          <div className="iw">
            <LuRuler size={14} className="ico" />
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={`inp${errors.requiredMeters ? " err" : ""}`}
              {...register("requiredMeters")}
            />
          </div>
        </Field>

        <Field
          label={t("rakht.piecePrice", { defaultValue: "Piece Price" })}
          error={errors.piecePrice?.message}
          required
        >
          <div className="iw">
            <LuWallet size={14} className="ico" />
            <input
              type="number"
              min="0"
              step="0.01"
              className={`inp${errors.piecePrice ? " err" : ""}`}
              {...register("piecePrice")}
            />
          </div>
        </Field>
      </div>

      {selectedRakht ? (
        <div className="info-box ib-gold" style={{ marginTop: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10,
            }}
          >
            <span>
              {t("rakht.availableMeters", { defaultValue: "Available" })}:{" "}
              {Number(selectedRakht.availableMeters || 0).toFixed(2)}
            </span>
            <span>
              {t("rakht.remainingAfterSelection", {
                defaultValue: "Remaining after selection",
              })}
              : {Math.max(0, remainingMeters).toFixed(2)}
            </span>
            <span>
              {t("rakht.companyName", { defaultValue: "Company" })}:{" "}
              {selectedRakht.companyName}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  border: "1px solid rgba(15,23,42,0.15)",
                  background:
                    resolveRakhtColorHex(
                      selectedRakht.color,
                      selectedRakht.colorHex,
                    ) || "#94A3B8",
                }}
              />
              {t("rakht.color", { defaultValue: "Color" })}:{" "}
              {selectedRakht.color}
            </span>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline"
          style={{ flex: 1 }}
        >
          {t("common.back")}
        </button>
        <button type="submit" className="btn btn-gold" style={{ flex: 1 }}>
          {t("common.continue")}
        </button>
      </div>
    </form>
  );
}
