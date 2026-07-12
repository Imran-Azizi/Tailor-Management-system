import { useTranslation } from "react-i18next";
import { LuSmartphone, LuX } from "react-icons/lu";
import { Button } from "../ui/index.jsx";
import { usePwa } from "../../context/PwaContext.jsx";
import IosInstallGuide from "./IosInstallGuide.jsx";
import "../../styles/pwa.css";

function PwaBrandIcon({ iconUrl }) {
  return (
    <div className="pwa-install-card__icon" aria-hidden="true">
      <img src={iconUrl} alt="" />
      <span className="pwa-install-card__icon-badge">
        <LuSmartphone size={14} />
      </span>
    </div>
  );
}

export default function PwaInstallPrompt() {
  const { t } = useTranslation();
  const {
    branding,
    showBanner,
    install,
    dismiss,
    installing,
    iosGuideOpen,
    closeIosGuide,
    platform,
  } = usePwa();

  const title = branding.name
    ? t("pwa.titleWithName", { name: branding.name })
    : t("pwa.title");

  return (
    <>
      {showBanner ? (
        <div className="pwa-install-shell" role="region" aria-label={title}>
          <div className="pwa-install-card">
            <button
              type="button"
              className="pwa-install-card__close"
              onClick={dismiss}
              aria-label={t("pwa.close")}
            >
              <LuX size={16} />
            </button>

            <PwaBrandIcon iconUrl={branding.iconUrl} />

            <div className="pwa-install-card__copy">
              <p className="pwa-install-card__title">{title}</p>
              <p className="pwa-install-card__description">
                {branding.description}
              </p>
            </div>

            <div className="pwa-install-card__actions">
              <Button
                type="button"
                size="sm"
                onClick={install}
                disabled={installing}
                className="pwa-install-card__install-btn"
              >
                {t("pwa.install")}
              </Button>
              <button
                type="button"
                className="pwa-install-card__later-btn"
                onClick={dismiss}
              >
                {t("pwa.later")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <IosInstallGuide
        open={iosGuideOpen}
        onClose={closeIosGuide}
        appName={branding.name}
      />

      <span className="sr-only" aria-live="polite">
        {platform === "ios" && iosGuideOpen ? t("pwa.iosGuide.title") : ""}
      </span>
    </>
  );
}
