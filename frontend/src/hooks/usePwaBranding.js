import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api.js";
import { assetUrl } from "../lib/assets.js";
import { applyPwaBranding } from "../lib/pwaManifest.js";
import { DEFAULT_PWA_THEME_COLOR, truncateForShortName } from "../lib/pwa.js";
import { useAuth } from "../context/AuthContext.jsx";

function resolveBrandName(tenant, fallbackName) {
  return (
    tenant?.systemName ||
    tenant?.businessName ||
    fallbackName ||
    "Hoshmand Safi"
  );
}

export function usePwaBranding() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [publicTenant, setPublicTenant] = useState(null);

  useEffect(() => {
    let active = true;

    api
      .get("/public/tenant-context", { skipAuthRedirect: true })
      .then(({ data }) => {
        if (active) setPublicTenant(data?.tenant || null);
      })
      .catch(() => {
        if (active) setPublicTenant(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const tenant = user?.tenant || publicTenant;

  const branding = useMemo(() => {
    const fallbackName = t("appName");
    const name = resolveBrandName(tenant, fallbackName);
    const iconUrl = tenant?.logoUrl
      ? assetUrl(tenant.logoUrl)
      : "/system_icon.png";

    return {
      name,
      shortName: truncateForShortName(name, 12) || truncateForShortName(fallbackName, 12),
      description: tenant
        ? t("pwa.descriptionWithName", {
            name,
            defaultValue: `Install ${name} on your home screen for faster access.`,
          })
        : t("pwa.description"),
      themeColor: DEFAULT_PWA_THEME_COLOR,
      iconUrl,
      lang: i18n.resolvedLanguage || i18n.language || "en",
    };
  }, [tenant, t, i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    applyPwaBranding(branding);
  }, [branding]);

  return branding;
}
