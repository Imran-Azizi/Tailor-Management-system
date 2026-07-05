import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuUserPlus,
  LuPencil,
  LuTrash2,
  LuShieldCheck,
  LuUser,
  LuX,
  LuPhone,
  LuLock,
  LuEye,
  LuEyeOff,
  LuUsers,
  LuToggleLeft,
  LuToggleRight,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ConfirmDeleteModal } from "../components/ui/index.jsx";

const ROLE_COLORS = {
  ADMIN: "#2563EB",
  DOKAN: "#7C3AED",
  DOKHT: "#DB2777",
  QICHIKAR: "#D97706",
  FINANCE: "#059669",
};

const ROLES = ["ADMIN", "DOKAN", "DOKHT", "QICHIKAR", "FINANCE"];
const EMPTY_NEW_USER_FORM = {
  name: "",
  phoneNumber: "",
  accountType: "",
  password: "",
  isActive: true,
};

function getRoleLabel(role, t) {
  return t(`users.roles.${String(role || "").toLowerCase()}`, {
    defaultValue: role,
  });
}

function RoleBadge({ role, label }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 9px",
        borderRadius: 99,
        background: (ROLE_COLORS[role] || "#888") + "18",
        color: ROLE_COLORS[role] || "#888",
        border: `1px solid ${ROLE_COLORS[role] || "#888"}30`,
      }}
    >
      {label || role}
    </span>
  );
}

