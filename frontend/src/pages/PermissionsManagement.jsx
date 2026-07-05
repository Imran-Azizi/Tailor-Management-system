import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuBadgeCheck,
  LuChevronDown,
  LuChevronsDown,
  LuChevronsUp,
  LuLock,
  LuRefreshCw,
  LuSave,
  LuSearch,
  LuShieldCheck,
  LuSlidersHorizontal,
  LuUndo2,
  LuUserCog,
} from "react-icons/lu";
import api from "../lib/api.js";
import { PERMISSION_CATEGORIES, dedupeCategoryItems, HIDDEN_UI_PERMISSION_CODES } from "../lib/permissionCategories.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { isRtlLanguage } from "../lib/locale.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorState, PageHeader, Spinner } from "../components/ui/index.jsx";

const ROLE_COLORS = {
  DOKAN: "#0D9488",
  FINANCE: "#059669",
};

function roleLabel(role, t) {
  return t(`users.roles.${String(role || "").toLowerCase()}`, {
    defaultValue: role,
  });
}

function permissionLabel(code, t) {
  return t(`permissions.labels.${code}`, {
    defaultValue: code,
  });
}

function sameCodeSets(a, b) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((code) => set.has(code));
}

function uniqueCodes(items) {
  return [...new Set(items.map((item) => item.permission))];
}

