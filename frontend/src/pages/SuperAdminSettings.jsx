import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuCheck,
  LuEye,
  LuEyeOff,
  LuKeyRound,
  LuLockKeyhole,
  LuPhone,
  LuSave,
  LuShieldCheck,
  LuUserRound,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { isRtlLanguage } from "../lib/locale.js";

function PasswordInput({ id, label, value, onChange, visible, onToggle, autoComplete, error }) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="lbl" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className="inp w-full"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-[var(--text3)] transition hover:text-[var(--text1)]"
          onClick={onToggle}
          aria-label={visible ? t("superAdmin.hidePassword") : t("superAdmin.showPassword")}
        >
          {visible ? <LuEyeOff size={17} /> : <LuEye size={17} />}
        </button>
      </div>
      {error ? <p className="err-msg mt-2">{error}</p> : null}
    </div>
  );
}

function passwordScore(password) {
  if (!password) return 0;
  return [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;
}

export default function SuperAdminSettings() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const isRtl = isRtlLanguage(i18n.resolvedLanguage || i18n.language);
  const [profile, setProfile] = useState({
    name: user?.name || "",
    phoneNumber: user?.phoneNumber || "",
    currentPassword: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visible, setVisible] = useState({});
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const score = useMemo(() => passwordScore(passwords.newPassword), [passwords.newPassword]);
  const strengthKey = score <= 1 ? "weak" : score <= 3 ? "medium" : "strong";

  useEffect(() => {
    setProfile((current) => ({
      ...current,
      name: user?.name || current.name,
      phoneNumber: user?.phoneNumber || current.phoneNumber,
    }));
  }, [user?.name, user?.phoneNumber]);

  const profileMut = useMutation({
    mutationFn: (payload) => api.put("/auth/profile", payload),
    onSuccess: ({ data }) => {
      updateUser(data.user);
      setProfile((current) => ({ ...current, currentPassword: "" }));
      setProfileErrors({});
      toast.success(t("superAdminSettings.toast.profileSaved"));
    },
    onError: (error) =>
      toast.error(
        error?.response?.data?.code === "INVALID_CURRENT_PASSWORD"
          ? t("superAdminSettings.validation.incorrectCurrentPassword")
          : error?.response?.data?.code === "TOO_MANY_PASSWORD_ATTEMPTS"
            ? t("superAdminSettings.validation.tooManyAttempts")
          : error?.response?.data?.code === "PHONE_IN_USE"
            ? t("superAdminSettings.validation.phoneInUse")
            : getApiErrorMessage(error, t("superAdminSettings.toast.profileFailed")),
      ),
  });

  const passwordMut = useMutation({
    mutationFn: (payload) => api.post("/auth/change-password", payload),
    onSuccess: ({ data }, variables) => {
      updateUser(data.user);
      setProfile((current) => ({ ...current, currentPassword: variables.newPassword }));
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
      setVisible({});
      toast.success(t("superAdminSettings.toast.passwordChanged"));
    },
    onError: (error) =>
      toast.error(
        error?.response?.data?.code === "INVALID_CURRENT_PASSWORD"
          ? t("superAdminSettings.validation.incorrectCurrentPassword")
          : error?.response?.data?.code === "TOO_MANY_PASSWORD_ATTEMPTS"
            ? t("superAdminSettings.validation.tooManyAttempts")
          : getApiErrorMessage(error, t("superAdminSettings.toast.passwordFailed")),
      ),
  });

  const submitProfile = (event) => {
    event.preventDefault();
    const errors = {};
    if (profile.name.trim().length < 2) errors.name = t("superAdminSettings.validation.name");
    if (!/^[0-9+()\-\s]{7,24}$/.test(profile.phoneNumber.trim())) {
      errors.phoneNumber = t("superAdminSettings.validation.phone");
    }
    if (!profile.currentPassword) errors.currentPassword = t("superAdminSettings.validation.currentPassword");
    setProfileErrors(errors);
    if (!Object.keys(errors).length) profileMut.mutate({
      name: profile.name.trim(),
      phoneNumber: profile.phoneNumber.trim(),
      currentPassword: profile.currentPassword,
    });
  };

  const submitPassword = (event) => {
    event.preventDefault();
    const errors = {};
    if (!passwords.currentPassword) errors.currentPassword = t("superAdminSettings.validation.currentPassword");
    if (
      passwords.newPassword.length < 8 ||
      !/[a-zA-Z]/.test(passwords.newPassword) ||
      !/\d/.test(passwords.newPassword)
    ) {
      errors.newPassword = t("superAdminSettings.validation.passwordStrength");
    }
    if (passwords.confirmPassword !== passwords.newPassword) {
      errors.confirmPassword = t("superAdminSettings.validation.passwordMatch");
    }
    setPasswordErrors(errors);
    if (!Object.keys(errors).length) passwordMut.mutate(passwords);
  };

  const toggleVisible = (field) => setVisible((current) => ({ ...current, [field]: !current[field] }));

  return (
    <div
      className={`superadmin-settings-page min-h-[calc(100vh-var(--nav-h,0px))] bg-[var(--bg)] px-4 py-5 sm:px-6 lg:px-8 ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="superadmin-hero overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
          <div className="relative z-[1] flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:text-indigo-300">
              <LuShieldCheck size={23} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300">
                {t("superAdminSettings.badge")}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text1)] sm:text-3xl">
                {t("superAdminSettings.title")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text2)]">
                {t("superAdminSettings.subtitle")}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={submitProfile} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
                <LuUserRound size={19} />
              </span>
              <div>
                <h2 className="font-bold text-[var(--text1)]">{t("superAdminSettings.profile.title")}</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text3)]">{t("superAdminSettings.profile.subtitle")}</p>
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <label className="lbl" htmlFor="superadmin-name">{t("superAdminSettings.fields.fullName")}</label>
                <div className="iw">
                  <LuUserRound size={15} className="ico" />
                  <input
                    id="superadmin-name"
                    className="inp with-leading-icon"
                    value={profile.name}
                    onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                    autoComplete="name"
                  />
                </div>
                {profileErrors.name ? <p className="err-msg mt-2">{profileErrors.name}</p> : null}
              </div>
              <div>
                <label className="lbl" htmlFor="superadmin-phone">{t("superAdminSettings.fields.phone")}</label>
                <div className="iw">
                  <LuPhone size={15} className="ico" />
                  <input
                    id="superadmin-phone"
                    className="inp with-leading-icon"
                    value={profile.phoneNumber}
                    onChange={(event) => setProfile({ ...profile, phoneNumber: event.target.value })}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                {profileErrors.phoneNumber ? <p className="err-msg mt-2">{profileErrors.phoneNumber}</p> : null}
              </div>
              <PasswordInput
                id="profile-current-password"
                label={t("superAdminSettings.fields.currentPassword")}
                value={profile.currentPassword}
                onChange={(value) => setProfile({ ...profile, currentPassword: value })}
                visible={visible.profileCurrent}
                onToggle={() => toggleVisible("profileCurrent")}
                autoComplete="current-password"
                error={profileErrors.currentPassword}
              />
              <button className="sa-action-btn sa-btn-save" type="submit" disabled={profileMut.isPending}>
                {profileMut.isPending ? (
                  <span className="sa-btn-spinner" />
                ) : (
                  <LuSave size={17} />
                )}
                <span>{profileMut.isPending ? t("superAdminSettings.saving") : t("superAdminSettings.profile.save")}</span>
              </button>
            </div>
          </form>

          <form onSubmit={submitPassword} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <LuKeyRound size={19} />
              </span>
              <div>
                <h2 className="font-bold text-[var(--text1)]">{t("superAdminSettings.security.title")}</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text3)]">{t("superAdminSettings.security.subtitle")}</p>
              </div>
            </div>
            <div className="space-y-5">
              <PasswordInput
                id="password-current"
                label={t("superAdminSettings.fields.currentPassword")}
                value={passwords.currentPassword}
                onChange={(value) => setPasswords({ ...passwords, currentPassword: value })}
                visible={visible.passwordCurrent}
                onToggle={() => toggleVisible("passwordCurrent")}
                autoComplete="current-password"
                error={passwordErrors.currentPassword}
              />
              <div>
                <PasswordInput
                  id="password-new"
                  label={t("superAdminSettings.fields.newPassword")}
                  value={passwords.newPassword}
                  onChange={(value) => setPasswords({ ...passwords, newPassword: value })}
                  visible={visible.newPassword}
                  onToggle={() => toggleVisible("newPassword")}
                  autoComplete="new-password"
                  error={passwordErrors.newPassword}
                />
                <div className="mt-3">
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <span
                        key={level}
                        className={`h-1.5 rounded-full ${level <= score ? (strengthKey === "strong" ? "bg-emerald-500" : strengthKey === "medium" ? "bg-amber-500" : "bg-red-500") : "bg-[var(--border)]"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text3)]">
                    {score >= 4 ? <LuCheck size={13} className="text-emerald-500" /> : <LuLockKeyhole size={13} />}
                    {t(`superAdminSettings.strength.${strengthKey}`)}
                  </p>
                </div>
              </div>
              <PasswordInput
                id="password-confirm"
                label={t("superAdminSettings.fields.confirmPassword")}
                value={passwords.confirmPassword}
                onChange={(value) => setPasswords({ ...passwords, confirmPassword: value })}
                visible={visible.confirmPassword}
                onToggle={() => toggleVisible("confirmPassword")}
                autoComplete="new-password"
                error={passwordErrors.confirmPassword}
              />
              <button className="sa-action-btn sa-btn-password" type="submit" disabled={passwordMut.isPending}>
                {passwordMut.isPending ? (
                  <span className="sa-btn-spinner" />
                ) : (
                  <LuKeyRound size={17} />
                )}
                <span>{passwordMut.isPending ? t("superAdminSettings.saving") : t("superAdminSettings.security.save")}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
