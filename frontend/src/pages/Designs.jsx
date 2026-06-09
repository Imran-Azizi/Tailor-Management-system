import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuPlus, LuPencil, LuTrash2, LuPercent } from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatCurrency } from "../lib/currency.js";
import { useMonth } from "../context/MonthContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  PageHeader,
  Modal,
  ConfirmDeleteModal,
} from "../components/ui/index.jsx";
import ItemsTab from "../components/design/ItemsTab.jsx";

const MODELS = [
  { key: "yakhan", label: "شیپ یخن", color: "#2563EB" },
  { key: "neckoutfit", label: "شیپ یخن (پیراهن تنبان)", color: "#0EA5A4" },
  { key: "astin", label: "آستین", color: "#0891B2" },
  { key: "daman", label: "شیپ دامن", color: "#7C3AED" },
  { key: "shoulderstate", label: "وضعیت شانه", color: "#F97316" },
  { key: "neckwaskat", label: "شیپ یخن (واسکت)", color: "#F59E0B" },
  { key: "jibrow", label: "جیب رو", color: "#2563EB" },
  { key: "jibbaghle", label: "یک بغل جیب", color: "#DC2626" },
  { key: "jibtenban", label: "جیب تنبان", color: "#16A34A" },
  { key: "patyship", label: "شیپ پتی", color: "#0E7490" },
  { key: "buttonship", label: "شیپ دکمه", color: "#7C3AED" },
  { key: "tenbanship", label: "شیپ تنبان", color: "#DB2777" },
  { key: "outfitdesign", label: "دیزاین", color: "#7C3AED" },
  { key: "yakhanqaqneck", label: "شیپ یخن", color: "#2563EB" },
  { key: "yakhanqaqsleeve", label: "آستین", color: "#0891B2" },
  { key: "yakhanqaqskirt", label: "شیپ دامن", color: "#DB2777" },
  { key: "yakhanqaqdesign", label: "دیزاین", color: "#7C3AED" },
  { key: "yakhanqaqbutton", label: "شیپ دکمه", color: "#F97316" },
  { key: "yakhanqaqpant", label: "شیپ پتی", color: "#0E7490" },
  { key: "items", label: "Items", color: "#F59E0B" },
];

const TAB_GROUPS = {
  OUTFIT: [
    "neckoutfit",
    "astin",
    "daman",
    "outfitdesign",
    "buttonship",
    "patyship",
    "tenbanship",
  ],
  WASKAT: ["neckwaskat", "shoulderstate"],
  YAKHANQAQ: [
    "yakhanqaqneck",
    "yakhanqaqsleeve",
    "yakhanqaqskirt",
    "yakhanqaqdesign",
    "yakhanqaqbutton",
    "yakhanqaqpant",
  ],
};

const PAGE_TABS = [
  "OUTFIT",
  "WASKAT",
  "YAKHANQAQ",
  "READY_MADE",
  "READY_MADE_WASKAT",
  "CONTRIBUTOR",
  "ITEMS", // New tab for Items Management
];

const DESIGN_MODELS = [
  { key: "yakhan", labelKey: "designs.models.yakhan", fallback: "Neck Style", color: "#2563EB" },
  { key: "neckoutfit", labelKey: "designs.models.neckoutfit", fallback: "Neck Style (Outfit)", color: "#0EA5A4" },
  { key: "astin", labelKey: "designs.models.astin", fallback: "Sleeve", color: "#0891B2" },
  { key: "daman", labelKey: "designs.models.daman", fallback: "Skirt Style", color: "#7C3AED" },
  { key: "shoulderstate", labelKey: "designs.models.shoulderstate", fallback: "Shoulder State", color: "#F97316" },
  { key: "neckwaskat", labelKey: "designs.models.neckwaskat", fallback: "Neck Style (Waskat)", color: "#F59E0B" },
  { key: "jibrow", labelKey: "designs.models.jibrow", fallback: "Front Pocket", color: "#2563EB" },
  { key: "jibbaghle", labelKey: "designs.models.jibbaghle", fallback: "One Side Pocket", color: "#DC2626" },
  { key: "jibtenban", labelKey: "designs.models.jibtenban", fallback: "Tenban Pocket", color: "#16A34A" },
  { key: "patyship", labelKey: "designs.models.patyship", fallback: "Pant Style", color: "#0E7490" },
  { key: "buttonship", labelKey: "designs.models.buttonship", fallback: "Button Style", color: "#7C3AED" },
  { key: "tenbanship", labelKey: "designs.models.tenbanship", fallback: "Tenban Style", color: "#DB2777" },
  { key: "outfitdesign", labelKey: "designs.models.outfitdesign", fallback: "Outfit Design", color: "#7C3AED" },
  { key: "yakhanqaqneck", labelKey: "designs.models.yakhanqaqneck", fallback: "Yakhan Qaq Neck", color: "#2563EB" },
  { key: "yakhanqaqsleeve", labelKey: "designs.models.yakhanqaqsleeve", fallback: "Yakhan Qaq Sleeve", color: "#0891B2" },
  { key: "yakhanqaqskirt", labelKey: "designs.models.yakhanqaqskirt", fallback: "Yakhan Qaq Skirt", color: "#DB2777" },
  { key: "yakhanqaqdesign", labelKey: "designs.models.yakhanqaqdesign", fallback: "Yakhan Qaq Design", color: "#7C3AED" },
  { key: "yakhanqaqbutton", labelKey: "designs.models.yakhanqaqbutton", fallback: "Yakhan Qaq Button", color: "#F97316" },
  { key: "yakhanqaqpant", labelKey: "designs.models.yakhanqaqpant", fallback: "Yakhan Qaq Pant", color: "#0E7490" },
];