function GroupCheckbox({ checked, indeterminate, disabled, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label
      className="permissions-group-selectall"
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function PermissionItem({ item, checked, disabled, onToggle, t, hideSubtitle }) {
  const Icon = item.icon || LuShieldCheck;
  const isPage = item.type === "page";
  const title = item.usePermissionLabel || !isPage
    ? permissionLabel(item.permission, t)
    : t(item.labelKey, item.fallback);
  const showSubtitle =
    !hideSubtitle && !item.hideSubtitle && isPage && !item.usePermissionLabel;
  const subtitle = showSubtitle ? permissionLabel(item.permission, t) : null;
  return (
    <label
      className={`permission-switch${checked ? " is-on" : ""}${
        disabled ? " is-disabled" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onToggle(item.permission, event.target.checked)}
      />
      <span className="permission-switch-icon">
        <Icon size={15} />
      </span>
      <span className="permission-switch-copy">
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </label>
  );
}

export default function PermissionsManagement() {
  const { t, i18n } = useTranslation();
  const { user: currentUser, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [activeUserId, setActiveUserId] = useState(null);
  const [draftsByUser, setDraftsByUser] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const dir = isRtlLanguage(language) ? "rtl" : "ltr";

  const permissionsQuery = useQuery({
    queryKey: ["rbac-permissions"],
    queryFn: () => api.get("/rbac/permissions").then((res) => res.data.permissions || []),
  });

  const usersQuery = useQuery({
    queryKey: ["rbac-users", userSearch],
    queryFn: () =>
      api
        .get("/rbac/users", { params: { search: userSearch } })
        .then((res) => res.data.users || []),
    keepPreviousData: true,
  });

  const catalog = permissionsQuery.data || [];
  const allCodes = useMemo(() => catalog.map((permission) => permission.code), [catalog]);
  const visibleCodes = useMemo(
    () => allCodes.filter((code) => !HIDDEN_UI_PERMISSION_CODES.has(code)),
    [allCodes],
  );
  const visibleCodeSet = useMemo(() => new Set(visibleCodes), [visibleCodes]);
  const users = usersQuery.data || [];
  const activeUser = useMemo(
    () => users.find((user) => user.id === activeUserId) || users[0] || null,
    [activeUserId, users],
  );

  // Categories mirror the sidebar navigation. Only codes that actually exist
  // in the backend catalog are shown; codes not covered by the static map
  // fall into an automatic "Other" category so nothing becomes unmanageable.
  const categories = useMemo(() => {
    const available = new Set(visibleCodes);
    const covered = new Set();
    const mapped = PERMISSION_CATEGORIES.map((category) => {
      const items = dedupeCategoryItems(
        category.items.filter((item) => available.has(item.permission)),
      );
      for (const item of items) covered.add(item.permission);
      return items.length ? { ...category, items } : null;
    }).filter(Boolean);

    const leftover = visibleCodes.filter((code) => !covered.has(code));
    if (leftover.length) {
      mapped.push({
        key: "other",
        labelKey: "permissions.groups.other",
        fallback: "Other",
        icon: LuShieldCheck,
        items: leftover.map((code) => ({
          key: code,
          type: "action",
          icon: LuShieldCheck,
          permission: code,
        })),
      });
    }
    return mapped;
  }, [visibleCodes]);

  const serverCodes = useMemo(
    () => activeUser?.permissions || [],
    [activeUser],
  );
  const visibleServerCodes = useMemo(
    () => serverCodes.filter((code) => visibleCodeSet.has(code)),
    [serverCodes, visibleCodeSet],
  );
  const draft = activeUser ? draftsByUser[activeUser.id] : undefined;
  const selectedCodes = useMemo(
    () => new Set(draft ?? serverCodes),
    [draft, serverCodes],
  );
  const visibleSelectedCount = useMemo(
    () => visibleCodes.filter((code) => selectedCodes.has(code)).length,
    [visibleCodes, selectedCodes],
  );
  const isDirty = Boolean(
    activeUser &&
      draft &&
      !sameCodeSets(
        draft.filter((code) => visibleCodeSet.has(code)),
        visibleServerCodes,
      ),
  );
  const dirtyUserIds = useMemo(() => {
    const ids = new Set();
    for (const user of users) {
      const userDraft = draftsByUser[user.id];
      if (!userDraft) continue;
      const userVisibleServer = (user.permissions || []).filter((code) =>
        visibleCodeSet.has(code),
      );
      if (!sameCodeSets(
        userDraft.filter((code) => visibleCodeSet.has(code)),
        userVisibleServer,
      )) {
        ids.add(user.id);
      }
    }
    return ids;
  }, [users, draftsByUser, visibleCodeSet]);

  // A delegated manager (Dokan/Finance user granted permissions.manage) must
  // never edit their own permissions — the backend enforces this too.
  const isSelfLocked =
    Boolean(activeUser && currentUser && activeUser.id === currentUser.id) &&
    !isAdmin &&
    !isSuperAdmin;

  const normalizedSearch = permissionSearch.trim().toLowerCase();
  const visibleCategories = useMemo(() => {
    if (!normalizedSearch) return categories;
    return categories
      .map((category) => {
        const categoryText = t(category.labelKey, category.fallback).toLowerCase();
        if (categoryText.includes(normalizedSearch)) return category;
        const matching = category.items.filter((item) => {
          const menuText = item.labelKey
            ? t(item.labelKey, item.fallback || "").toLowerCase()
            : "";
          const permText = permissionLabel(item.permission, t).toLowerCase();
          return (
            menuText.includes(normalizedSearch) ||
            permText.includes(normalizedSearch) ||
            item.permission.toLowerCase().includes(normalizedSearch)
          );
        });
        return matching.length ? { ...category, items: matching } : null;
      })
      .filter(Boolean);
  }, [categories, normalizedSearch, t]);

  const saveMutation = useMutation({
    mutationFn: ({ userId, permissions }) =>
      api
        .put(`/rbac/users/${userId}/permissions`, { permissions })
        .then((res) => res.data),
    onSuccess: (data) => {
      queryClient.setQueryData(["rbac-users", userSearch], (current = []) =>
        current.map((user) =>
          user.id === data.userId ? { ...user, permissions: data.permissions } : user,
        ),
      );
      setDraftsByUser((current) => {
        const next = { ...current };
        delete next[data.userId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["rbac-users"] });
      toast.success(t("permissions.saved"));
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t("permissions.saveFailed")));
    },
  });

  const savingActive =
    saveMutation.isPending && saveMutation.variables?.userId === activeUser?.id;
  const editingDisabled = !activeUser || savingActive || isSelfLocked;

  useEffect(() => {
    if (!dirtyUserIds.size) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyUserIds.size]);

  const setDraft = (codes) => {
    if (!activeUser) return;
    setDraftsByUser((current) => ({
      ...current,
      [activeUser.id]: [...new Set(codes)].sort(),
    }));
  };

  const togglePermission = (code, enabled) => {
    if (editingDisabled) return;
    const next = new Set(selectedCodes);
    if (enabled) next.add(code);
    else next.delete(code);
    setDraft([...next]);
  };

  const toggleCategory = (category, enabled) => {
    if (editingDisabled) return;
    const next = new Set(selectedCodes);
    for (const code of uniqueCodes(category.items)) {
      if (enabled) next.add(code);
      else next.delete(code);
    }
    setDraft([...next]);
  };

  const discardChanges = () => {
    if (!activeUser) return;
    setDraftsByUser((current) => {
      const next = { ...current };
      delete next[activeUser.id];
      return next;
    });
  };

  const saveChanges = () => {
    if (!activeUser || !draft || savingActive) return;
    const hiddenFromServer = serverCodes.filter((code) =>
      HIDDEN_UI_PERMISSION_CODES.has(code),
    );
    const merged = [...new Set([...draft, ...hiddenFromServer])].sort();
    saveMutation.mutate({ userId: activeUser.id, permissions: merged });
  };

  const setAllGroupsCollapsed = (collapsed) => {
    const next = {};
    for (const category of categories) next[category.key] = collapsed;
    setCollapsedGroups(next);
  };

  const loading = permissionsQuery.isLoading || usersQuery.isLoading;

  return (
    <div className="page permissions-page" dir={dir}>
      <PageHeader
        title={t("permissions.title")}
        subtitle={t("permissions.subtitle")}
        action={
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              permissionsQuery.refetch();
              usersQuery.refetch();
            }}
          >
            <LuRefreshCw
              size={14}
              className={usersQuery.isFetching ? "permissions-spin" : undefined}
            />
            {t("common.refresh", "Refresh")}
          </button>
        }
      />

      {permissionsQuery.isError || usersQuery.isError ? (
        <ErrorState
          message={getApiErrorMessage(
            permissionsQuery.error || usersQuery.error,
            t("permissions.loadFailed", "Unable to load permissions."),
          )}
          action={
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                permissionsQuery.refetch();
                usersQuery.refetch();
              }}
            >
              <LuRefreshCw size={14} />
              {t("common.refresh", "Refresh")}
            </button>
          }
        />
      ) : loading ? (
        <Spinner />
      ) : (
        <div className="permissions-layout">
          <aside className="permissions-users">
            <div className="permissions-search">
              <LuSearch size={15} />
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder={t("permissions.searchPlaceholder")}
              />
            </div>

            <div className="permissions-user-list">
              {users.map((user) => {
                const active = user.id === activeUser?.id;
                const dirty = dirtyUserIds.has(user.id);
                return (
                  <button
                    type="button"
                    key={user.id}
                    className={`permissions-user${active ? " is-active" : ""}`}
                    onClick={() => setActiveUserId(user.id)}
                  >
                    <span className="permissions-user-avatar">
                      <LuUserCog size={18} />
                    </span>
                    <span className="permissions-user-copy">
                      <strong>
                        {user.name}
                        {dirty ? (
                          <em
                            className="permissions-dirty-dot"
                            title={t("permissions.unsavedBadge", "Unsaved changes")}
                          />
                        ) : null}
                      </strong>
                      <small>{user.phoneNumber}</small>
                    </span>
                    <span className="permissions-user-meta">
                      <span
                        className="permissions-role"
                        style={{
                          "--role-color": ROLE_COLORS[user.accountType] || "#64748b",
                        }}
                      >
                        {roleLabel(user.accountType, t)}
                      </span>
                      <small>
                        {t("permissions.userCount", {
                          count: (user.permissions || []).filter((code) =>
                            visibleCodeSet.has(code),
                          ).length,
                          total: visibleCodes.length,
                          defaultValue: "{{count}}/{{total}}",
                        })}
                      </small>
                    </span>
                  </button>
                );
              })}
              {!users.length ? (
                <div className="permissions-empty">{t("permissions.noUsers")}</div>
              ) : null}
            </div>
          </aside>

          <section className="permissions-editor">
            {activeUser ? (
              <>
                <header className="permissions-editor-head">
                  <div>
                    <p>{t("permissions.selectedUser")}</p>
                    <h2>{activeUser.name}</h2>
                    <span>{roleLabel(activeUser.accountType, t)}</span>
                  </div>
                  <div className="permissions-editor-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={editingDisabled}
                      onClick={() => {
                        const next = new Set(selectedCodes);
                        for (const code of visibleCodes) next.add(code);
                        setDraft([...next]);
                      }}
                    >
                      <LuBadgeCheck size={14} />
                      {t("permissions.enableAll")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={editingDisabled}
                      onClick={() => {
                        const next = new Set(selectedCodes);
                        for (const code of visibleCodes) next.delete(code);
                        setDraft([...next]);
                      }}
                    >
                      <LuSlidersHorizontal size={14} />
                      {t("permissions.disableAll")}
                    </button>
                  </div>
                </header>

                {isSelfLocked ? (
                  <div className="permissions-selflock">
                    <LuLock size={15} />
                    <span>
                      {t(
                        "permissions.selfEditBlocked",
                        "You cannot change your own permissions.",
                      )}
                    </span>
                  </div>
                ) : null}

                <div className="permissions-summary">
                  <LuShieldCheck size={17} />
                  <span>
                    {t("permissions.enabledCount", {
                      count: visibleSelectedCount,
                      total: visibleCodes.length,
                    })}
                  </span>
                  {savingActive ? <em>{t("permissions.saving")}</em> : null}
                </div>

                <div className="permissions-toolbar">
                  <div className="permissions-search permissions-search--inline">
                    <LuSearch size={15} />
                    <input
                      value={permissionSearch}
                      onChange={(event) => setPermissionSearch(event.target.value)}
                      placeholder={t(
                        "permissions.searchPermissionsPlaceholder",
                        "Search permissions...",
                      )}
                    />
                  </div>
                  <div className="permissions-toolbar-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setAllGroupsCollapsed(false)}
                    >
                      <LuChevronsDown size={14} />
                      {t("permissions.expandAll", "Expand all")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setAllGroupsCollapsed(true)}
                    >
                      <LuChevronsUp size={14} />
                      {t("permissions.collapseAll", "Collapse all")}
                    </button>
                  </div>
                </div>

                <div className="permissions-groups">
                  {visibleCategories.map((category) => {
                    const codes = uniqueCodes(category.items);
                    const enabledInGroup = codes.filter((code) =>
                      selectedCodes.has(code),
                    ).length;
                    const allEnabled = enabledInGroup === codes.length;
                    const someEnabled = enabledInGroup > 0 && !allEnabled;
                    const collapsed = normalizedSearch
                      ? false
                      : Boolean(collapsedGroups[category.key]);
                    const CategoryIcon = category.icon || LuShieldCheck;
                    const pageItems = category.items.filter(
                      (item) => item.type === "page",
                    );
                    const actionItems = category.items.filter(
                      (item) => item.type !== "page",
                    );
                    return (
                      <section
                        key={category.key}
                        className={`permissions-group${collapsed ? " is-collapsed" : ""}`}
                      >
                        <header
                          className="permissions-group-head"
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setCollapsedGroups((current) => ({
                              ...current,
                              [category.key]: !collapsed,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setCollapsedGroups((current) => ({
                                ...current,
                                [category.key]: !collapsed,
                              }));
                            }
                          }}
                        >
                          <span className="permissions-group-icon">
                            <CategoryIcon size={16} />
                          </span>
                          <span className="permissions-group-title">
                            <h3>{t(category.labelKey, category.fallback)}</h3>
                            <small>
                              {t("permissions.groupCount", {
                                count: enabledInGroup,
                                total: codes.length,
                                defaultValue: "{{count}}/{{total}} enabled",
                              })}
                            </small>
                          </span>
                          <GroupCheckbox
                            checked={allEnabled}
                            indeterminate={someEnabled}
                            disabled={editingDisabled}
                            onChange={(enabled) => toggleCategory(category, enabled)}
                            label={t("permissions.selectAll", "Select all")}
                          />
                          <span className="permissions-group-chevron">
                            <LuChevronDown size={16} />
                          </span>
                        </header>
                        {!collapsed ? (
                          <div className="permissions-group-body">
                            {pageItems.length ? (
                              <>
                                {actionItems.length ? (
                                  <p className="permissions-subheading">
                                    {t("permissions.pagesHeading", "Page access")}
                                  </p>
                                ) : null}
                                <div className="permissions-grid">
                                  {pageItems.map((item) => (
                                    <PermissionItem
                                      key={item.key}
                                      item={item}
                                      checked={selectedCodes.has(item.permission)}
                                      disabled={editingDisabled}
                                      onToggle={togglePermission}
                                      hideSubtitle={category.hidePageSubtitles}
                                      t={t}
                                    />
                                  ))}
                                </div>
                              </>
                            ) : null}
                            {actionItems.length ? (
                              <>
                                {pageItems.length ? (
                                  <p className="permissions-subheading">
                                    {t(
                                      "permissions.actionsHeading",
                                      "Action permissions",
                                    )}
                                  </p>
                                ) : null}
                                <div className="permissions-grid">
                                  {actionItems.map((item) => (
                                    <PermissionItem
                                      key={item.key}
                                      item={item}
                                      checked={selectedCodes.has(item.permission)}
                                      disabled={editingDisabled}
                                      onToggle={togglePermission}
                                      t={t}
                                    />
                                  ))}
                                </div>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                  {!visibleCategories.length ? (
                    <div className="permissions-empty">
                      {t(
                        "permissions.noMatches",
                        "No permissions match your search.",
                      )}
                    </div>
                  ) : null}
                </div>

                {isDirty ? (
                  <div className="permissions-savebar">
                    <span className="permissions-savebar-copy">
                      {t(
                        "permissions.unsavedChanges",
                        "You have unsaved changes.",
                      )}
                    </span>
                    <div className="permissions-savebar-actions">
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={savingActive}
                        onClick={discardChanges}
                      >
                        <LuUndo2 size={14} />
                        {t("permissions.discard", "Discard")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-gold permissions-save-btn"
                        disabled={savingActive}
                        onClick={saveChanges}
                      >
                        {savingActive ? (
                          <LuRefreshCw size={14} className="permissions-spin" />
                        ) : (
                          <LuSave size={14} />
                        )}
                        {savingActive
                          ? t("permissions.saving")
                          : t("permissions.save", "Save Changes")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="permissions-empty permissions-empty--large">
                {t("permissions.noUsers")}
              </div>
            )}
          </section>
        </div>
      )}

      <style>{`
        .permissions-page {
          text-align: start;
        }
        .permissions-page .page-hd,
        .permissions-page .page-hd h1,
        .permissions-page .page-hd p {
          direction: inherit;
          text-align: start;
        }
        .permissions-spin {
          animation: permissions-spin .8s linear infinite;
        }
        @keyframes permissions-spin {
          to { transform: rotate(360deg); }
        }
        .permissions-layout {
          display: grid;
          grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
          gap: 1rem;
          align-items: start;
        }
        .permissions-users,
        .permissions-editor {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface);
          box-shadow: var(--sh-sm);
        }
        .permissions-users {
          padding: .8rem;
          position: sticky;
          top: calc(var(--nav-h, 64px) + .8rem);
          max-height: calc(100vh - var(--nav-h, 64px) - 1.6rem);
          display: flex;
          flex-direction: column;
        }
        .permissions-search {
          height: 42px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: .55rem;
          padding-inline: .75rem;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface2);
          color: var(--text3);
        }
        .permissions-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text1);
          font: inherit;
          text-align: start;
        }
        .permissions-user-list {
          display: grid;
          gap: .55rem;
          margin-top: .75rem;
          overflow-y: auto;
        }
        .permissions-user {
          width: 100%;
          display: flex;
          align-items: center;
          gap: .65rem;
          padding: .65rem;
          border: 1px solid transparent;
          border-radius: 11px;
          background: transparent;
          color: var(--text1);
          text-align: start;
          cursor: pointer;
          direction: inherit;
        }
        .permissions-user:hover,
        .permissions-user.is-active {
          border-color: color-mix(in srgb, var(--primary) 28%, var(--border));
          background: color-mix(in srgb, var(--primary) 7%, var(--surface));
        }
        .permissions-user-avatar {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: var(--primary);
          background: color-mix(in srgb, var(--primary) 10%, var(--surface));
        }
        .permissions-user-copy {
          min-width: 0;
          flex: 1;
          display: grid;
          gap: .12rem;
        }
        .permissions-user-copy strong,
        .permissions-user-copy small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .permissions-user-copy small {
          color: var(--text3);
          direction: ltr;
          unicode-bidi: isolate;
          text-align: start;
        }
        .permissions-dirty-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          margin-inline-start: .4rem;
          border-radius: 50%;
          background: #F59E0B;
          vertical-align: middle;
        }
        .permissions-user-meta {
          display: grid;
          gap: .2rem;
          justify-items: end;
          flex-shrink: 0;
        }
        .permissions-user-meta > small {
          color: var(--text3);
          font-size: .68rem;
          font-weight: 700;
        }
        .permissions-role {
          border: 1px solid color-mix(in srgb, var(--role-color) 34%, transparent);
          border-radius: 999px;
          padding: .18rem .48rem;
          color: var(--role-color);
          background: color-mix(in srgb, var(--role-color) 10%, transparent);
          font-size: .68rem;
          font-weight: 900;
          white-space: nowrap;
        }
        .permissions-editor {
          min-width: 0;
          overflow: hidden;
          position: relative;
        }
        .permissions-editor-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border);
          direction: inherit;
          text-align: start;
        }
        .permissions-editor-head p,
        .permissions-editor-head h2 {
          margin: 0;
        }
        .permissions-editor-head p {
          color: var(--text3);
          font-size: .78rem;
          font-weight: 800;
        }
        .permissions-editor-head h2 {
          margin-top: .18rem;
          color: var(--text1);
          font-size: 1.08rem;
          font-weight: 900;
        }
        .permissions-editor-head span {
          color: var(--text2);
          font-size: .82rem;
        }
        .permissions-editor-actions {
          display: flex;
          flex-wrap: wrap;
          gap: .55rem;
          justify-content: flex-end;
        }
        .permissions-selflock {
          display: flex;
          align-items: center;
          gap: .55rem;
          margin: 1rem 1rem 0;
          padding: .7rem .85rem;
          border: 1px solid rgba(217, 119, 6, .35);
          border-radius: 10px;
          color: #B45309;
          background: rgba(217, 119, 6, .08);
          font-weight: 800;
          font-size: .84rem;
        }
        .permissions-summary {
          display: flex;
          align-items: center;
          gap: .55rem;
          margin: 1rem;
          padding: .75rem .85rem;
          border-radius: 10px;
          color: var(--primary);
          background: color-mix(in srgb, var(--primary) 8%, var(--surface));
          font-weight: 800;
          direction: inherit;
          text-align: start;
        }
        .permissions-summary em {
          margin-inline-start: auto;
          color: var(--text3);
          font-size: .8rem;
          font-style: normal;
        }
        .permissions-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: .6rem;
          margin: 0 1rem 1rem;
        }
        .permissions-search--inline {
          flex: 1;
          min-width: 220px;
          height: 40px;
        }
        .permissions-toolbar-actions {
          display: flex;
          gap: .4rem;
        }
        .permissions-toolbar-actions .btn {
          font-size: .78rem;
        }
        .permissions-groups {
          display: grid;
          gap: .8rem;
          padding: 0 1rem 1rem;
        }
        .permissions-group {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--surface);
          overflow: hidden;
        }
        .permissions-group-head {
          display: flex;
          align-items: center;
          gap: .65rem;
          padding: .7rem .85rem;
          cursor: pointer;
          user-select: none;
          background: color-mix(in srgb, var(--surface2) 65%, var(--surface));
        }
        .permissions-group-head:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: -2px;
        }
        .permissions-group-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: var(--primary);
          background: color-mix(in srgb, var(--primary) 10%, var(--surface));
        }
        .permissions-group-title {
          flex: 1;
          min-width: 0;
          display: grid;
          gap: .1rem;
        }
        .permissions-group-title h3 {
          margin: 0;
          color: var(--text1);
          font-size: .92rem;
          font-weight: 900;
        }
        .permissions-group-title small {
          color: var(--text3);
          font-size: .72rem;
          font-weight: 700;
        }
        .permissions-group-selectall {
          display: flex;
          align-items: center;
          gap: .4rem;
          flex-shrink: 0;
          padding: .3rem .55rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text2);
          font-size: .74rem;
          font-weight: 800;
          cursor: pointer;
        }
        .permissions-group-selectall input {
          width: 15px;
          height: 15px;
          accent-color: var(--primary);
        }
        .permissions-group-chevron {
          flex-shrink: 0;
          display: grid;
          place-items: center;
          color: var(--text3);
          transition: transform .18s ease;
        }
        .permissions-group.is-collapsed .permissions-group-chevron {
          transform: rotate(180deg);
        }
        .permissions-group-body {
          border-top: 1px solid var(--border);
          padding: .75rem;
          display: grid;
          gap: .6rem;
        }
        .permissions-subheading {
          margin: .2rem .1rem 0;
          color: var(--text3);
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .02em;
          text-transform: uppercase;
        }
        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: .6rem;
        }
        .permission-switch {
          min-height: 58px;
          display: flex;
          align-items: center;
          gap: .65rem;
          padding: .65rem .7rem;
          border: 1px solid var(--border);
          border-radius: 11px;
          background: var(--surface2);
          cursor: pointer;
          direction: inherit;
          text-align: start;
        }
        .permission-switch.is-on {
          border-color: rgba(5, 150, 105, .36);
          background: rgba(5, 150, 105, .08);
        }
        .permission-switch.is-disabled {
          opacity: .6;
          cursor: not-allowed;
        }
        .permission-switch input {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          accent-color: var(--primary);
        }
        .permission-switch-icon {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 8px;
          color: var(--text2);
          background: color-mix(in srgb, var(--text3) 10%, var(--surface));
        }
        .permission-switch.is-on .permission-switch-icon {
          color: #059669;
          background: rgba(5, 150, 105, .12);
        }
        .permission-switch-copy {
          min-width: 0;
          display: grid;
          gap: .1rem;
        }
        .permission-switch-copy strong {
          display: block;
          overflow-wrap: anywhere;
          color: var(--text1);
          font-size: .85rem;
          line-height: 1.35;
        }
        .permission-switch-copy small {
          color: var(--text3);
          font-size: .7rem;
          overflow-wrap: anywhere;
        }
        .permissions-savebar {
          position: sticky;
          bottom: 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: .75rem;
          padding: .8rem 1rem;
          border-top: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 92%, var(--primary));
          box-shadow: 0 -6px 18px rgba(0, 0, 0, .06);
        }
        .permissions-savebar-copy {
          color: var(--text1);
          font-weight: 800;
          font-size: .86rem;
        }
        .permissions-savebar-actions {
          display: flex;
          gap: .55rem;
        }
        .permissions-save-btn {
          min-width: 150px;
          justify-content: center;
        }
        .permissions-empty {
          padding: 1rem;
          color: var(--text3);
          text-align: center;
        }
        .permissions-empty--large {
          padding: 4rem 1rem;
        }
        @media (max-width: 900px) {
          .permissions-layout {
            grid-template-columns: 1fr;
          }
          .permissions-users {
            position: static;
            max-height: none;
          }
          .permissions-user-list {
            max-height: 320px;
          }
        }
        @media (max-width: 560px) {
          .permissions-editor-head {
            align-items: stretch;
            flex-direction: column;
          }
          .permissions-editor-actions .btn {
            width: 100%;
            justify-content: center;
          }
          .permissions-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .permissions-toolbar-actions .btn {
            flex: 1;
            justify-content: center;
          }
          .permissions-group-head {
            flex-wrap: wrap;
          }
          .permissions-savebar {
            flex-direction: column;
            align-items: stretch;
          }
          .permissions-savebar-actions {
            flex-direction: column;
          }
          .permissions-savebar-actions .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
