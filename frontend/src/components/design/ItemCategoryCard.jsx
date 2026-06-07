import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuBoxes,
  LuPackagePlus,
  LuSearch,
  LuSparkles,
  LuTriangleAlert,
} from "react-icons/lu";
import ItemList from "./ItemList.jsx";
import ItemModal from "./ItemModal.jsx";
import api from "../../lib/api.js";
import { getApiErrorMessage } from "../../lib/feedback.js";
import { ConfirmDeleteModal, LoadingState } from "../ui/index.jsx";

const LOW_STOCK_LIMIT = 5;

export default function ItemCategoryCard({ category }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["items", category.key, search],
    queryFn: () =>
      api
        .get("/items", {
          params: { type: category.key, search, pageSize: 100 },
        })
        .then((res) => res.data),
  });

  const items = query.data?.items || [];
  const stats = useMemo(() => {
    const total = items.length;
    const stock = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
    const low = items.filter(
      (item) =>
        Number(item.quantity || 0) > 0 &&
        Number(item.quantity || 0) <= LOW_STOCK_LIMIT,
    ).length;
    const out = items.filter((item) => Number(item.quantity || 0) <= 0).length;
    return { total, stock, low, out };
  }, [items]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["items", category.key] });
    qc.invalidateQueries({ queryKey: ["items"] });
  };

  const createMut = useMutation({
    mutationFn: (payload) => api.post("/items", payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast.success(t("items.created", { defaultValue: "Item created." }));
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("items.saveFailed", { defaultValue: "Unable to save item." }),
        ),
      ),
  });

  const updateMut = useMutation({
    mutationFn: (payload) => api.put(`/items/${editing.id}`, payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setEditing(null);
      toast.success(t("items.updated", { defaultValue: "Item updated." }));
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("items.saveFailed", { defaultValue: "Unable to save item." }),
        ),
      ),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/items/${deleteItem.id}`),
    onSuccess: () => {
      invalidate();
      setDeleteItem(null);
      toast.success(t("items.deleted", { defaultValue: "Item deleted." }));
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("items.deleteFailed", { defaultValue: "Unable to delete item." }),
        ),
      ),
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (createMut.isPending || updateMut.isPending) return;
    setModalOpen(false);
    setEditing(null);
  };

  // Card background color (like DesignCard)
  const bg = `${category.color}12`;

  return (
    <div
      className="card designs-card items-category-card"
      style={{ overflow: "hidden", direction: isRtl ? "rtl" : "ltr" }}
    >
      <div style={{ height: 3, background: category.color }} />
      <div style={{ padding: 16 }}>
        <div
          className="designs-card-head"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className="items-category-icon"
              style={{
                color: category.color,
                marginInlineEnd: isRtl ? 0 : 8,
                marginInlineStart: isRtl ? 8 : 0,
              }}
            >
              <category.Icon size={22} />
            </span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{category.label}</p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
                {t("items.categorySubtitle", {
                  total: stats.total,
                  defaultValue: "{{total}} items in this category",
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm items-category-add-btn"
            style={{
              background: bg,
              color: category.color,
              border: `1px solid ${category.color}30`,
              gap: 4,
            }}
            onClick={openCreate}
          >
            <LuPackagePlus size={12} />{" "}
            {t("items.add", { defaultValue: "Add Item" })}
          </button>
        </div>

        <div
          className="items-category-stats"
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <span>
            <LuBoxes size={14} />
            {t("items.totalStock", {
              count: stats.stock,
              defaultValue: "{{count}} in stock",
            })}
          </span>
          <span className={stats.low ? "text-warning" : ""}>
            <LuTriangleAlert size={14} />
            {t("items.lowStockCount", {
              count: stats.low,
              defaultValue: "{{count}} low stock",
            })}
          </span>
          <span className={stats.out ? "text-danger" : ""}>
            <LuSparkles size={14} />
            {t("items.outStockCount", {
              count: stats.out,
              defaultValue: "{{count}} out",
            })}
          </span>
        </div>

        <div className="items-category-search">
          <LuSearch size={16} />
          <input
            className="inp"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("items.searchPlaceholder", {
              defaultValue: "Search name, brand, code, notes...",
            })}
            style={{
              textAlign: isRtl ? "right" : "left",
              direction: isRtl ? "rtl" : "ltr",
            }}
          />
        </div>

        {query.isLoading ? (
          <LoadingState
            message={t("common.loading", { defaultValue: "Loading..." })}
          />
        ) : (
          <ItemList items={items} onEdit={openEdit} onDelete={setDeleteItem} />
        )}
      </div>

      <ItemModal
        open={modalOpen}
        onClose={closeModal}
        onSave={(payload) =>
          editing ? updateMut.mutate(payload) : createMut.mutate(payload)
        }
        initial={editing}
        category={category}
        isPending={createMut.isPending || updateMut.isPending}
      />

      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteMut.mutate()}
        itemName={deleteItem?.name || ""}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}
