import { useCallback, useEffect, useMemo, useState } from "react";
import {
  canShowInstallPrompt,
  dismissInstallPrompt,
  isAndroidDevice,
  isDesktopDevice,
  isIosDevice,
  isMobileDevice,
  isPwaStandalone,
  markInstallCompleted,
  wasInstallCompleted,
} from "../lib/pwa.js";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isPwaStandalone() || wasInstallCompleted());
  const [dismissed, setDismissed] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onAppInstalled = () => {
      markInstallCompleted();
      setInstalled(true);
      setDeferredPrompt(null);
      setIosGuideOpen(false);
    };

    const onDisplayModeChange = () => {
      if (isPwaStandalone()) {
        markInstallCompleted();
        setInstalled(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window
      .matchMedia("(display-mode: standalone)")
      .addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window
        .matchMedia("(display-mode: standalone)")
        .removeEventListener("change", onDisplayModeChange);
    };
  }, []);

  const platform = useMemo(() => {
    if (isIosDevice()) return "ios";
    if (isAndroidDevice()) return "android";
    if (isMobileDevice()) return "mobile";
    return "desktop";
  }, []);

  const canInstallNatively = Boolean(deferredPrompt);
  const canOfferInstall = useMemo(() => {
    if (installed || isDesktopDevice()) return false;
    return isMobileDevice();
  }, [installed]);

  const showBanner = useMemo(() => {
    if (dismissed || installed) return false;
    return canShowInstallPrompt();
  }, [dismissed, installed]);

  const dismiss = useCallback(() => {
    dismissInstallPrompt();
    setDismissed(true);
  }, []);

  const openIosGuide = useCallback(() => {
    setIosGuideOpen(true);
  }, []);

  const closeIosGuide = useCallback(() => {
    setIosGuideOpen(false);
  }, []);

  const install = useCallback(async () => {
    if (installed) return { outcome: "already-installed" };

    if (platform === "ios") {
      openIosGuide();
      return { outcome: "ios-guide" };
    }

    if (!deferredPrompt) {
      return { outcome: "unavailable" };
    }

    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        markInstallCompleted();
        setInstalled(true);
        setDeferredPrompt(null);
      }
      return choice;
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt, installed, openIosGuide, platform]);

  return {
    platform,
    showBanner,
    canOfferInstall,
    installed,
    installing,
    canInstallNatively,
    iosGuideOpen,
    install,
    dismiss,
    openIosGuide,
    closeIosGuide,
    isStandalone: installed,
  };
}
