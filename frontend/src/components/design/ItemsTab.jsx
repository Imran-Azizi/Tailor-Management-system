import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuInbox, LuPackagePlus } from "react-icons/lu";
import ItemCategoryCard from "./ItemCategoryCard.jsx";
import ItemCategoryModal from "./ItemCategoryModal.jsx";
import api from "../../lib/api.js";
import { getApiErrorMessage } from "../../lib/feedback.js";
import { decorateCategory } from "../../lib/itemCategories.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { PERMISSIONS } from "../../lib/permissions.js";
import { ConfirmDeleteModal, LoadingState } from "../ui/index.jsx";

export default function ItemsTab() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = useAuth();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
  const qc = useQueryClient();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteCategory, setDeleteCategory] = useState(null);

  const canManageCategories = hasPermission(PERMISSIONS.INVENTORY_PRODUCTS_ADD);
  const canEditCategories = hasPermission(PERMISSIONS.INVENTORY_PRODUCTS_EDIT);
  const canDeleteCategories = hasPermission(
    PERMISSIONS.INVENTORY_PRODUCTS_DELETE,
  );

  const categoriesQuery = useQuery({
    queryKey: ["item-categories"],
    queryFn: () =>
      api
        .get("/item-categories", { params: { includeInactive: true } })
        .then((res) => res.data.categories || []),
  });

  const categories = useMemo(
    () => (categoriesQuery.data || []).map(decorateCategory),
    [categoriesQuery.data],
  );

  const invalidateCategories = () => {
    qc.invalidateQueries({ queryKey: ["item-categories"] });
  };

  const createCategoryMut = useMutation({
    mutationFn: (payload) => api.post("/item-categories", payload),
    onSuccess: () => {
      invalidateCategories();
      setCategoryModalOpen(false);
      toast.success(
        t("items.categories.created", { defaultValue: "Category created." }),
      );
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("items.categories.saveFailed", {
            defaultValue: "Unable to save category.",
          }),
        ),
      ),
  });

  const updateCategoryMut = useMutation({
    mutationFn: (payload) =>
      api.put(`/item-categories/${editingCategory.id}`, payload),
    onSuccess: () => {
      invalidateCategories();
      setCategoryModalOpen(false);
      setEditingCategory(null);
      toast.success(
        t("items.categories.updated", { defaultValue: "Category updated." }),
      );
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("items.categories.saveFailed", {
            defaultValue: "Unable to save category.",
          }),
        ),
      ),
  });

  const deleteCategoryMut = useMutation({
    mutationFn: () => api.delete(`/item-categories/${deleteCategory.id}`),
    onSuccess: () => {
      invalidateCategories();
      setDeleteCategory(null);
      toast.success(
        t("items.categories.deleted", { defaultValue: "Category deleted." }),
      );
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("items.categories.deleteFailed", {
            defaultValue: "Unable to delete category.",
          }),
        ),
      ),
  });

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    if (createCategoryMut.isPending || updateCategoryMut.isPending) return;
    setCategoryModalOpen(false);
    setEditingCategory(null);
  };

  return (
    <div className="items-tab" dir={isRtl ? "rtl" : "ltr"}>
      <div className="items-tab-header">
        <div>
          <p className="items-eyebrow">
            {t("items.inventory", { defaultValue: "Inventory" })}
          </p>
          <h2>{t("items.title", { defaultValue: "Items Management" })}</h2>
          <p>
            {t("items.subtitle", {
              defaultValue:
                "Create product categories for your shop and manage stock in each section.",
            })}
          </p>
        </div>
        {canManageCategories && categories.length > 0 ? (
          <button
            type="button"
            className="btn btn-sm btn-gold"
            onClick={openCreateCategory}
          >
            <LuPackagePlus size={14} />
            {t("items.categories.add", { defaultValue: "Add Category" })}
          </button>
        ) : null}
      </div>

      {categoriesQuery.isLoading ? (
        <LoadingState
          message={t("common.loading", { defaultValue: "Loading..." })}
        />
      ) : categories.length ? (
        <div className="items-categories-grid">
          {categories.map((category) => (
            <ItemCategoryCard
              key={category.id}
              category={category}
              onEditCategory={
                canEditCategories ? () => openEditCategory(category) : null
              }
              onDeleteCategory={
                canDeleteCategories ? () => setDeleteCategory(category) : null
              }
            />
          ))}
        </div>
      ) : (
        <div className="card items-empty-state-card">
          <div className="items-empty-state">
            <LuInbox size={42} />
            <h3>
              {t("items.categories.emptyTitle", {
                defaultValue: "No categories yet",
              })}
            </h3>
            <p>
              {t("items.categories.emptySubtitle", {
                defaultValue: "Add your first category to start managing items.",
              })}
            </p>
            {canManageCategories ? (
              <button
                type="button"
                className="btn btn-gold"
                onClick={openCreateCategory}
              >
                <LuPackagePlus size={16} />
                {t("items.add", { defaultValue: "Add Item" })}
              </button>
            ) : null}
          </div>
        </div>
      )}

      <ItemCategoryModal
        open={categoryModalOpen}
        onClose={closeCategoryModal}
        onSave={(payload) =>
          editingCategory
            ? updateCategoryMut.mutate(payload)
            : createCategoryMut.mutate(payload)
        }
        initial={editingCategory}
        isPending={createCategoryMut.isPending || updateCategoryMut.isPending}
      />

      <ConfirmDeleteModal
        open={!!deleteCategory}
        onClose={() => setDeleteCategory(null)}
        onConfirm={() => deleteCategoryMut.mutate()}
        itemName={deleteCategory?.name || ""}
        isPending={deleteCategoryMut.isPending}
      />
    </div>
  );
}
