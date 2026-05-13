import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/index.jsx";

const EMPTY_FORM = {
  name: "",
  brand: "",
  code: "",
  quantity: "1",
  originalPrice: "",
  notes: "",
};

export default function ItemModal({
  open,
  onClose,
  onSave,
  initial,
  category,
  isPending,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      initial
        ? {
            name: initial.name || "",
            brand: initial.brand || "",
            code: initial.code || "",
            quantity: String(initial.quantity ?? 0),
            originalPrice: String(initial.originalPrice ?? ""),
            notes: initial.notes || "",
          }
        : EMPTY_FORM,
    );
  }, [initial, open]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    const brand = form.brand.trim();
    const code = form.code.trim().toUpperCase();
    const quantity = Number(form.quantity);
    const originalPrice = Number(form.originalPrice);

    if (!name || !brand || !code) {
      setError(
        t("items.validation.required", {
          defaultValue: "Item name, brand, and code are required.",
        }),
      );
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError(
        t("items.validation.quantity", {
          defaultValue: "Quantity must be a valid whole number.",
        }),
      );
      return;
    }
    if (!Number.isFinite(originalPrice) || originalPrice < 0) {
      setError(
        t("items.validation.price", {
          defaultValue: "Original price must be a valid amount.",
        }),
      );
      return;
    }

    onSave({
      type: category.key,
      name,
      brand,
      code,
      quantity,
      originalPrice,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        initial
          ? t("items.editTitle", { defaultValue: "Edit Item" })
          : t("items.addTitle", { defaultValue: "Add Item" })
      }
      maxW={720}
    >
      <div className="items-form">
        {error ? <div className="info-box ib-red">{error}</div> : null}

        <div className="items-form-grid">
          <label className="items-field">
            <span>{t("items.fields.name", { defaultValue: "Item Name" })}</span>
            <input
              className="inp"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label className="items-field">
            <span>{t("items.fields.brand", { defaultValue: "Brand Name" })}</span>
            <input
              className="inp"
              value={form.brand}
              onChange={(event) => update("brand", event.target.value)}
            />
          </label>
          <label className="items-field">
            <span>{t("items.fields.code", { defaultValue: "Code" })}</span>
            <input
              className="inp"
              value={form.code}
              onChange={(event) => update("code", event.target.value)}
              style={{ textTransform: "uppercase" }}
            />
          </label>
          <label className="items-field">
            <span>{t("items.fields.quantity", { defaultValue: "Quantity" })}</span>
            <input
              className="inp"
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(event) => update("quantity", event.target.value)}
            />
          </label>
          <label className="items-field">
            <span>
              {t("items.fields.originalPrice", {
                defaultValue: "Original Price",
              })}
            </span>
            <input
              className="inp"
              type="number"
              min="0"
              value={form.originalPrice}
              onChange={(event) => update("originalPrice", event.target.value)}
            />
          </label>
          <label className="items-field items-field--wide">
            <span>{t("items.fields.notes", { defaultValue: "Optional Notes" })}</span>
            <textarea
              className="inp"
              rows={3}
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </label>
        </div>

        <div className="items-modal-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={isPending}
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            className="btn btn-gold"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending
              ? t("common.saving", { defaultValue: "Saving..." })
              : t("common.save", { defaultValue: "Save" })}
          </button>
        </div>
      </div>
    </Modal>
  );
}