function ContributorSection() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { viewMonth, viewYear } = useMonth();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authAction, setAuthAction] = useState(null);
  const [authContributor, setAuthContributor] = useState(null);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [verifiedEditPassword, setVerifiedEditPassword] = useState("");
  const [verifiedDeletePassword, setVerifiedDeletePassword] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    fatherName: "",
    phoneNumber: "",
    percentage: "",
    password: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["design-contributors", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/designs/contributors", {
          params: {
            month: viewMonth,
            year: viewYear,
          },
        })
        .then((r) => r.data),
  });

  const isInvalidContributorPassword = (error) => {
    const msg = String(getApiErrorMessage(error, "")).toLowerCase();
    return msg.includes("invalid contributor password");
  };

  const createMut = useMutation({
    mutationFn: (payload) => api.post("/designs/contributors", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["design-contributors"] });
      setModalOpen(false);
      setEditing(null);
      setFormError("");
      setForm({
        name: "",
        fatherName: "",
        phoneNumber: "",
        percentage: "",
        password: "",
      });
      toast.success(
        t("designs.contributor.created", {
          defaultValue: "Contributor created successfully.",
        }),
      );
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("designs.contributor.createFailed", {
            defaultValue: "Unable to create contributor.",
          }),
        ),
      ),
  });

  const updateMut = useMutation({
    mutationFn: (payload) =>
      api.put(`/designs/contributors/${editing.id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["design-contributors"] });
      setModalOpen(false);
      setEditing(null);
      setVerifiedEditPassword("");
      setFormError("");
      setForm({
        name: "",
        fatherName: "",
        phoneNumber: "",
        percentage: "",
        password: "",
      });
      toast.success(
        t("designs.contributor.updated", {
          defaultValue: "Contributor updated successfully.",
        }),
      );
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("designs.contributor.updateFailed", {
            defaultValue: "Unable to update contributor.",
          }),
        ),
      ),
  });

  const deleteMut = useMutation({
    mutationFn: ({ id, password }) =>
      api.delete(`/designs/contributors/${id}`, {
        data: { password },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["design-contributors"] });
      setAuthModalOpen(false);
      setAuthAction(null);
      setAuthContributor(null);
      setAuthPassword("");
      setAuthError("");
      setDeleteItem(null);
      setVerifiedDeletePassword("");
      toast.success(
        t("designs.contributor.deleted", {
          defaultValue: "Contributor deleted successfully.",
        }),
      );
    },
    onError: (error) =>
      toast.error(
        isInvalidContributorPassword(error)
          ? t("designs.contributor.password.invalid", {
              defaultValue: "Contributor password is incorrect.",
            })
          : getApiErrorMessage(
              error,
              t("designs.contributor.deleteFailed", {
                defaultValue: "Unable to delete contributor.",
              }),
            ),
      ),
  });

  const verifyPasswordMut = useMutation({
    mutationFn: ({ id, password }) =>
      api.post(`/designs/contributors/${id}/verify-password`, { password }),
  });

  const contributorList = data?.contributors || [];
  const totalPercentage = Number(data?.totalPercentage || 0);
  const netBenefit = Number(data?.netBenefit || 0);

  const openCreateModal = () => {
    setEditing(null);
    setVerifiedEditPassword("");
    setFormError("");
    setForm({
      name: "",
      fatherName: "",
      phoneNumber: "",
      percentage: "",
      password: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row);
    setFormError("");
    setForm({
      name: row.name || "",
      fatherName: row.fatherName || "",
      phoneNumber: row.phoneNumber || "",
      percentage: String(row.percentage ?? ""),
      password: "",
    });
    setModalOpen(true);
  };

  const openPasswordModal = ({ action, contributor = null }) => {
    setAuthAction(action);
    setAuthContributor(contributor);
    setAuthPassword("");
    setAuthError("");
    setAuthModalOpen(true);
  };

  const validateAndBuildPayload = () => {
    const name = form.name.trim();
    const fatherName = form.fatherName.trim();
    const phoneNumber = form.phoneNumber.trim();
    const percentageValue = Number(form.percentage);

    if (!name || !fatherName || !phoneNumber || form.percentage === "") {
      return {
        error: t("designs.contributor.validation.required", {
          defaultValue: "Please complete all required fields.",
        }),
      };
    }

    if (!editing && !form.password.trim()) {
      return {
        error: t("designs.contributor.validation.passwordRequired", {
          defaultValue: "Password is required.",
        }),
      };
    }

    if (!editing && form.password.trim().length < 6) {
      return {
        error: t("designs.contributor.validation.passwordMin", {
          defaultValue: "Password must be at least 6 characters.",
        }),
      };
    }

    if (!Number.isFinite(percentageValue)) {
      return {
        error: t("designs.contributor.validation.percentageNumber", {
          defaultValue: "Percentage must be a valid number.",
        }),
      };
    }

    if (percentageValue < 0 || percentageValue > 100) {
      return {
        error: t("designs.contributor.validation.percentageRange", {
          defaultValue: "Percentage must be between 0 and 100.",
        }),
      };
    }

    const currentTotal = Number(totalPercentage || 0);
    const currentEditingPercentage = editing
      ? Number(editing.percentage || 0)
      : 0;
    const projectedTotal =
      currentTotal - currentEditingPercentage + percentageValue;

    if (projectedTotal > 100) {
      return {
        error: t("designs.contributor.validation.totalLimit", {
          defaultValue:
            "Total contributor percentage cannot be greater than 100%.",
        }),
      };
    }

    return {
      payload: {
        name,
        fatherName,
        phoneNumber,
        percentage: percentageValue,
        ...(editing
          ? { password: verifiedEditPassword }
          : { password: form.password }),
      },
    };
  };

  const handleSubmit = () => {
    const result = validateAndBuildPayload();
    if (result.error) {
      setFormError(result.error);
      toast.error(result.error);
      return;
    }

    setFormError("");
    if (editing) {
      if (!verifiedEditPassword) {
        const msg = t("designs.contributor.validation.verifyBeforeEdit", {
          defaultValue: "Please verify password before updating.",
        });
        setFormError(msg);
        toast.error(msg);
        return;
      }
      updateMut.mutate(result.payload);
    } else {
      createMut.mutate(result.payload);
    }
  };

  const handleConfirmWithPassword = () => {
    const password = authPassword.trim();
    if (!password) {
      const msg = t("designs.contributor.validation.passwordRequired", {
        defaultValue: "Password is required.",
      });
      setAuthError(msg);
      return;
    }

    if (password.length < 6) {
      const msg = t("designs.contributor.validation.passwordMin", {
        defaultValue: "Password must be at least 6 characters.",
      });
      setAuthError(msg);
      return;
    }

    setAuthError("");

    if (!authContributor?.id) return;

    verifyPasswordMut.mutate(
      { id: authContributor.id, password },
      {
        onSuccess: () => {
          if (authAction === "verify-edit") {
            setVerifiedEditPassword(password);
            setAuthModalOpen(false);
            setAuthAction(null);
            setAuthContributor(null);
            setAuthPassword("");
            setAuthError("");
            openEditModal(authContributor);
            return;
          }

          if (authAction === "verify-delete") {
            setVerifiedDeletePassword(password);
            setDeleteItem(authContributor);
            setAuthModalOpen(false);
            setAuthAction(null);
            setAuthContributor(null);
            setAuthPassword("");
            setAuthError("");
          }
        },
        onError: (error) => {
          if (isInvalidContributorPassword(error)) {
            setAuthError(
              t("designs.contributor.password.invalid", {
                defaultValue: "Contributor password is incorrect.",
              }),
            );
            return;
          }
          setAuthError(
            getApiErrorMessage(
              error,
              t("designs.contributor.updateFailed", {
                defaultValue: "Unable to continue.",
              }),
            ),
          );
        },
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteItem?.id || !verifiedDeletePassword) return;
    deleteMut.mutate(
      { id: deleteItem.id, password: verifiedDeletePassword },
      {
        onSettled: () => {
          setDeleteItem(null);
          setVerifiedDeletePassword("");
        },
      },
    );
  };

  const closeDeleteConfirm = () => {
    if (deleteMut.isPending) return;
    setDeleteItem(null);
    setVerifiedDeletePassword("");
  };

  const closeEditorModal = () => {
    if (isSubmitting) return;
    setModalOpen(false);
    setEditing(null);
    setFormError("");
    setVerifiedEditPassword("");
  };

  const closeAuthModal = () => {
    if (isSubmitting) return;
    setAuthModalOpen(false);
    setAuthAction(null);
    setAuthContributor(null);
    setAuthPassword("");
    setAuthError("");
  };

  const authTitle =
    authAction === "verify-delete"
      ? t("designs.contributor.password.confirmDeleteTitle", {
          defaultValue: "Confirm Delete with Password",
        })
      : t("designs.contributor.password.confirmUpdateTitle", {
          defaultValue: "Confirm Update with Password",
        });

  const authMessage =
    authAction === "verify-delete"
      ? t("designs.contributor.password.confirmDeleteMessage", {
          name: authContributor?.name || "",
          defaultValue:
            'Enter password for contributor "{{name}}" to delete this record.',
        })
      : t("designs.contributor.password.confirmUpdateMessage", {
          name: authContributor?.name || "",
          defaultValue:
            'Enter password for contributor "{{name}}" to continue editing.',
        });

  const isSubmitting =
    createMut.isPending ||
    updateMut.isPending ||
    deleteMut.isPending ||
    verifyPasswordMut.isPending;

  return (
    <div className="contributor-section" dir={isRtl ? "rtl" : "ltr"}>
      <div className="contributor-header card">
        <div className="contributor-header__left">
          <p className="contributor-header__eyebrow">
            {t("designs.contributor.title", { defaultValue: "Contributor" })}
          </p>
          <h3>
            {t("designs.contributor.subtitle", {
              defaultValue: "Manage contributor shares from net benefit",
            })}
          </h3>
        </div>

        <button
          type="button"
          className="btn btn-gold"
          onClick={openCreateModal}
        >
          <LuPlus size={14} />
          {t("designs.contributor.create", {
            defaultValue: "Create Contributor",
          })}
        </button>
      </div>

      <div className="contributor-stats">
        <div className="card contributor-stat">
          <p>
            {t("dashboardPage.netBenefit", { defaultValue: "Net Benefit" })}
          </p>
          <strong>{formatCurrency(netBenefit, language)}</strong>
          <span>
            {t("dashboardPage.netBenefitSub", {
              defaultValue: "Total Revenue - Total Expenses",
            })}
          </span>
        </div>
        <div className="card contributor-stat">
          <p>
            <LuPercent size={14} />
            {t("designs.contributor.totalPercentage", {
              defaultValue: "Total Contributor Percentage",
            })}
          </p>
          <strong>{`${Number(totalPercentage || 0).toFixed(2)}%`}</strong>
          <span>
            {t("designs.contributor.totalPercentageHint", {
              defaultValue: "New entries are blocked at or above 100%.",
            })}
          </span>
        </div>
      </div>

      <div className="card contributor-list-card">
        <div className="contributor-list-desktop-wrap">
          <table className="tbl contributor-table">
            <thead>
              <tr>
                <th>
                  {t("designs.contributor.fields.name", {
                    defaultValue: "Contributor Name",
                  })}
                </th>
                <th>
                  {t("designs.contributor.fields.fatherName", {
                    defaultValue: "Father Name",
                  })}
                </th>
                <th>
                  {t("designs.contributor.fields.phoneNumber", {
                    defaultValue: "Phone Number",
                  })}
                </th>
                <th>
                  {t("designs.contributor.fields.percentage", {
                    defaultValue: "Percentage",
                  })}
                </th>
                <th>
                  {t("designs.contributor.fields.money", {
                    defaultValue: "Contributor Money",
                  })}
                </th>
                <th>{t("common.actions", { defaultValue: "Actions" })}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    {t("common.loading", { defaultValue: "Loading..." })}
                  </td>
                </tr>
              ) : contributorList.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    {t("designs.contributor.empty", {
                      defaultValue: "No contributors created yet.",
                    })}
                  </td>
                </tr>
              ) : (
                contributorList.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.fatherName}</td>
                    <td>{row.phoneNumber}</td>
                    <td>{`${Number(row.percentage || 0).toFixed(2)}%`}</td>
                    <td>
                      {formatCurrency(row.contributorMoney || 0, language)}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() =>
                            openPasswordModal({
                              action: "verify-edit",
                              contributor: row,
                            })
                          }
                        >
                          <LuPencil size={12} />
                          {t("common.edit", { defaultValue: "Edit" })}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() =>
                            openPasswordModal({
                              action: "verify-delete",
                              contributor: row,
                            })
                          }
                          style={{
                            color: "var(--danger-strong)",
                            borderColor: "var(--danger-soft-border)",
                          }}
                        >
                          <LuTrash2 size={12} />
                          {t("common.delete", { defaultValue: "Delete" })}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="contributor-mobile-list">
          {isLoading ? (
            <p className="contributor-empty-msg">
              {t("common.loading", { defaultValue: "Loading..." })}
            </p>
          ) : contributorList.length === 0 ? (
            <p className="contributor-empty-msg">
              {t("designs.contributor.empty", {
                defaultValue: "No contributors created yet.",
              })}
            </p>
          ) : (
            contributorList.map((row) => (
              <div key={row.id} className="contributor-mobile-card">
                <div className="contributor-mobile-card__hd">
                  <div>
                    <p>{row.name}</p>
                    <span>{row.fatherName}</span>
                  </div>
                  <div
                    style={{ display: "flex", gap: 6, alignItems: "center" }}
                  >
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        openPasswordModal({
                          action: "verify-edit",
                          contributor: row,
                        })
                      }
                    >
                      <LuPencil size={12} />
                      {t("common.edit", { defaultValue: "Edit" })}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        openPasswordModal({
                          action: "verify-delete",
                          contributor: row,
                        })
                      }
                      style={{
                        color: "var(--danger-strong)",
                        borderColor: "var(--danger-soft-border)",
                      }}
                    >
                      <LuTrash2 size={12} />
                      {t("common.delete", { defaultValue: "Delete" })}
                    </button>
                  </div>
                </div>
                <div className="contributor-mobile-grid">
                  <div>
                    <label>
                      {t("designs.contributor.fields.phoneNumber", {
                        defaultValue: "Phone Number",
                      })}
                    </label>
                    <strong>{row.phoneNumber}</strong>
                  </div>
                  <div>
                    <label>
                      {t("designs.contributor.fields.percentage", {
                        defaultValue: "Percentage",
                      })}
                    </label>
                    <strong>{`${Number(row.percentage || 0).toFixed(2)}%`}</strong>
                  </div>
                  <div>
                    <label>
                      {t("designs.contributor.fields.money", {
                        defaultValue: "Contributor Money",
                      })}
                    </label>
                    <strong>
                      {formatCurrency(row.contributorMoney || 0, language)}
                    </strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeEditorModal}
        title={
          editing
            ? t("designs.contributor.edit", {
                defaultValue: "Edit Contributor",
              })
            : t("designs.contributor.create", {
                defaultValue: "Create Contributor",
              })
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="lbl">
              {t("designs.contributor.fields.name", {
                defaultValue: "Contributor Name",
              })}
            </label>
            <input
              className="inp"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("designs.contributor.placeholders.name", {
                defaultValue: "Enter contributor name",
              })}
            />
          </div>

          <div>
            <label className="lbl">
              {t("designs.contributor.fields.fatherName", {
                defaultValue: "Contributor Father Name",
              })}
            </label>
            <input
              className="inp"
              value={form.fatherName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fatherName: e.target.value }))
              }
              placeholder={t("designs.contributor.placeholders.fatherName", {
                defaultValue: "Enter contributor father name",
              })}
            />
          </div>

          <div>
            <label className="lbl">
              {t("designs.contributor.fields.percentage", {
                defaultValue: "Percentage",
              })}
            </label>
            <input
              className="inp"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.percentage}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, percentage: e.target.value }))
              }
              placeholder={t("designs.contributor.placeholders.percentage", {
                defaultValue: "Enter percentage",
              })}
            />
          </div>

          <div>
            <label className="lbl">
              {t("designs.contributor.fields.phoneNumber", {
                defaultValue: "Phone Number",
              })}
            </label>
            <input
              className="inp"
              value={form.phoneNumber}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
              }
              placeholder={t("designs.contributor.placeholders.phoneNumber", {
                defaultValue: "Enter phone number",
              })}
            />
          </div>

          {editing ? null : (
            <div>
              <label className="lbl">
                {t("designs.contributor.fields.password", {
                  defaultValue: "Password",
                })}
              </label>
              <input
                className="inp"
                type="text"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder={t("designs.contributor.placeholders.password", {
                  defaultValue: "Enter password",
                })}
              />
            </div>
          )}

          {formError ? (
            <p className="contributor-form-error">{formError}</p>
          ) : null}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-outline"
              style={{ flex: 1 }}
              disabled={isSubmitting}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-gold"
              style={{ flex: 1 }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("customersPage.saving", { defaultValue: "Saving..." })
                : t("common.save", { defaultValue: "Save" })}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={authModalOpen} onClose={closeAuthModal} title={authTitle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--text2)" }}>{authMessage}</p>

          <div>
            <label className="lbl">
              {t("designs.contributor.fields.password", {
                defaultValue: "Password",
              })}
            </label>
            <input
              className="inp"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder={t("designs.contributor.placeholders.password", {
                defaultValue: "Enter password",
              })}
            />
          </div>

          {authError ? (
            <p className="contributor-form-error">{authError}</p>
          ) : null}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={closeAuthModal}
              className="btn btn-outline"
              style={{ flex: 1 }}
              disabled={isSubmitting}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              onClick={handleConfirmWithPassword}
              className="btn btn-gold"
              style={{ flex: 1 }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("customersPage.saving", { defaultValue: "Saving..." })
                : t("common.confirm", { defaultValue: "Confirm" })}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title={t("designs.contributor.deleteTitle", {
          defaultValue: t("common.delete", { defaultValue: "Delete" }),
        })}
        message={t("designs.contributor.deleteConfirm", {
          name: deleteItem?.name || "",
          defaultValue:
            'Delete contributor "{{name}}" permanently? This action cannot be undone.',
        })}
        itemName={deleteItem?.name || ""}
        isPending={deleteMut.isPending}
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
    <div className="card designs-card" style={{ overflow: "hidden" }}>
      <div style={{ height: 3, background: model.color }} />
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
          <div
            className="designs-chip-wrap"
            style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
          >
            {data.map((item) => (
              <div
                key={item.id}
                className="designs-chip"
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

function ReadyMadeClothingSection() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language;
  const { isAdmin } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    clothingCode: "",
    originalPrice: "",
    description: "",
    quantity: "1",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["ready-made-clothing"],
    queryFn: () => api.get("/designs/ready-made-clothing").then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (payload) => api.post("/designs/ready-made-clothing", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ready-made-clothing"] });
      setModalOpen(false);
      setEditing(null);
      setForm({
        clothingCode: "",
        originalPrice: "",
        description: "",
        quantity: "1",
      });
      toast.success(
        t("designs.readyMade.created", {
          defaultValue: "Ready-made clothing created.",
        }),
      );
    },
    onError: (err) => {
      setFormError(getApiErrorMessage(err));
    },
  });

  const updateMut = useMutation({
    mutationFn: (payload) =>
      api.put(`/designs/ready-made-clothing/${editing.id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ready-made-clothing"] });
      setModalOpen(false);
      setEditing(null);
      setForm({
        clothingCode: "",
        originalPrice: "",
        description: "",
        quantity: "1",
      });
      toast.success(
        t("designs.readyMade.updated", {
          defaultValue: "Ready-made clothing updated.",
        }),
      );
    },
    onError: (err) => {
      setFormError(getApiErrorMessage(err));
    },
  });

  const deleteMut = useMutation({
    mutationFn: () =>
      api.delete(`/designs/ready-made-clothing/${deleteItem.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ready-made-clothing"] });
      setDeleteItem(null);
      toast.success(
        t("designs.readyMade.deleted", {
          defaultValue: "Ready-made clothing deleted.",
        }),
      );
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      clothingCode: "",
      originalPrice: "",
      description: "",
      quantity: "1",
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      clothingCode: item.clothingCode,
      originalPrice: String(item.originalPrice),
      description: item.description || "",
      quantity: String(item.quantity ?? 1),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.clothingCode.trim()) {
      setFormError(
        t("designs.readyMade.codeRequired", {
          defaultValue: "Clothing code is required.",
        }),
      );
      return;
    }
    const price = parseFloat(form.originalPrice);
    if (!form.originalPrice || isNaN(price) || price < 0) {
      setFormError(
        t("designs.readyMade.priceRequired", {
          defaultValue: "Valid original price is required.",
        }),
      );
      return;
    }
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setFormError(
        t("designs.readyMade.quantityRequired", {
          defaultValue: "Valid quantity is required.",
        }),
      );
      return;
    }
    const payload = {
      clothingCode: form.clothingCode.trim(),
      originalPrice: price,
      description: form.description.trim() || undefined,
      quantity,
    };
    if (editing) updateMut.mutate(payload);
    else createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button type="button" className="btn btn-gold" onClick={openCreate}>
          <LuPlus size={15} />
          {t("designs.readyMade.addNew", { defaultValue: "Add Clothing" })}
        </button>
      </div>

      {isLoading && (
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          {t("common.loading", { defaultValue: "Loading..." })}
        </p>
      )}

      {!isLoading && items.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
          {t("designs.readyMade.empty", {
            defaultValue: "No ready-made clothing records yet.",
          })}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid var(--border2)",
              borderRadius: 10,
              padding: "12px 16px",
              background: "var(--surface2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {item.clothingCode}
              </span>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                {t("designs.readyMade.quantity", { defaultValue: "Quantity" })}:{" "}
                {item.quantity ?? 0}
              </span>
              {item.description && (
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {item.description}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--primary)",
                }}
              >
                {formatCurrency(item.originalPrice, language)}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: "5px 10px" }}
                onClick={() => openEdit(item)}
              >
                <LuPencil size={13} />
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{
                    padding: "5px 10px",
                    color: "#dc2626",
                    borderColor: "#dc2626",
                  }}
                  onClick={() => setDeleteItem(item)}
                >
                  <LuTrash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={
          editing
            ? t("designs.readyMade.editTitle", {
                defaultValue: "Edit Clothing",
              })
            : t("designs.readyMade.addTitle", {
                defaultValue: "Add Ready-Made Clothing",
              })
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {formError && <div className="info-box ib-red">{formError}</div>}
          <div>
            <label className="lbl">
              {t("designs.readyMade.clothingCode", {
                defaultValue: "Clothing Code",
              })}
            </label>
            <input
              className="inp"
              value={form.clothingCode}
              onChange={(e) => {
                setForm((f) => ({ ...f, clothingCode: e.target.value }));
                setFormError("");
              }}
              placeholder="e.g. RM-001"
            />
          </div>
          <div>
            <label className="lbl">
              {t("designs.readyMade.originalPrice", {
                defaultValue: "Original Price",
              })}
            </label>
            <input
              className="inp"
              type="number"
              min="0"
              value={form.originalPrice}
              onChange={(e) => {
                setForm((f) => ({ ...f, originalPrice: e.target.value }));
                setFormError("");
              }}
              placeholder="0"
            />
          </div>
          <div>
            <label className="lbl">
              {t("designs.readyMade.quantity", { defaultValue: "Quantity" })}
            </label>
            <input
              className="inp"
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(e) => {
                setForm((f) => ({ ...f, quantity: e.target.value }));
                setFormError("");
              }}
              placeholder="1"
            />
          </div>
          <div>
            <label className="lbl">
              {t("designs.readyMade.description", {
                defaultValue: "Description (optional)",
              })}
            </label>
            <textarea
              className="inp"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder={t("designs.readyMade.descriptionPlaceholder", {
                defaultValue: "Brief description...",
              })}
              style={{ resize: "vertical", minHeight: 64 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              disabled={isPending}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-gold"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending
                ? t("common.saving", { defaultValue: "Saving..." })
                : t("common.save")}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteMut.mutate()}
        itemName={deleteItem?.clothingCode || ""}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}

function ReadyMadeWaskatSection() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language;
  const { isAdmin } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    waskatCode: "",
    originalPrice: "",
    description: "",
    quantity: "1",
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["ready-made-waskat-clothing"],
    queryFn: () =>
      api.get("/designs/ready-made-waskat-clothing").then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (payload) =>
      api.post("/designs/ready-made-waskat-clothing", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ready-made-waskat-clothing"] });
      setModalOpen(false);
      setEditing(null);
      setForm({
        waskatCode: "",
        originalPrice: "",
        description: "",
        quantity: "1",
      });
      toast.success(
        t("designs.readyMadeWaskat.created", {
          defaultValue: "Ready-made waskat created.",
        }),
      );
    },
    onError: (err) => {
      setFormError(getApiErrorMessage(err));
    },
  });

  const updateMut = useMutation({
    mutationFn: (payload) =>
      api.put(`/designs/ready-made-waskat-clothing/${editing.id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ready-made-waskat-clothing"] });
      setModalOpen(false);
      setEditing(null);
      setForm({
        waskatCode: "",
        originalPrice: "",
        description: "",
        quantity: "1",
      });
      toast.success(
        t("designs.readyMadeWaskat.updated", {
          defaultValue: "Ready-made waskat updated.",
        }),
      );
    },
    onError: (err) => {
      setFormError(getApiErrorMessage(err));
    },
  });

  const deleteMut = useMutation({
    mutationFn: () =>
      api.delete(`/designs/ready-made-waskat-clothing/${deleteItem.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ready-made-waskat-clothing"] });
      setDeleteItem(null);
      toast.success(
        t("designs.readyMadeWaskat.deleted", {
          defaultValue: "Ready-made waskat deleted.",
        }),
      );
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      waskatCode: "",
      originalPrice: "",
      description: "",
      quantity: "1",
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      waskatCode: item.waskatCode,
      originalPrice: String(item.originalPrice),
      description: item.description || "",
      quantity: String(item.quantity ?? 1),
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.waskatCode.trim()) {
      setFormError(
        t("designs.readyMadeWaskat.codeRequired", {
          defaultValue: "Waskat code is required.",
        }),
      );
      return;
    }
    const price = parseFloat(form.originalPrice);
    if (!form.originalPrice || isNaN(price) || price < 0) {
      setFormError(
        t("designs.readyMadeWaskat.priceRequired", {
          defaultValue: "Valid original price is required.",
        }),
      );
      return;
    }
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setFormError(
        t("designs.readyMadeWaskat.quantityRequired", {
          defaultValue: "Valid quantity is required.",
        }),
      );
      return;
    }
    const payload = {
      waskatCode: form.waskatCode.trim(),
      originalPrice: price,
      description: form.description.trim() || undefined,
      quantity,
    };
    if (editing) updateMut.mutate(payload);
    else createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button type="button" className="btn btn-gold" onClick={openCreate}>
          <LuPlus size={15} />
          {t("designs.readyMadeWaskat.addNew", {
            defaultValue: "Add Waskat",
          })}
        </button>
      </div>

      {isLoading && (
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          {t("common.loading", { defaultValue: "Loading..." })}
        </p>
      )}

      {!isLoading && items.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
          {t("designs.readyMadeWaskat.empty", {
            defaultValue: "No ready-made waskat records yet.",
          })}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid var(--border2)",
              borderRadius: 10,
              padding: "12px 16px",
              background: "var(--surface2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {item.waskatCode}
              </span>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                {t("designs.readyMadeWaskat.quantity", {
                  defaultValue: "Quantity",
                })}
                : {item.quantity ?? 0}
              </span>
              {item.description && (
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {item.description}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--primary)",
                }}
              >
                {formatCurrency(item.originalPrice, language)}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: "5px 10px" }}
                onClick={() => openEdit(item)}
              >
                <LuPencil size={13} />
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{
                    padding: "5px 10px",
                    color: "#dc2626",
                    borderColor: "#dc2626",
                  }}
                  onClick={() => setDeleteItem(item)}
                >
                  <LuTrash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={
          editing
            ? t("designs.readyMadeWaskat.editTitle", {
                defaultValue: "Edit Waskat",
              })
            : t("designs.readyMadeWaskat.addTitle", {
                defaultValue: "Add Ready-Made Waskat",
              })
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {formError && <div className="info-box ib-red">{formError}</div>}
          <div>
            <label className="lbl">
              {t("designs.readyMadeWaskat.waskatCode", {
                defaultValue: "Waskat Code",
              })}
            </label>
            <input
              className="inp"
              value={form.waskatCode}
              onChange={(e) => {
                setForm((f) => ({ ...f, waskatCode: e.target.value }));
                setFormError("");
              }}
              placeholder="e.g. RMW-001"
            />
          </div>
          <div>
            <label className="lbl">
              {t("designs.readyMadeWaskat.originalPrice", {
                defaultValue: "Original Price",
              })}
            </label>
            <input
              className="inp"
              type="number"
              min="0"
              value={form.originalPrice}
              onChange={(e) => {
                setForm((f) => ({ ...f, originalPrice: e.target.value }));
                setFormError("");
              }}
              placeholder="0"
            />
          </div>
          <div>
            <label className="lbl">
              {t("designs.readyMadeWaskat.quantity", {
                defaultValue: "Quantity",
              })}
            </label>
            <input
              className="inp"
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(e) => {
                setForm((f) => ({ ...f, quantity: e.target.value }));
                setFormError("");
              }}
              placeholder="1"
            />
          </div>
          <div>
            <label className="lbl">
              {t("designs.readyMadeWaskat.description", {
                defaultValue: "Description (optional)",
              })}
            </label>
            <textarea
              className="inp"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder={t("designs.readyMadeWaskat.descriptionPlaceholder", {
                defaultValue: "Brief description...",
              })}
              style={{ resize: "vertical", minHeight: 64 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              disabled={isPending}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-gold"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending
                ? t("common.saving", { defaultValue: "Saving..." })
                : t("common.save")}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteMut.mutate()}
        itemName={deleteItem?.waskatCode || ""}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}

export default function Designs() {
  const { t } = useTranslation();
  const { isAdmin, isFinance } = useAuth();
  const [activeTab, setActiveTab] = useState("OUTFIT");
  const availableTabs = useMemo(
    () =>
      PAGE_TABS.filter((tab) => {
        if (tab === "CONTRIBUTOR") return isAdmin;
        if (tab === "READY_MADE" || tab === "READY_MADE_WASKAT") {
          return isAdmin || isFinance;
        }
        return true;
      }),
    [isAdmin, isFinance],
  );

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] || "OUTFIT");
    }
  }, [activeTab, availableTabs]);

  const tabLabels = {
    OUTFIT: t("designs.tabs.outfit", { defaultValue: "Outfit" }),
    WASKAT: t("designs.tabs.waskat", { defaultValue: "Waskat" }),
    CONTRIBUTOR: t("designs.tabs.contributor", { defaultValue: "Contributor" }),
    YAKHANQAQ: t("designs.tabs.yakhanaqq", { defaultValue: "یخن قاق" }),
    READY_MADE: t("designs.tabs.readyMade", { defaultValue: "Ready-Made" }),
    READY_MADE_WASKAT: t("designs.tabs.readyMadeWaskat", {
      defaultValue: "Ready-Made Waskat",
    }),
    ITEMS: t("designs.tabs.items", { defaultValue: "Items" }),
  };

  const modelsToShow = (TAB_GROUPS[activeTab] || [])
    .map((k) => DESIGN_MODELS.find((m) => m.key === k))
    .map((model) =>
      model
        ? {
            ...model,
            label: t(model.labelKey, { defaultValue: model.fallback }),
          }
        : model,
    )
    .filter(Boolean);

  return (
    <div className="page">
      <PageHeader
        title={t("designs.title", { defaultValue: "Design Management" })}
        subtitle={t("designs.subtitle", {
          defaultValue: "Manage outfit styles, designs, and contributors.",
        })}
      />

      <div
        className="design-tabs"
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        {availableTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`design-tab-btn ${activeTab === tab ? "btn btn-gold" : "btn btn-outline"}`}
            style={{ minWidth: 100, flex: "1 1 auto" }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === "CONTRIBUTOR" ? (
        <ContributorSection />
      ) : activeTab === "READY_MADE" ? (
        <ReadyMadeClothingSection />
      ) : activeTab === "READY_MADE_WASKAT" ? (
        <ReadyMadeWaskatSection />
      ) : activeTab === "ITEMS" ? (
        <ItemsTab />
      ) : (
        <div className="g-designs designs-grid">
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