function UserModal({ user, hasAdmin, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() =>
    user
      ? {
          name: user.name || "",
          phoneNumber: user.phoneNumber || "",
          accountType: user.accountType || "",
          password: "",
          isActive: user.isActive ?? true,
        }
      : { ...EMPTY_NEW_USER_FORM },
  );
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user && !form.password) {
      toast.error(t("users.passwordRequired"));
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error(t("users.passwordMin"));
      return;
    }
    if (
      form.accountType === "ADMIN" &&
      hasAdmin &&
      user?.accountType !== "ADMIN"
    ) {
      toast.error(t("users.singleAdminOnly"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phoneNumber: form.phoneNumber,
        accountType: form.accountType,
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;
      if (user) {
        const { data } = await api.put(`/users/${user.id}`, payload);
        onSaved(data);
        toast.success(t("users.updated"));
      } else {
        const { data } = await api.post("/users", payload);
        onSaved(data);
        toast.success(t("users.created"));
      }
      onClose();
    } catch (err) {
      toast.error(
        err?.response?.data?.code === "TENANT_ADMIN_EXISTS"
          ? t("users.singleAdminOnly")
          : getApiErrorMessage(err, t("users.saveFailed")),
      );
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--surface2)",
    color: "var(--text1)",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    direction: "inherit",
    textAlign: "start",
  };

  const docDir =
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("dir") || "ltr"
      : "ltr";
  const isRtl = docDir === "rtl";

  return (
    <div
      dir={docDir}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "clamp(16px, 4vw, 28px)",
          width: "100%",
          maxWidth: 440,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--sh-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 22,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>
            {user ? t("users.editUser") : t("users.newUser")}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text3)",
            }}
          >
            <LuX size={18} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Name */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text2)",
                display: "block",
                marginBottom: 5,
              }}
            >
              {t("users.name", "Full Name")}
            </label>
            <input
              name={user ? `edit-user-name-${user.id}` : "new-user-name"}
              autoComplete="off"
              style={inputStyle}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={t("users.namePlaceholder")}
              required
            />
          </div>
          {/* Phone */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text2)",
                display: "block",
                marginBottom: 5,
              }}
            >
              {t("common.phone", "Phone")}
            </label>
            <div className="iw" style={{ position: "relative" }}>
              <LuPhone
                size={14}
                style={{
                  position: "absolute",
                  insetInlineStart: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                }}
              />
              <input
                name={user ? `edit-user-phone-${user.id}` : "new-user-phone"}
                autoComplete="off"
                className="inp with-leading-icon"
                style={inputStyle}
                value={form.phoneNumber}
                onChange={(e) => set("phoneNumber", e.target.value)}
                placeholder="0700000000"
                required
              />
            </div>
          </div>
          {/* Role */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text2)",
                display: "block",
                marginBottom: 5,
              }}
            >
              {t("users.role", "Role")}
            </label>
            <select
              name={user ? `edit-user-role-${user.id}` : "new-user-role"}
              autoComplete="off"
              style={inputStyle}
              value={form.accountType}
              onChange={(e) => set("accountType", e.target.value)}
              required
            >
              {!form.accountType && (
                <option value="" disabled>
                  {t("users.selectRole")}
                </option>
              )}
              {ROLES.map((r) => (
                <option
                  key={r}
                  value={r}
                  disabled={
                    r === "ADMIN" &&
                    hasAdmin &&
                    user?.accountType !== "ADMIN"
                  }
                >
                  {getRoleLabel(r, t)}
                </option>
              ))}
            </select>
          </div>
          {/* Password */}
          <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text2)",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                {t("auth.password")}{" "}
                <span style={{ color: "var(--text3)", fontWeight: 400 }}>
                  (
                  {user
                    ? t("users.leaveBlank")
                    : t("users.passwordRequired")}
                  )
                </span>
              </label>
              <div className="iw" style={{ position: "relative" }}>
                <LuLock
                  size={14}
                  style={{
                    position: "absolute",
                    left: isRtl ? 10 : 10,
                    right: "auto",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text3)",
                  }}
                />
                <input
                  className="inp with-leading-icon with-trailing-icon"
                  style={{
                    ...inputStyle,
                    paddingLeft: isRtl ? 36 : 36,
                    paddingRight: isRtl ? 36 : 36,
                  }}
                  type={showPw ? "text" : "password"}
                  name={
                    user
                      ? `edit-user-password-${user.id}`
                      : "new-user-password"
                  }
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="******"
                  required={!user}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 10,
                    left: "auto",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text3)",
                    display: "flex",
                  }}
                >
                  {showPw ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                </button>
              </div>
              {form.password.length > 0 && form.password.length < 6 && (
                <p
                  style={{ fontSize: 11, color: "#DC2626", margin: "4px 0 0" }}
                >
                  {t("users.passwordMin")}
                </p>
              )}
          </div>
          {/* Active toggle */}
          {user && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                fontSize: 14,
                color: "var(--text1)",
              }}
            >
              <span
                style={{ color: form.isActive ? "#16a34a" : "var(--text3)" }}
              >
                {form.isActive ? (
                  <LuToggleRight size={22} />
                ) : (
                  <LuToggleLeft size={22} />
                )}
              </span>
              {form.isActive ? t("users.active") : t("users.inactive")}
              <input
                type="checkbox"
                hidden
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
              />
            </label>
          )}
          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "9px 0",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
                color: "var(--text2)",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                padding: "9px 0",
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { t } = useTranslation();
  const { user: me, hasPermission } = useAuth();
  const canCreateUsers = hasPermission(PERMISSIONS.USERS_CREATE);
  const canEditUsers = hasPermission(PERMISSIONS.USERS_EDIT);
  const canDeleteUsers = hasPermission(PERMISSIONS.USERS_DELETE);
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'new' | userObj
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.deleted"));
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("users.deleteFailed"))),
  });

  const handleSaved = () => qc.invalidateQueries({ queryKey: ["users"] });
  const hasAdmin = users.some((user) => user.accountType === "ADMIN");

  const confirmDelete = (u) => {
    if (u.id === me?.id) {
      toast.error(t("users.cannotDeleteSelf"));
      return;
    }
    setDeleteUserTarget(u);
  };

  return (
    <div
      className="page"
      style={{
        padding: "20px 18px 56px",
        maxWidth: 1240,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "14px 16px",
          boxShadow: "var(--sh)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LuUsers size={20} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{t("users.title")}</h1>
          <span
            style={{
              fontSize: 12,
              padding: "2px 8px",
              background: "var(--primary-100)",
              color: "var(--primary)",
              borderRadius: 99,
              fontWeight: 600,
            }}
          >
            {users.length}
          </span>
        </div>
        {canCreateUsers ? (
          <button
            onClick={() => setModal("new")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 16px",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LuUserPlus size={15} />
            {t("users.addUser")}
          </button>
        ) : null}
      </div>

      {/* Table */}
      {isLoading ? (
        <p style={{ color: "var(--text3)", textAlign: "center", padding: 40 }}>
          {t("common.loading")}
        </p>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="tbl-wrap">
            <table className="tbl" style={{ minWidth: 560 }}>
              <thead>
                <tr className="" style={{ background: "var(--surface2)" }}>
                  {[
                    t("users.name", "Full Name"),
                    t("common.phone", "Phone"),
                    t("users.role", "Role"),
                    t("users.orders", "Orders"),
                    t("common.status", "Status"),
                    t("common.actions", "Actions"),
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background:
                              (ROLE_COLORS[u.accountType] || "#888") + "20",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {u.accountType === "ADMIN" ? (
                            <LuShieldCheck
                              size={14}
                              style={{ color: ROLE_COLORS.ADMIN }}
                            />
                          ) : (
                            <LuUser
                              size={14}
                              style={{
                                color: ROLE_COLORS[u.accountType] || "#888",
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--text1)",
                            }}
                          >
                            {u.name}
                          </p>
                          {u.id === me?.id && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--primary)",
                                fontWeight: 500,
                              }}
                            >
                              {t("users.you")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text2)" }}>
                      {u.phoneNumber}
                    </td>
                    <td>
                      <RoleBadge
                        role={u.accountType}
                        label={getRoleLabel(u.accountType, t)}
                      />
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text2)" }}>
                      {u._count?.assignedOrders ?? 0}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: u.isActive ? "#16a34a18" : "#ef444418",
                          color: u.isActive ? "#16a34a" : "#ef4444",
                        }}
                      >
                        {u.isActive ? t("users.active") : t("users.inactive")}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {canEditUsers ? (
                          <button
                            onClick={() => setModal(u)}
                            style={{
                              padding: "5px 8px",
                              background: "var(--surface2)",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              cursor: "pointer",
                              color: "var(--text2)",
                              display: "flex",
                            }}
                          >
                            <LuPencil size={13} />
                          </button>
                        ) : null}
                        {canDeleteUsers ? (
                          <button
                            onClick={() => confirmDelete(u)}
                            disabled={u.id === me?.id}
                            style={{
                              padding: "5px 8px",
                              background: "#ef444410",
                              border: "1px solid #ef444430",
                              borderRadius: 6,
                              cursor: u.id === me?.id ? "not-allowed" : "pointer",
                              color: "#ef4444",
                              display: "flex",
                              opacity: u.id === me?.id ? 0.4 : 1,
                            }}
                          >
                            <LuTrash2 size={13} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: 40,
                        textAlign: "center",
                        color: "var(--text3)",
                        fontSize: 14,
                      }}
                    >
                      {t("common.noData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <UserModal
          key={modal === "new" ? "new-user" : modal.id}
          user={modal === "new" ? null : modal}
          hasAdmin={hasAdmin}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDeleteModal
        open={!!deleteUserTarget}
        onClose={() => setDeleteUserTarget(null)}
        onConfirm={() => {
          if (!deleteUserTarget) return;
          deleteMut.mutate(deleteUserTarget.id, {
            onSettled: () => setDeleteUserTarget(null),
          });
        }}
        title={t("users.deleteTitle", { defaultValue: t("common.delete") })}
        message={t("users.confirmDelete", {
          name: deleteUserTarget?.name || "-",
        })}
        itemName={
          deleteUserTarget
            ? `${deleteUserTarget.name || ""} (${deleteUserTarget.accountType || "-"})`
            : ""
        }
        isPending={deleteMut.isPending}
      />
    </div>
  );
}
