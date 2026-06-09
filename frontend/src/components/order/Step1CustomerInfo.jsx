import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { LuUser, LuPhone } from "react-icons/lu";
import { Field } from "../ui/index.jsx";

export default function Step1CustomerInfo({ onNext, initial = {} }) {
  const { t } = useTranslation();
  const schema = z.object({
    firstName: z.string().optional(),
    phoneNumber: z.string().optional(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: initial.firstName || "",
      phoneNumber: initial.phoneNumber || "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
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
        >
          <div className="iw">
            <LuPhone size={14} className="ico" />
            <input
              {...register("phoneNumber")}
              className={`inp${errors.phoneNumber ? " err" : ""}`}
              placeholder={t("createOrder.phoneNumber")}
              type="tel"
            />
          </div>
        </Field>
      </div>

      <button
        type="submit"
        className="btn btn-gold"
        style={{ width: "100%", height: 44 }}
      >
        {t("createOrder.continueToOrderTypes")}
      </button>

    </form>
  );
}
