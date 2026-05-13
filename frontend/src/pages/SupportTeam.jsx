import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuCopy,
  LuExternalLink,
  LuGlobe,
  LuHeadphones,
  LuMail,
  LuMapPin,
  LuPhone,
  LuShieldCheck,
} from "react-icons/lu";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { PageHeader } from "../components/ui/index.jsx";
import { getLocalizedShopValue } from "../config/shopConfig.js";
import { SUPPORT_TEAM_CONFIG } from "../config/supportConfig.js";

const SOCIAL_ICONS = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  whatsapp: FaWhatsapp,
};

function resolveDirection(i18n, language) {
  if (i18n.dir?.(language) === "rtl") return "rtl";
  const lang = String(language || "").toLowerCase();
  return lang.startsWith("fa") ||
    lang.startsWith("ps") ||
    lang.startsWith("dari") ||
    lang.startsWith("pashto")
    ? "rtl"
    : "ltr";
}

function cleanPhoneHref(phone) {
  return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}

async function writeClipboard(value) {
  if (globalThis.navigator?.clipboard?.writeText) {
    await globalThis.navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function IconAction({ label, children, href, onClick }) {
  const className = "support-icon-action";
  if (href) {
    return (
      <a
        className={className}
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noreferrer" : undefined}
        title={label}
        aria-label={label}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={className}
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function PhoneLinks({ phones }) {
  return (
    <div className="support-phone-list" dir="ltr">
      {phones.map((phone) => (
        <a key={phone.label} href={phone.href}>
          <LuPhone size={14} />
          <span>{phone.label}</span>
        </a>
      ))}
    </div>
  );
}

function InfoRow({
  Icon,
  label,
  children,
  accent,
  href,
  copyValue,
  valueDir,
  t,
  onCopy,
}) {
  return (
    <div className="support-info-row">
      <span
        className="support-row-icon"
        style={{
          "--support-accent": accent,
          "--support-accent-soft": `${accent}1F`,
        }}
      >
        <Icon size={18} />
      </span>
      <div className="support-row-body">
        <div className="support-row-head">
          <span className="support-row-label">{label}</span>
          <span className="support-row-actions">
            {href ? (
              <IconAction label={t("supportTeam.openLink")} href={href}>
                <LuExternalLink size={14} />
              </IconAction>
            ) : null}
            {copyValue ? (
              <IconAction
                label={t("supportTeam.copyValue")}
                onClick={() => onCopy(copyValue)}
              >
                <LuCopy size={14} />
              </IconAction>
            ) : null}
          </span>
        </div>
        <div
          className="support-row-value"
          dir={valueDir || undefined}
          lang={valueDir === "ltr" ? "en" : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoGroup({ title, subtitle, children }) {
  return (
    <section className="support-info-group">
      <div className="support-group-title">
        <span />
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="support-group-body">{children}</div>
    </section>
  );
}

export default function SupportTeam() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const dir = resolveDirection(i18n, language);

  const companyName = getLocalizedShopValue(
    SUPPORT_TEAM_CONFIG.companyName,
    language,
  );
  const address = getLocalizedShopValue(SUPPORT_TEAM_CONFIG.address, language);
  const websiteLabel = SUPPORT_TEAM_CONFIG.website.replace(/^https?:\/\//, "");

  const phones = useMemo(
    () =>
      (SUPPORT_TEAM_CONFIG.phones || []).map((phone) => ({
        label: phone,
        href: cleanPhoneHref(phone),
      })),
    [],
  );

  const socialLinks = useMemo(() => SUPPORT_TEAM_CONFIG.socialLinks || [], []);

  const phoneSummary = useMemo(
    () => (SUPPORT_TEAM_CONFIG.phones || []).join(", "),
    [],
  );

  const copyValue = async (value) => {
    try {
      await writeClipboard(value);
      toast.success(t("supportTeam.copySuccess"));
    } catch {
      toast.error(t("supportTeam.copyFailed"));
    }
  };

  const isRtl = dir === "rtl";
  const rtlTextAlign = isRtl ? { textAlign: "right" } : {};

  return (
    <div className="support-page" dir={dir}>
      <PageHeader
        title={t("supportTeam.title")}
        subtitle={t("supportTeam.subtitle")}
        style={rtlTextAlign}
      />

      <section className="support-hero">
        <div className="support-hero__content">
          <div className="support-hero__badge">
            <LuHeadphones size={18} />
            <span>{t("supportTeam.badge")}</span>
          </div>
          <h2 style={rtlTextAlign}>{t("supportTeam.heroTitle")}</h2>
          <p style={rtlTextAlign}>{t("supportTeam.heroCopy")}</p>
        </div>
      </section>

      <article className="support-details-card">
        <header className="support-details-head">
          <span className="support-details-icon">
            <LuShieldCheck size={22} />
          </span>
          <div>
            <h3 style={rtlTextAlign}>{t("supportTeam.combinedInfoTitle")}</h3>
            <p style={rtlTextAlign}>{t("supportTeam.combinedInfoSubtitle")}</p>
          </div>
        </header>
        <div className="support-details-grid">
          <InfoGroup
            title={
              <span style={rtlTextAlign}>
                {t("supportTeam.companyInfoTitle")}
              </span>
            }
            subtitle={
              <span style={rtlTextAlign}>
                {t("supportTeam.companyInfoSubtitle")}
              </span>
            }
          >
            <InfoRow
              Icon={LuShieldCheck}
              label={t("supportTeam.companyName")}
              accent="#2563EB"
              copyValue={companyName}
              t={t}
              onCopy={copyValue}
            >
              {companyName}
            </InfoRow>
            <InfoRow
              Icon={LuMail}
              label={t("supportTeam.companyEmail")}
              accent="#0F766E"
              href={`mailto:${SUPPORT_TEAM_CONFIG.email}`}
              copyValue={SUPPORT_TEAM_CONFIG.email}
              valueDir="ltr"
              t={t}
              onCopy={copyValue}
            >
              {SUPPORT_TEAM_CONFIG.email}
            </InfoRow>
            <InfoRow
              Icon={LuGlobe}
              label={t("supportTeam.website")}
              accent="#6D28D9"
              href={SUPPORT_TEAM_CONFIG.website}
              copyValue={SUPPORT_TEAM_CONFIG.website}
              valueDir="ltr"
              t={t}
              onCopy={copyValue}
            >
              {websiteLabel}
            </InfoRow>
            <InfoRow
              Icon={LuMapPin}
              label={t("supportTeam.companyAddress")}
              accent="#B45309"
              copyValue={address}
              t={t}
              onCopy={copyValue}
            >
              {address}
            </InfoRow>
            <InfoRow
              Icon={LuPhone}
              label={t("supportTeam.contactNumbers")}
              accent="#059669"
              copyValue={phoneSummary}
              t={t}
              onCopy={copyValue}
            >
              <PhoneLinks phones={phones} />
            </InfoRow>
            <InfoRow
              Icon={LuGlobe}
              label={t("supportTeam.socialLinks")}
              accent="#2563EB"
              t={t}
              onCopy={copyValue}
            >
              <div className="support-social-list">
                {socialLinks.map((item) => {
                  const SocialIcon = SOCIAL_ICONS[item.key] || LuExternalLink;
                  return (
                    <a
                      key={item.key}
                      className={`support-social-link support-social-link--${item.key}`}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      title={t("supportTeam.openLink")}
                    >
                      <SocialIcon size={16} />
                      <span>{t(item.labelKey)}</span>
                    </a>
                  );
                })}
              </div>
            </InfoRow>
          </InfoGroup>
        </div>
      </article>

      <style>{`
        .support-page {
          max-width: 1180px;
          margin: 0 auto;
          padding: 1rem clamp(.75rem, 2vw, 1.25rem) 2rem;
          color: var(--text1, #0f172a);
          text-align: start;
        }

        .support-page *,
        .support-page *::before,
        .support-page *::after {
          box-sizing: border-box;
        }

        .support-hero,
        .support-details-card {
          border: 1px solid var(--border, #e2e8f0);
          background: var(--surface, #ffffff);
          box-shadow: var(--sh-sm, 0 8px 22px rgba(15, 23, 42, .07));
        }

        .support-hero {
          overflow: hidden;
          display: flex;
          align-items: center;
          min-height: 150px;
          margin: 1rem 0 1.25rem;
          padding: clamp(1.15rem, 2.4vw, 1.7rem);
          border-radius: 16px;
          background:
            linear-gradient(135deg, rgba(37, 99, 235, .09), transparent 52%),
            var(--surface, #ffffff);
        }

        .support-hero__content {
          max-width: 720px;
        }

        .support-hero__badge,
        .support-phone-list a,
        .support-social-link {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
        }

        .support-hero__badge {
          margin-bottom: .85rem;
          padding: .42rem .75rem;
          border-radius: 999px;
          border: 1px solid rgba(37, 99, 235, .25);
          color: var(--primary, #2563eb);
          background: color-mix(in srgb, var(--primary, #2563eb) 8%, var(--surface, #fff));
          font-size: .78rem;
          font-weight: 800;
        }

        .support-hero h2 {
          margin: 0;
          max-width: 780px;
          font-size: clamp(1.35rem, 2.4vw, 1.9rem);
          line-height: 1.22;
          letter-spacing: 0;
          color: var(--text1, #0f172a);
        }

        .support-hero p,
        .support-details-head p,
        .support-group-title p {
          color: var(--text2, #64748b);
          line-height: 1.75;
        }

        .support-hero p {
          margin: .75rem 0 0;
          max-width: 680px;
          font-size: .96rem;
        }

        .support-details-card {
          border-radius: 16px;
          overflow: hidden;
          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease;
        }

        .support-details-card:hover {
          border-color: color-mix(in srgb, var(--primary, #2563eb) 34%, var(--border, #e2e8f0));
          box-shadow: var(--sh-md, 0 18px 42px rgba(15, 23, 42, .12));
          transform: translateY(-2px);
        }

        .support-details-head {
          display: flex;
          align-items: flex-start;
          gap: .85rem;
          padding: 1.1rem;
          border-bottom: 1px solid var(--border, #e2e8f0);
          background: color-mix(in srgb, var(--primary, #2563eb) 5%, transparent);
        }

        .support-details-icon,
        .support-row-icon {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 13px;
        }

        .support-details-icon {
          width: 44px;
          height: 44px;
          color: var(--primary, #2563eb);
          background: color-mix(in srgb, var(--primary, #2563eb) 12%, transparent);
        }

          const isRtl = dir === "rtl";
        .support-group-title h4 {
          margin: 0;
          color: var(--text1, #0f172a);
          line-height: 1.35;
        }

        .support-details-head h3 {
          font-size: 1.08rem;
        }

        .support-details-head p,
        .support-group-title p {
          margin: .25rem 0 0;
          font-size: .86rem;
        }

        .support-details-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          padding: 1rem;
        }

        .support-info-group {
          min-width: 0;
          border: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 76%, transparent);
          border-radius: 14px;
          background: color-mix(in srgb, var(--surface2, #f8fafc) 42%, transparent);
          overflow: hidden;
        }

        .support-group-title {
          display: flex;
          align-items: flex-start;
          gap: .7rem;
          padding: .9rem .95rem;
          border-bottom: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 76%, transparent);
        }

        .support-group-title > span {
          width: 8px;
          height: 38px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: var(--primary, #2563eb);
        }

        .support-group-title h4 {
          font-size: .96rem;
        }

        .support-group-body {
          padding: .25rem .95rem .95rem;
        }

        .support-info-row {
          display: flex;
          align-items: flex-start;
          gap: .85rem;
          padding: .85rem 0;
          border-bottom: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 72%, transparent);
        }

        .support-info-row:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .support-row-icon {
          width: 38px;
          height: 38px;
          color: var(--support-accent);
          background: var(--support-accent-soft);
        }

        .support-row-body {
          min-width: 0;
          flex: 1;
        }

        .support-row-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .75rem;
          min-height: 30px;
        }

        .support-row-label {
          color: var(--text3, #94a3b8);
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        .support-row-actions {
          display: inline-flex;
          align-items: center;
          gap: .35rem;
          flex: 0 0 auto;
        }

        .support-icon-action {
          width: 30px;
          height: 30px;
          display: inline-grid;
          place-items: center;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 9px;
          color: var(--text2, #64748b);
          background: var(--surface, #ffffff);
          cursor: pointer;
          text-decoration: none;
          transition: .16s ease;
        }

        .support-icon-action:hover {
          color: var(--primary, #2563eb);
          border-color: color-mix(in srgb, var(--primary, #2563eb) 36%, var(--border, #e2e8f0));
          transform: translateY(-1px);
        }

        .support-row-value {
          margin-top: .16rem;
          color: var(--text1, #0f172a);
          font-size: .96rem;
          font-weight: 800;
          line-height: 1.6;
          overflow-wrap: anywhere;
          unicode-bidi: plaintext;
        }

        .support-phone-list,
        .support-social-list {
          display: flex;
          flex-wrap: wrap;
          gap: .5rem;
        }

        .support-phone-list a,
        .support-social-link {
          min-height: 34px;
          padding: .4rem .65rem;
          border-radius: 999px;
          font-size: .84rem;
          font-weight: 800;
          text-decoration: none;
          transition:
            transform .16s ease,
            background .16s ease,
            border-color .16s ease;
        }

        .support-phone-list a {
          border: 1px solid rgba(5, 150, 105, .28);
          color: #047857;
          background: rgba(5, 150, 105, .09);
        }

        .support-phone-list a:hover,
        .support-social-link:hover {
          transform: translateY(-1px);
        }

        .support-phone-list a:hover {
          background: rgba(5, 150, 105, .15);
        }

        .support-social-link {
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text1, #0f172a);
          background: var(--surface, #ffffff);
        }

        .support-social-link--whatsapp {
          color: #047857;
          border-color: rgba(5, 150, 105, .24);
          background: rgba(5, 150, 105, .08);
        }

        .support-social-link--facebook {
          color: #1d4ed8;
          border-color: rgba(37, 99, 235, .24);
          background: rgba(37, 99, 235, .08);
        }

        .support-social-link--instagram {
          color: #be185d;
          border-color: rgba(190, 24, 93, .24);
          background: rgba(190, 24, 93, .08);
        }

        .support-social-link--whatsapp:hover {
          background: rgba(5, 150, 105, .14);
        }

        .support-social-link--facebook:hover {
          background: rgba(37, 99, 235, .14);
        }

        .support-social-link--instagram:hover {
          background: rgba(190, 24, 93, .14);
        }

        .support-page[dir="rtl"] .support-hero,
        .support-page[dir="rtl"] .support-details-head,
        .support-page[dir="rtl"] .support-group-title,
        .support-page[dir="rtl"] .support-info-row {
          flex-direction: row-reverse;
        }

        .support-page[dir="rtl"] .support-hero__badge,
        .support-page[dir="rtl"] .support-phone-list a,
        .support-page[dir="rtl"] .support-social-link {
          flex-direction: row-reverse;
        }

        .support-page[dir="rtl"] .support-details-card,
        .support-page[dir="rtl"] .support-hero__content,
        .support-page[dir="rtl"] .support-info-group,
        .support-page[dir="rtl"] .support-row-body {
          text-align: right;
        }

        .support-page[dir="rtl"] .support-row-head {
          flex-direction: row-reverse;
        }

        .support-page[dir="rtl"] .support-row-actions {
          flex-direction: row-reverse;
        }

        .support-page[dir="rtl"] .support-phone-list,
        .support-page[dir="rtl"] .support-social-list {
          justify-content: flex-end;
        }

        @media (max-width: 980px) {
          .support-details-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 680px) {
          .support-page {
            padding-inline: .75rem;
          }

          .support-hero {
            min-height: auto;
            align-items: flex-start;
          }

          .support-details-head,
          .support-page[dir="rtl"] .support-details-head {
            flex-direction: column;
          }

          .support-info-row,
          .support-page[dir="rtl"] .support-info-row {
            gap: .75rem;
          }

          .support-phone-list,
          .support-social-list {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
