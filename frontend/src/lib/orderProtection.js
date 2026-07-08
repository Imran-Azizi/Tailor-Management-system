export const COMPLETED_ORDER_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getCompletedOrderProtection(order) {
  if (!order?.isCompleted) {
    return {
      isProtected: false,
      canEdit: true,
      canDelete: true,
      isExpired: false,
      expiresAt: null,
      remainingMs: 0,
    };
  }

  const completedAt = order.completedAt
    ? new Date(order.completedAt).getTime()
    : null;
  const expiresAt = completedAt
    ? completedAt + COMPLETED_ORDER_EDIT_WINDOW_MS
    : null;
  const isExpired = expiresAt ? Date.now() > expiresAt : true;
  const remainingMs = expiresAt ? Math.max(0, expiresAt - Date.now()) : 0;

  return {
    isProtected: true,
    canEdit: !isExpired,
    canDelete: !isExpired,
    isExpired,
    expiresAt,
    remainingMs,
  };
}

export function formatRemainingTime(ms) {
  if (!ms || ms <= 0) return "0h 0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
