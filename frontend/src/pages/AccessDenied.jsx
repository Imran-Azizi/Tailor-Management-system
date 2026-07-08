import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuLockKeyhole } from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";

export default function AccessDenied() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, permissions } = useAuth();
  const isManagedLimitedUser =
    (user?.accountType === "DOKAN" || user?.accountType === "FINANCE") &&
    permissions.length === 0;
  const title = isManagedLimitedUser
    ? t(
        "accessDenied.noPermissionsTitle",
        "ادمین به شما دسترسی هیچ گزینه را نداده است",
      )
    : t("accessDenied.title", "Access Denied");
  const message = isManagedLimitedUser
    ? t(
        "accessDenied.noPermissionsMessage",
        "ادمین به شما دسترسی هیچ گزینه را نداده است",
      )
    : t(
        "accessDenied.message",
        "Your account does not have permission to open this page.",
      );

  return (
    <main className="page access-denied-page">
      <section className="access-denied-panel">
        <span className="access-denied-icon" aria-hidden="true">
          <LuLockKeyhole size={28} />
        </span>
        <div>
          {!isManagedLimitedUser ? (
            <p className="access-denied-kicker">
              {t("accessDenied.kicker", "Restricted area")}
            </p>
          ) : null}
          <h1>{title}</h1>
          <p>{message}</p>
          {user?.name ? (
            <p className="access-denied-user">
              {t("accessDenied.signedInAs", "Signed in as")} {user.name}
            </p>
          ) : null}
        </div>
        {!isManagedLimitedUser ? (
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
            <LuArrowLeft size={15} />
            {t("accessDenied.back", "Go Back")}
          </button>
        ) : null}
      </section>

      <style>{`
        .access-denied-page {
          min-height: calc(100vh - 120px);
          display: grid;
          place-items: center;
          padding: clamp(1rem, 4vw, 2rem);
        }
        .access-denied-panel {
          width: min(100%, 560px);
          display: grid;
          gap: 1rem;
          justify-items: center;
          text-align: center;
          padding: clamp(1.4rem, 4vw, 2.2rem);
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
          box-shadow: var(--sh-md);
        }
        .access-denied-icon {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          color: #b91c1c;
          background: rgba(239, 68, 68, .1);
          border: 1px solid rgba(239, 68, 68, .22);
        }
        .access-denied-kicker {
          margin: 0 0 .35rem;
          color: var(--danger);
          font-size: .78rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .access-denied-panel h1 {
          margin: 0;
          font-size: clamp(1.5rem, 4vw, 2.1rem);
          font-weight: 900;
          color: var(--text1);
        }
        .access-denied-panel p {
          margin: .45rem 0 0;
          color: var(--text2);
          line-height: 1.7;
        }
        .access-denied-user {
          font-size: .88rem;
          color: var(--text3) !important;
        }
      `}</style>
    </main>
  );
}
