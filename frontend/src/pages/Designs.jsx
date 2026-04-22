import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuFactory,
  LuBadgeDollarSign,
  LuCalendar,
} from "react-icons/lu";
import Select from "react-select";
import { z } from "zod";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import {
  PageHeader,
  Modal,
  ConfirmDeleteModal,
} from "../components/ui/index.jsx";

const MODELS = [
  { key: "yakhan", label: "یخن", color: "#2563EB" },
  { key: "neckoutfit", label: "یخن (پیراهن تنبان)", color: "#0EA5A4" },
  { key: "astin", label: "آستین", color: "#0891B2" },
  { key: "daman", label: "دامن", color: "#7C3AED" },
  { key: "shoulderstate", label: "وضعیت شانه", color: "#F97316" },
  { key: "neckwaskat", label: "یخن (واسکت)", color: "#F59E0B" },
  { key: "jibrow", label: "جیب رو", color: "#2563EB" },
  { key: "jibbaghle", label: "جیب بغل", color: "#DC2626" },
  { key: "jibtenban", label: "جیب تنبان", color: "#16A34A" },
  { key: "patyship", label: "شیپ پتی", color: "#0E7490" },
  { key: "buttonship", label: "شیپ دکمه", color: "#7C3AED" },
  { key: "tenbanship", label: "شیپ تنبان", color: "#DB2777" },
];

const TAB_GROUPS = {
  OUTFIT: ["neckoutfit", "astin", "daman", "buttonship", "tenbanship"],
  WASKAT: ["neckwaskat", "shoulderstate"],
  RAKHT: [],
};

const TON_QTY_OPTIONS = Array.from({ length: 30 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}));

const emptyTon = () => ({ name: "", colorHex: "#94A3B8", totalMeters: "" });

const rakhtTonSchema = z.object({
  name: z.string().trim().min(1),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  totalMeters: z.coerce.number().positive(),
});

const rakhtSchema = z
  .object({
    companyName: z.string().trim().min(1),
    brandName: z.string().trim().min(1),
    tonQuantity: z.number().int().min(1).max(30),
    tons: z.array(rakhtTonSchema),
    totalPrice: z.coerce.number().min(0),
    givenMoney: z.coerce.number().min(0),
  })
  .refine((d) => d.tons.length === d.tonQuantity, {
    message: "Ton items count must match Ton Quantity",
    path: ["tons"],
  });

function RakhtTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const emptyForm = () => ({
    companyName: "",
    brandName: "",
    tonQuantity: null,
    tons: [],
    totalPrice: "",
    givenMoney: "",
  });

  const [form, setForm] = useState(emptyForm());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rakht-list"],
    queryFn: () => api.get("/rakhts").then((res) => res.data),
  });

  const saveMut = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.put(`/rakhts/${editing.id}`, payload)
        : api.post("/rakhts", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rakht-list"] });
      setModal(false);
      setEditing(null);
      setForm(emptyForm());
      toast.success(
        editing
          ? t("rakht.updated", { defaultValue: "Rakht updated." })
          : t("rakht.created", { defaultValue: "Rakht created." }),
      );
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("rakht.saveFailed", { defaultValue: "Unable to save Rakht." }),
        ),
      ),
  });

  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/rakhts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rakht-list"] });
      toast.success(t("rakht.deleted", { defaultValue: "Rakht deleted." }));
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("rakht.deleteFailed", { defaultValue: "Unable to delete Rakht." }),
        ),
      ),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      companyName: item.companyName || "",
      brandName: item.brandName || "",
      tonQuantity: item.tonQuantity || null,
      tons: (item.tons || []).map((ton) => ({
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
      const current = prev.tons || [];
      const next =
        qty > current.length
          ? [
              ...current,
              ...Array.from({ length: qty - current.length }, emptyTon),
            ]
          : current.slice(0, qty);
      return { ...prev, tonQuantity: qty, tons: next };
    });
  };

  const updateTon = (index, field, value) => {
    setForm((prev) => {
      const tons = [...prev.tons];
      tons[index] = { ...tons[index], [field]: value };
      return { ...prev, tons };
    });
  };

  const remainingMoney = useMemo(() => {
    const total = parseInt(form.totalPrice, 10) || 0;
    const given = parseInt(form.givenMoney, 10) || 0;
    return Math.max(0, total - given);
  }, [form.totalPrice, form.givenMoney]);

  const todayDisplay = new Date().toLocaleDateString();

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
        <button
          onClick={openCreate}
          className="btn btn-gold"
          style={{ gap: 6 }}
        >
          <LuPlus size={13} /> {t("common.add")}
        </button>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          {t("common.loading")}
        </p>
      ) : !rows.length ? (
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
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.companyName}</td>
                  <td>{item.brandName}</td>
                  <td>{item.tonQuantity}</td>
                  <td>
                    {Math.round(Number(item.totalPrice || 0)).toLocaleString()}
                  </td>
                  <td>
                    {Math.round(Number(item.givenMoney || 0)).toLocaleString()}
                  </td>
                  <td>
                    {Math.round(
                      item.remainingMoney ??
                        Math.max(
                          0,
                          (item.totalPrice || 0) - (item.givenMoney || 0),
                        ),
                    ).toLocaleString()}
                  </td>
                  <td>
                    {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
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
        open={modal}
        onClose={() => {
          setModal(false);
          setEditing(null);
        }}
        title={
          editing
            ? t("rakht.editTitle", { defaultValue: "Edit Rakht" })
            : t("rakht.addTitle", { defaultValue: "Add Rakht" })
        }
      >
        <div style={{ display: "grid", gap: 14 }}>
          {/* Company Name */}
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

          {/* Brand Name */}
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

          {/* Ton Quantity */}
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

          {/* Dynamic Ton Groups */}
          {form.tons.length > 0 && (
            <div style={{ display: "grid", gap: 12 }}>
              <p
                style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}
              >
                {t("rakht.tonDetails", { defaultValue: "Ton Details" })}
              </p>
              {form.tons.map((ton, idx) => (
                <div
                  key={idx}
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

                  {/* Name */}
                  <div>
                    <label className="lbl">
                      {t("rakht.tonName", { defaultValue: "Name" })}
                    </label>
                    <div className="iw">
                      <input
                        className="inp"
                        value={ton.name}
                        onChange={(e) => updateTon(idx, "name", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Color + Total Meters in a row */}
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
                          updateTon(idx, "colorHex", e.target.value)
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
                          type="number"
                          min="1"
                          step="1"
                          value={ton.totalMeters}
                          onChange={(e) =>
                            updateTon(idx, "totalMeters", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Summary */}
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
                <LuBadgeDollarSign size={14} className="ico" />
                <input
                  className="inp"
                  type="number"
                  min="0"
                  step="1"
                  value={form.totalPrice}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, totalPrice: e.target.value }))
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
                    setForm((p) => ({ ...p, givenMoney: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Remaining Money (read-only) */}
          <div>
            <label className="lbl">
              {t("rakht.remainingMoney", { defaultValue: "Remaining Money" })}
            </label>
            <div
              className="iw"
              style={{ background: "var(--surface2)", opacity: 0.8 }}
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

          {/* Date (auto-generated) */}
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
                    ? new Date(editing.date).toLocaleDateString()
                    : todayDisplay
                }
                style={{ cursor: "default" }}
              />
            </div>
          </div>

          {/* Actions */}
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
          delMut.mutate(deleteItem.id, {
            onSettled: () => setDeleteItem(null),
          });
        }}
        title={t("rakht.deleteTitle", { defaultValue: t("common.delete") })}
        message={t("rakht.deleteConfirm", {
          defaultValue: `Delete ${deleteItem?.brandName || ""} permanently?`,
        })}
        itemName={deleteItem?.brandName || ""}
        isPending={delMut.isPending}
      />
    </div>
  );
}

function DesignCard({ model }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["design", model.key],
    queryFn: () => api.get(`/designs/${model.key}`).then((r) => r.data),
  });
  const saveMut = useMutation({
    mutationFn: () =>
      editing
        ? api.put(`/designs/${model.key}/${editing.id}`, { name })
        : api.post(`/designs/${model.key}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["design", model.key] });
      setModal(false);
      setName("");
      setEditing(null);
      toast.success(
        editing
          ? t("designs.styleUpdated", {
              model: model.label,
              defaultValue: `${model.label} style updated.`,
            })
          : t("designs.styleAdded", {
              model: model.label,
              defaultValue: `${model.label} style added.`,
            }),
      );
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("designs.saveFailed", {
            model: model.label,
            defaultValue: `Unable to save ${model.label} style.`,
          }),
        ),
      ),
  });
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/designs/${model.key}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["design", model.key] });
      toast.success(
        t("designs.styleDeleted", {
          model: model.label,
          defaultValue: `${model.label} style deleted.`,
        }),
      );
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("designs.deleteFailed", {
            model: model.label,
            defaultValue: `Unable to delete ${model.label} style.`,
          }),
        ),
      ),
  });

  const bg = `${model.color}12`;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ height: 3, background: model.color }} />
      <div style={{ padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <p style={{ fontWeight: 700, fontSize: 14 }}>{model.label}</p>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
              {t("designs.stylesCount", {
                count: data.length,
                defaultValue: `${data.length} styles`,
              })}
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setName("");
              setModal(true);
            }}
            className="btn btn-sm"
            style={{
              background: bg,
              color: model.color,
              border: `1px solid ${model.color}30`,
              gap: 4,
            }}
          >
            <LuPlus size={12} /> {t("common.add")}
          </button>
        </div>

        {isLoading ? (
          <p style={{ fontSize: 12, color: "var(--text3)" }}>
            {t("common.loading")}
          </p>
        ) : !data.length ? (
          <p
            style={{ fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}
          >
            {t("designs.noStyles", { defaultValue: "No styles yet" })}
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: bg,
                  border: `1px solid ${model.color}25`,
                  borderRadius: 99,
                  padding: "3px 10px",
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    color: model.color,
                    fontWeight: 500,
                  }}
                >
                  {item.name}
                </span>
                <button
                  onClick={() => {
                    setEditing(item);
                    setName(item.name);
                    setModal(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: model.color,
                    opacity: 0.7,
                    display: "flex",
                    padding: 0,
                  }}
                >
                  <LuPencil size={10} />
                </button>
                <button
                  onClick={() => setDeleteItem(item)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#DC2626",
                    opacity: 0.7,
                    display: "flex",
                    padding: 0,
                  }}
                >
                  <LuTrash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
          setEditing(null);
        }}
        title={t("designs.modalTitle", {
          action: editing ? t("common.edit") : t("common.add"),
          model: model.label,
          defaultValue: `${editing ? "Edit" : "Add"} ${model.label} Style`,
        })}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="lbl">
              {t("designs.styleName", { defaultValue: "Style Name" })}
            </label>
            <input
              className="inp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveMut.mutate()}
              placeholder={t("designs.stylePlaceholder", {
                model: model.label,
                defaultValue: `e.g. Classic ${model.label}`,
              })}
              autoFocus
            />
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
              onClick={() => saveMut.mutate()}
              className="btn btn-gold"
              style={{ flex: 1, background: model.color }}
              disabled={!name.trim() || saveMut.isPending}
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
          delMut.mutate(deleteItem.id, {
            onSettled: () => setDeleteItem(null),
          });
        }}
        title={t("designs.deleteTitle", { defaultValue: t("common.delete") })}
        message={t("designs.deleteConfirm", {
          name: deleteItem?.name || "",
          defaultValue: `Delete "${deleteItem?.name || ""}" permanently? This action cannot be undone.`,
        })}
        itemName={deleteItem?.name || ""}
        isPending={delMut.isPending}
      />
    </div>
  );
}

export default function Designs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("OUTFIT");

  const tabLabels = {
    OUTFIT: t("designs.tabs.outfit", { defaultValue: "Outfit" }),
    WASKAT: t("designs.tabs.waskat", { defaultValue: "Waskat" }),
    YAKHANQAQ: t("designs.tabs.yakhanaqq", { defaultValue: "YakhanQaq" }),
    RAKHT: t("designs.tabs.rakht", { defaultValue: "Rakht" }),
  };

  const modelsToShow = (TAB_GROUPS[activeTab] || [])
    .map((k) => MODELS.find((m) => m.key === k))
    .filter(Boolean);

  return (
    <div className="page">
      <PageHeader
        title={t("designs.title", { defaultValue: "Design Management" })}
        subtitle={t("designs.subtitle", {
          defaultValue: "Manage style options used in order forms",
        })}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {Object.keys(TAB_GROUPS).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? "btn btn-gold" : "btn btn-outline"}
            style={{ minWidth: 120 }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === "RAKHT" ? (
        <RakhtTab />
      ) : (
        <div className="g-designs">
          {modelsToShow.length === 0 ? (
            <p
              style={{
                fontSize: 12,
                color: "var(--text3)",
                fontStyle: "italic",
              }}
            >
              {t("designs.noStyles", {
                defaultValue: "No style groups configured for this tab.",
              })}
            </p>
          ) : (
            modelsToShow.map((m) => <DesignCard key={m.key} model={m} />)
          )}
        </div>
      )}
    </div>
  );
}
