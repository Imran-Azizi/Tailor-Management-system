import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/index.jsx";

const EMPTY_FORM = {
  name: "",
  isActive: true,
};

export default function ItemCategoryModal({
  open,
  onClose,
  onSave,
  initial,
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
            isActive: initial.isActive !== false,
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
    if (!name) {
      setError(
        t("items.categories.validation.name", {
          defaultValue: "Category name is required.",
        }),
      );
      return;
    }

    const payload = { name };
    if (initial) {
      payload.isActive = form.isActive;
    }

    onSave(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        initial
          ? t("items.categories.editTitle", { defaultValue: "Edit Category" })
          : t("items.categories.addTitle", { defaultValue: "Add Category" })
      }
      maxW={480}
      overlayClassName="item-modal-overlay"
      boxClassName="item-modal-box"
      bodyClassName="item-modal-body"
    >
      <div className="items-form">
        {error ? (
          <div className="info-box ib-red" role="alert" aria-live="polite">
            {error}
          </div>
        ) : null}

        <div className="items-form-grid">
          <label className="items-field items-field--wide">
            <span>
              {t("items.categories.fields.name", {
                defaultValue: "Category Name",
              })}
            </span>
            <input
              className="inp"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              autoFocus
            />
          </label>

          {initial ? (
            <label className="items-field items-field--wide">
              <span>
                {t("items.categories.fields.status", { defaultValue: "Status" })}
              </span>
              <select
                className="inp"
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  update("isActive", event.target.value === "active")
                }
              >
                <option value="active">
                  {t("items.categories.status.active", {
                    defaultValue: "Active",
                  })}
                </option>
                <option value="inactive">
                  {t("items.categories.status.inactive", {
                    defaultValue: "Inactive",
                  })}
                </option>
              </select>
            </label>
          ) : null}
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
