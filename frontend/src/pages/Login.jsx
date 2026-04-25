import { useState } from "react";
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
import { getApiErrorMessage } from "../lib/feedback.js";

function LangBtn() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const langs = [
    { code: "en", label: "English", flag: "EN" },
    { code: "dari", label: "دری", flag: "DR" },
    { code: "pashto", label: "پښتو", flag: "PS" },
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
  const { t } = useTranslation();
  const { login, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password) {
      toast.error(t("auth.fillAllFields"));
      return;
    }
    setLoading(true);
    try {
      const user = await login(phone.trim(), password);
      if (user.accountType === "DOKHT" || user.accountType === "QICHIKAR") {
        toast.success(t("auth.welcomeBack", { name: user.name }));
        navigate("/panel", { replace: true });
      } else if (["ADMIN", "DOKAN", "FINANCE"].includes(user.accountType)) {
        toast.success(t("auth.welcomeBack", { name: user.name }));
        const dest =
          user.accountType === "FINANCE"
            ? "/orders"
            : from === "/login"
              ? "/dashboard"
              : from;
        navigate(dest, { replace: true });
      } else {
        await logout();
        toast.error(t("auth.adminOnly", "Access denied. Admin accounts only."));
      }
    } catch (err) {
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
          right: 20,
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
            }}
          >
            <LuScissors size={26} color="#fff" />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text1)",
              margin: 0,
            }}
          >
            {t("appName")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
            {t("auth.signInToContinue")}
          </p>
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
            <div style={{ position: "relative", direction: "ltr" }}>
              <LuPhone
                size={15}
                style={{
                  position: "absolute",
                  insetInlineStart: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                }}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0700000000"
                dir="ltr"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  paddingInlineStart: 36,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--surface2)",
                  color: "var(--text1)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  textAlign: "left",
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
            <div style={{ position: "relative", direction: "ltr" }}>
              <LuLock
                size={15}
                style={{
                  position: "absolute",
                  insetInlineStart: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                }}
              />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                dir="ltr"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  paddingInlineStart: 36,
                  paddingInlineEnd: 40,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--surface2)",
                  color: "var(--text1)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  textAlign: "left",
                }}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                style={{
                  position: "absolute",
                  insetInlineEnd: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
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
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "11px 0",
              background: loading ? "var(--primary-200)" : "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
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
