const PWA_DISMISS_UNTIL_KEY = "pwa-install-dismiss-until";
const PWA_INSTALLED_KEY = "pwa-install-completed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_PWA_THEME_COLOR = "#D97706";
export const DEFAULT_PWA_BACKGROUND_COLOR = "#F8FAFC";

export function isPwaStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

export function isMobileDevice() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isTouchMac =
    navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    isTouchMac ||
    window.innerWidth < 900
  );
}

export function isDesktopDevice() {
  return !isMobileDevice();
}

export function isIosDevice() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isIosSafari() {
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent || "";
  return /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
}

export function isAndroidDevice() {
  if (typeof window === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

export function canShowInstallPrompt() {
  if (typeof window === "undefined") return false;
  if (isDesktopDevice()) return false;
  if (isPwaStandalone()) return false;
  if (wasInstallCompleted()) return false;
  if (isDismissed()) return false;
  return true;
}

export function wasInstallCompleted() {
  try {
    return localStorage.getItem(PWA_INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markInstallCompleted() {
  try {
    localStorage.setItem(PWA_INSTALLED_KEY, "1");
    localStorage.removeItem(PWA_DISMISS_UNTIL_KEY);
  } catch {
    // ignore storage errors
  }
}

export function isDismissed() {
  try {
    const until = Number(localStorage.getItem(PWA_DISMISS_UNTIL_KEY) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  try {
    localStorage.setItem(
      PWA_DISMISS_UNTIL_KEY,
      String(Date.now() + DISMISS_DURATION_MS),
    );
  } catch {
    // ignore storage errors
  }
}

export function clearInstallDismissal() {
  try {
    localStorage.removeItem(PWA_DISMISS_UNTIL_KEY);
  } catch {
    // ignore storage errors
  }
}

export function truncateForShortName(value, max = 12) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}
