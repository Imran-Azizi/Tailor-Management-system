import { useTranslation } from "react-i18next";
import { LuShare, LuSquarePlus } from "react-icons/lu";
import { Button, Modal } from "../ui/index.jsx";
import { isRtlLanguage } from "../../lib/locale.js";

export default function IosInstallGuide({ open, onClose, appName }) {
  const { t } = useTranslation();
  const isRtl = isRtlLanguage(
    (typeof document !== "undefined" &&
      document.documentElement.getAttribute("lang")) ||
      "en",
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("pwa.iosGuide.title")}
      maxW={420}
      boxClassName="pwa-ios-guide-modal"
      bodyClassName="pwa-ios-guide-body"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <p className="pwa-ios-guide__lead">
        {t("pwa.iosGuide.lead", { name: appName })}
      </p>

      <ol className="pwa-ios-guide__steps">
        <li>
          <span className="pwa-ios-guide__step-icon">
            <LuShare size={18} />
          </span>
          <div>
            <strong>{t("pwa.iosGuide.step1")}</strong>
            <p>{t("pwa.iosGuide.step1Hint")}</p>
          </div>
        </li>
        <li>
          <span className="pwa-ios-guide__step-icon">
            <LuSquarePlus size={18} />
          </span>
          <div>
            <strong>{t("pwa.iosGuide.step2")}</strong>
          </div>
        </li>
        <li>
          <span className="pwa-ios-guide__step-icon pwa-ios-guide__step-icon--check">
            ✓
          </span>
          <div>
            <strong>{t("pwa.iosGuide.step3")}</strong>
          </div>
        </li>
      </ol>

      <div className="pwa-ios-guide__actions">
        <Button type="button" onClick={onClose}>
          {t("pwa.iosGuide.gotIt")}
        </Button>
      </div>
    </Modal>
  );
}
