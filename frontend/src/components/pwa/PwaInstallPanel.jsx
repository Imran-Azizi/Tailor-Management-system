import { useTranslation } from "react-i18next";
import { LuSmartphone } from "react-icons/lu";
import { Button } from "../ui/index.jsx";
import { usePwa } from "../../context/PwaContext.jsx";
import "../../styles/pwa.css";

export default function PwaInstallPanel({ variant = "card" }) {
  const { t } = useTranslation();
  const { branding, canOfferInstall, install, installing, platform } = usePwa();

  if (!canOfferInstall) return null;

  const title = branding.name
    ? t("pwa.titleWithName", { name: branding.name })
    : t("pwa.title");

  if (variant === "compact") {
    return (
      <button
        type="button"
        className="pwa-menu-install-item"
        onClick={() => install()}
        disabled={installing}
      >
        <LuSmartphone size={14} />
        <span>{t("pwa.menuInstall")}</span>
      </button>
    );
  }

  return (
    <section className="pwa-settings-panel">
      <div className="pwa-settings-panel__icon" aria-hidden="true">
        <img src={branding.iconUrl} alt="" />
        <span className="pwa-settings-panel__icon-badge">
          <LuSmartphone size={14} />
        </span>
      </div>
      <div className="pwa-settings-panel__copy">
        <h2>{title}</h2>
        <p>{branding.description}</p>
        {platform === "android" && (
          <p className="pwa-settings-panel__hint">{t("pwa.settingsHint")}</p>
        )}
        {platform === "ios" && (
          <p className="pwa-settings-panel__hint">{t("pwa.settingsHintIos")}</p>
        )}
      </div>
      <Button type="button" onClick={() => install()} disabled={installing}>
        {t("pwa.install")}
      </Button>
    </section>
  );
}
