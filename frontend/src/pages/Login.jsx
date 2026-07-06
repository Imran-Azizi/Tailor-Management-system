import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuScissors,
  LuPhone,
  LuLock,
  LuEye,
  LuEyeOff,
  LuSun,
  LuMoon,
  LuLanguages,
  LuCheck,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { assetUrl } from "../lib/assets.js";
import api from "../lib/api.js";
import { getPostLoginPath } from "../lib/authRedirect.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { getTenantHostContext } from "../lib/tenantHost.js";

function LangBtn() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const langs = [
    { code: "en", label: t("common.english"), flag: "EN" },
    { code: "dari", label: t("common.dari"), flag: "DR" },
    { code: "pashto", label: t("common.pashto"), flag: "PS" },
  ];
  const current = i18n.resolvedLanguage || "en";
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--text2)",
        }}
      >
        <LuLanguages size={15} />
        <span style={{ fontWeight: 700 }}>
          {current.slice(0, 2).toUpperCase()}
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            insetInlineEnd: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "var(--sh-md)",
            minWidth: 140,
            zIndex: 50,
          }}
        >
          {langs.map((l) => (
            <div
              key={l.code}
              onClick={() => {
                i18n.changeLanguage(l.code);
                localStorage.setItem("lang", l.code);
                setOpen(false);
              }}
              style={{
                padding: "9px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: current === l.code ? "var(--primary)" : "var(--text1)",
                fontWeight: current === l.code ? 600 : 400,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800 }}>{l.flag}</span>
              {l.label}
              {current === l.code && (
                <LuCheck size={12} style={{ marginInlineStart: "auto" }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const language = (i18n.resolvedLanguage || i18n.language || "").toLowerCase();
  const isDariPashto =
    language.startsWith("dari") || language.startsWith("pashto");
  const from = location.state?.from?.pathname || "/dashboard";
  const hostContext = getTenantHostContext();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tenantContext, setTenantContext] = useState(null);
  const [tenantContextLoading, setTenantContextLoading] = useState(true);
  const [tenantContextError, setTenantContextError] = useState("");

  useEffect(() => {
    let active = true;
    setTenantContextLoading(true);
    setTenantContextError("");

    api
      .get("/public/tenant-context", { skipAuthRedirect: true })
      .then(({ data }) => {
        if (!active) return;
        setTenantContext(data);
      })
      .catch((error) => {
        if (!active) return;
        setTenantContext(null);
        setTenantContextError(
          error?.response?.data?.error || t("auth.loginFailed"),
        );
      })
      .finally(() => {
        if (active) setTenantContextLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  const tenantBrand = tenantContext?.tenant || null;
  const loginTitle =
    tenantBrand?.systemName || tenantBrand?.businessName || t("appName");
  const loginSubtitle =
    hostContext.hostType === "admin"
      ? t("superAdmin.title", "Super Admin")
      : tenantBrand?.businessName || t("auth.signInToContinue");
  const isUnknownTenantHost =
    hostContext.hostType === "tenant" &&
    !tenantContextLoading &&
    (!tenantContext || tenantContext?.hostType === "unknown-tenant");
  const disableSubmit = loading || (hostContext.hostType === "tenant" && (tenantContextLoading || isUnknownTenantHost));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUnknownTenantHost) {
      toast.error(tenantContextError || "Tenant subdomain was not found.");
      return;
    }
    if (!phone.trim() || !password) {
      toast.error(t("auth.fillAllFields"));
      return;
    }
    setLoading(true);
    try {
      const user = await login(phone.trim(), password, from);
      if (user.accountType === "SUPER_ADMIN") {
        toast.success(t("auth.welcomeBack", { name: user.name }));
        navigate(getPostLoginPath(user, from), { replace: true });
      } else if (user.accountType === "DOKHT" || user.accountType === "QICHIKAR") {
        toast.success(t("auth.welcomeBack", { name: user.name }));
        navigate(getPostLoginPath(user, from), { replace: true });
      } else if (["ADMIN", "DOKAN", "FINANCE"].includes(user.accountType)) {
        toast.success(t("auth.welcomeBack", { name: user.name }));
        navigate(getPostLoginPath(user, from), { replace: true });
      } else {
        await logout();
        toast.error(t("auth.adminOnly", "Access denied. Admin accounts only."));
      }
    } catch (err) {
      if (
        err?.response?.status === 403 &&
        ["TENANT_HOST_REQUIRED", "TENANT_HOST_MISMATCH", "SUPER_ADMIN_HOST_REQUIRED"].includes(
          err?.response?.data?.code,
        ) &&
        err?.response?.data?.redirectUrl
      ) {
        window.location.href = err.response.data.redirectUrl;
        return;
      }
      if (err?.response?.status === 402) {
        navigate("/subscription-expired", { replace: true });
        return;
      }
      toast.error(getApiErrorMessage(err, t("auth.loginFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "fixed",
          top: 16,
          insetInlineEnd: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <LangBtn />
        <button
          onClick={toggle}
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            color: "var(--text2)",
            display: "flex",
            alignItems: "center",
          }}
        >
          {dark ? <LuSun size={16} /> : <LuMoon size={16} />}
        </button>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "40px 36px",
          boxShadow: "var(--sh-lg)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--primary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              overflow: "hidden",
            }}
          >
            {tenantBrand?.logoUrl ? (
              <img
                src={assetUrl(tenantBrand.logoUrl)}
                alt={tenantBrand.businessName || tenantBrand.systemName || "Tenant logo"}
                style={{ width: "100%", height: "100%", objectFit: "contain", background: "#fff" }}
              />
            ) : (
              <LuScissors size={26} color="#fff" />
            )}
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text1)",
              margin: 0,
            }}
          >
            {loginTitle}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
            {loginSubtitle}
          </p>
          {hostContext.hostType === "tenant" && hostContext.tenantSlug ? (
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
              {hostContext.tenantSlug}.hoshmandsafi.com
            </p>
          ) : null}
          {hostContext.hostType === "tenant" && tenantContextLoading ? (
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
              {t("common.loading")}
            </p>
          ) : null}
          {isUnknownTenantHost ? (
            <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>
              {tenantContextError || "Tenant subdomain was not found."}
            </p>
          ) : null}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Phone */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text2)",
                marginBottom: 6,
              }}
            >
              {t("common.phone", "Phone")}
            </label>
            <div className="iw" style={{ position: "relative" }}>
              <LuPhone size={15} className="ico" />
              <input
                type="tel"
                className="inp with-leading-icon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0700000000"
                style={{
                  borderRadius: 8,
                  background: "var(--surface2)",
                  boxSizing: "border-box",
                }}
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text2)",
                marginBottom: 6,
              }}
            >
              {t("auth.password")}
            </label>
            <div className="iw" style={{ position: "relative" }}>
              <LuLock size={15} className="ico" />
              <input
                type={showPw ? "text" : "password"}
                className="inp with-leading-icon with-trailing-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                style={{
                  ...(isDariPashto ? { paddingInlineEnd: 60 } : {}),
                  borderRadius: 8,
                  background: "var(--surface2)",
                  boxSizing: "border-box",
                }}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="end-action"
                onClick={() => setShowPw((s) => !s)}
                style={{
                  ...(isDariPashto
                    ? {
                        insetInlineStart: "auto",
                        insetInlineEnd: 36,
                      }
                    : {}),
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text3)",
                  display: "flex",
                }}
              >
                {showPw ? <LuEyeOff size={15} /> : <LuEye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={disableSubmit}
            style={{
              marginTop: 4,
              padding: "11px 0",
              background: disableSubmit ? "var(--primary-200)" : "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: disableSubmit ? "not-allowed" : "pointer",
              transition: "opacity .15s",
            }}
          >
            {loading ? t("common.loading") : t("auth.signIn")}
          </button>
        </form>

        {/* Hint */}
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--text3)",
            marginTop: 24,
          }}
        >
          {t("auth.contactAdmin")}
        </p>
      </div>
    </div>
  );
}
