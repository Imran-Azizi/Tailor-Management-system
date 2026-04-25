import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuPlus, LuPencil, LuTrash2 } from "react-icons/lu";
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
};

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
        ) : data.length === 0 ? (
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

      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        {Object.keys(TAB_GROUPS).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? "btn btn-gold" : "btn btn-outline"}
            style={{ minWidth: 100, flex: "1 1 auto" }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

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
    </div>
  );
}
