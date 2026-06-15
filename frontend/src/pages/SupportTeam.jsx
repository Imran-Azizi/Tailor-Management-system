import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuCopy,
  LuExternalLink,
  LuGlobe,
  LuMail,
  LuMapPin,
  LuPhone,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import { getLocalizedShopValue } from "../config/shopConfig.js";
import { SUPPORT_TEAM_CONFIG } from "../config/supportConfig.js";

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
    <div className="support-phone-list">
      {phones.map((phone) => (
        <a key={phone.label} href={phone.href} dir="ltr" lang="en">
          <LuPhone size={14} />
          <span>{phone.label}</span>
        </a>
      ))}
    </div>
  );
}

function ContactRow({
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
    <div className="support-contact-row">
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

export default function SupportTeam() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const dir = resolveDirection(i18n, language);

  const address = getLocalizedShopValue(SUPPORT_TEAM_CONFIG.address, language);
  const website = SUPPORT_TEAM_CONFIG.website || "";
  const websiteLabel = website.replace(/^https?:\/\//, "");
  const email = SUPPORT_TEAM_CONFIG.email || "";

  const phones = useMemo(
    () =>
      (SUPPORT_TEAM_CONFIG.phones || []).filter(Boolean).map((phone) => ({
        label: phone,
        href: cleanPhoneHref(phone),
      })),
    [],
  );

  const whatsappLink = useMemo(
    () =>
      (SUPPORT_TEAM_CONFIG.socialLinks || []).find(
        (item) => item.key === "whatsapp" && item.href,
      ),
    [],
  );

  const phoneSummary = useMemo(() => phones.map((phone) => phone.label).join(", "), [phones]);

  const copyValue = async (value) => {
    try {
      await writeClipboard(value);
      toast.success(t("supportTeam.copySuccess"));
    } catch {
      toast.error(t("supportTeam.copyFailed"));
    }
  };

  const pageAlignClass = dir === "rtl" ? "text-right" : "text-left";

  return (
    <div className={`support-page ${pageAlignClass}`} dir={dir} lang={language}>
      <section className="support-card-shell" aria-labelledby="support-card-title">
        <article className="support-card">
          <header className="support-card-head">
            <span className="support-card-mark" aria-hidden="true">
              <LuPhone size={22} />
            </span>
            <h1 id="support-card-title">{t("supportTeam.title")}</h1>
          </header>

          <div className="support-contact-list">
            {phones.length ? (
              <ContactRow
                Icon={LuPhone}
                label={t("supportTeam.contactNumbers")}
                accent="#059669"
                copyValue={phoneSummary}
                t={t}
                onCopy={copyValue}
              >
                <PhoneLinks phones={phones} />
              </ContactRow>
            ) : null}

            {whatsappLink ? (
              <ContactRow
                Icon={FaWhatsapp}
                label={t("supportTeam.whatsapp")}
                accent="#047857"
                href={whatsappLink.href}
                copyValue={whatsappLink.href}
                valueDir="ltr"
                t={t}
                onCopy={copyValue}
              >
                <a
                  className="support-value-link support-value-link--whatsapp"
                  href={whatsappLink.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("supportTeam.whatsapp")}
                </a>
              </ContactRow>
            ) : null}

            {website ? (
              <ContactRow
                Icon={LuGlobe}
                label={t("supportTeam.website")}
                accent="#2563EB"
                href={website}
                copyValue={website}
                valueDir="ltr"
                t={t}
                onCopy={copyValue}
              >
                <a
                  className="support-value-link"
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                >
                  {websiteLabel}
                </a>
              </ContactRow>
            ) : null}

            {email ? (
              <ContactRow
                Icon={LuMail}
                label={t("supportTeam.companyEmail")}
                accent="#0F766E"
                href={`mailto:${email}`}
                copyValue={email}
                valueDir="ltr"
                t={t}
                onCopy={copyValue}
              >
                <a className="support-value-link" href={`mailto:${email}`}>
                  {email}
                </a>
              </ContactRow>
            ) : null}

            {address ? (
              <ContactRow
                Icon={LuMapPin}
                label={t("supportTeam.companyAddress")}
                accent="#B45309"
                copyValue={address}
                t={t}
                onCopy={copyValue}
              >
                {address}
              </ContactRow>
            ) : null}
          </div>
        </article>
      </section>

      <style>{`
        .support-page {
          width: 100%;
          min-height: calc(100vh - 120px);
          padding: clamp(1rem, 3vw, 2rem);
          color: var(--text1, #0f172a);
          text-align: start;
        }

        .support-page *,
        .support-page *::before,
        .support-page *::after {
          box-sizing: border-box;
        }

        .support-card-shell {
          min-height: calc(100vh - 180px);
          display: grid;
          place-items: center;
          width: 100%;
        }

        .support-card {
          width: min(100%, 720px);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 16px;
          background: var(--surface, #ffffff);
          box-shadow: 0 18px 48px rgba(15, 23, 42, .09);
          overflow: hidden;
        }

        .support-card-head {
          display: flex;
          align-items: center;
          gap: .85rem;
          padding: clamp(1rem, 2.5vw, 1.35rem);
          border-bottom: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 82%, transparent);
          background: color-mix(in srgb, var(--surface2, #f8fafc) 58%, var(--surface, #ffffff));
        }

        .support-card-mark {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 14px;
          color: var(--primary, #2563eb);
          background: color-mix(in srgb, var(--primary, #2563eb) 10%, var(--surface, #ffffff));
          border: 1px solid color-mix(in srgb, var(--primary, #2563eb) 18%, var(--border, #e2e8f0));
        }

        .support-card h1 {
          margin: 0;
          color: var(--text1, #0f172a);
          font-size: clamp(1.2rem, 2vw, 1.5rem);
          font-weight: 900;
          line-height: 1.25;
          letter-spacing: 0;
        }

        .support-contact-list {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: .75rem;
          padding: clamp(.9rem, 2.5vw, 1.15rem);
        }

        .support-contact-row {
          display: flex;
          align-items: flex-start;
          gap: .85rem;
          min-width: 0;
          padding: .9rem;
          border: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 82%, transparent);
          border-radius: 13px;
          background: color-mix(in srgb, var(--surface2, #f8fafc) 38%, var(--surface, #ffffff));
          transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
        }

        .support-contact-row:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--support-accent, #2563eb) 26%, var(--border, #e2e8f0));
          box-shadow: 0 14px 30px -25px rgba(15, 23, 42, .35);
        }

        .support-row-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 12px;
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
          width: 100%;
        }

        .support-row-label {
          color: var(--text2, #64748b);
          font-size: .8rem;
          font-weight: 900;
          line-height: 1.5;
        }

        .support-row-actions {
          display: inline-flex;
          align-items: center;
          gap: .35rem;
          flex: 0 0 auto;
        }

        .support-icon-action {
          width: 31px;
          height: 31px;
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
          line-height: 1.65;
          overflow-wrap: anywhere;
          word-break: break-word;
          unicode-bidi: plaintext;
        }

        .support-value-link {
          color: #1d4ed8;
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        .support-value-link:hover {
          text-decoration: underline;
        }

        .support-value-link--whatsapp {
          color: #047857;
        }

        .support-phone-list {
          display: flex;
          flex-wrap: wrap;
          gap: .5rem;
          min-width: 0;
        }

        .support-phone-list a {
          max-width: 100%;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          gap: .45rem;
          padding: .4rem .65rem;
          border-radius: 999px;
          border: 1px solid rgba(5, 150, 105, .28);
          color: #047857;
          background: rgba(5, 150, 105, .09);
          font-size: .84rem;
          font-weight: 800;
          text-decoration: none;
          overflow-wrap: anywhere;
          unicode-bidi: isolate;
          transition: transform .16s ease, background .16s ease;
        }

        .support-phone-list a:hover {
          transform: translateY(-1px);
          background: rgba(5, 150, 105, .15);
        }

        .support-page[dir="rtl"] .support-card,
        .support-page[dir="rtl"] .support-row-body,
        .support-page[dir="rtl"] .support-row-label,
        .support-page[dir="rtl"] .support-row-value {
          text-align: right;
        }

        .support-page[dir="rtl"] .support-card-head,
        .support-page[dir="rtl"] .support-contact-row {
          direction: rtl;
        }

        .support-page[dir="rtl"] .support-row-head {
          justify-content: flex-start;
        }

        .support-page[dir="rtl"] .support-row-actions {
          direction: rtl;
        }

        .support-page[dir="rtl"] .support-phone-list {
          justify-content: flex-end;
          direction: rtl;
        }

        .support-page[dir="rtl"] .support-phone-list a {
          direction: ltr;
        }

        @media (max-width: 680px) {
          .support-page {
            min-height: auto;
            padding: .75rem;
          }

          .support-card-shell {
            min-height: auto;
            place-items: start center;
          }

          .support-card {
            border-radius: 14px;
          }

          .support-card-head {
            align-items: flex-start;
          }

          .support-contact-row {
            gap: .75rem;
            padding: .82rem;
          }

          .support-row-head {
            align-items: flex-start;
            flex-direction: column;
            gap: .5rem;
          }

          .support-page[dir="rtl"] .support-row-head {
            align-items: flex-end;
          }

          .support-row-actions {
            align-self: flex-start;
          }

          .support-page[dir="rtl"] .support-row-actions {
            align-self: flex-end;
          }

          .support-phone-list {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
