/**
 * Visible-tab-only poll interval helper for TanStack Query.
 * Reduces background battery/network use on mobile.
 */
export function visiblePollInterval(ms) {
  return () =>
    typeof document !== "undefined" && document.visibilityState === "visible"
      ? ms
      : false;
}
