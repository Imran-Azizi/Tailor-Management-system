import { LuPencil, LuTrash2, LuTriangleAlert } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../../lib/currency.js";
import { EmptyState } from "../ui/index.jsx";

const LOW_STOCK_LIMIT = 5;

function stockClass(quantity) {
  if (quantity <= 0) return "items-stock items-stock--out";
  if (quantity <= LOW_STOCK_LIMIT) return "items-stock items-stock--low";
  return "items-stock items-stock--ok";
}

export default function ItemList({ items, onEdit, onDelete }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
  const textAlign = isRtl ? "right" : "left";

  if (!items.length) {
    return (
      <EmptyState
        message={t("items.empty", {
          defaultValue: "No items found for this category.",
        })}
      />
    );
  }

  const columns = [
    {
      key: "name",
      label: t("items.fields.name", { defaultValue: "Item Name" }),
      render: (item) => <strong>{item.name}</strong>,
    },
    {
      key: "brand",
      label: t("items.fields.brand", { defaultValue: "Brand" }),
      render: (item) => item.brand,
    },
    {
      key: "code",
      label: t("items.fields.code", { defaultValue: "Code" }),
      render: (item) => <span className="code-chip">{item.code}</span>,
    },
    {
      key: "quantity",
      label: t("items.fields.quantity", { defaultValue: "Quantity" }),
      render: (item) => {
        const quantity = Number(item.quantity || 0);
        const isWarning = quantity <= LOW_STOCK_LIMIT;
        return (
          <span className={stockClass(quantity)}>
            {isWarning ? <LuTriangleAlert size={13} /> : null}
            {quantity <= 0
              ? t("items.stock.out", { defaultValue: "Out of stock" })
              : quantity <= LOW_STOCK_LIMIT
                ? t("items.stock.low", {
                    count: quantity,
                    defaultValue: "{{count}} left",
                  })
                : t("items.stock.available", {
                    count: quantity,
                    defaultValue: "{{count}} available",
                  })}
          </span>
        );
      },
    },
    {
      key: "originalPrice",
      label: t("items.fields.originalPrice", { defaultValue: "Original Price" }),
      render: (item) => formatCurrency(item.originalPrice, language),
    },
    {
      key: "notes",
      label: t("items.fields.notes", { defaultValue: "Notes" }),
      className: "items-note",
      render: (item) => item.notes || "-",
    },
    {
      key: "actions",
      label: t("common.actions", { defaultValue: "Actions" }),
      render: (item) => (
        <div className="items-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onEdit(item)}
            aria-label={t("common.edit", { defaultValue: "Edit" })}
          >
            <LuPencil size={14} />
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm btn-danger-soft"
            onClick={() => onDelete(item)}
            aria-label={t("common.delete", {
              defaultValue: "Delete",
            })}
          >
            <LuTrash2 size={14} />
          </button>
        </div>
      ),
    },
  ];
  const visibleColumns = isRtl ? [...columns].reverse() : columns;

  return (
    <div
      className="items-table-wrap"
      style={{ direction: "ltr", textAlign }}
    >
      <table
        className="tbl items-table"
        style={{ direction: "ltr", textAlign }}
      >
        <thead>
          <tr>
            {visibleColumns.map((column) => (
              <th key={column.key} style={{ textAlign }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {visibleColumns.map((column) => (
                <td
                  key={`${item.id}-${column.key}`}
                  className={column.className}
                  style={{ textAlign }}
                >
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
