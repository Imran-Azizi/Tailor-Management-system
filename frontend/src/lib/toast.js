import toast from "react-hot-toast";

/** Default durations (ms) by toast kind — tuned for readability without lingering. */
export const TOAST_DURATION = {
  success: 3200,
  error: 4800,
  warning: 4200,
  info: 3800,
};

function dismissDuplicates(message) {
  // react-hot-toast keeps identical message ids when using toast.custom; for
  // standard calls we rely on a short dedupe via message fingerprint.
  return String(message || "").trim();
}

/**
 * Show a professional success toast. Prefer localized strings via t(...).
 */
export function notifySuccess(message, options = {}) {
  const text = dismissDuplicates(message);
  if (!text) return;
  return toast.success(text, {
    duration: TOAST_DURATION.success,
    ...options,
  });
}

/**
 * Show a professional error toast. Prefer getApiErrorMessage(...) + t(...) fallbacks.
 */
export function notifyError(message, options = {}) {
  const text = dismissDuplicates(message);
  if (!text) return;
  return toast.error(text, {
    duration: TOAST_DURATION.error,
    ...options,
  });
}

/**
 * Warning / soft attention toast (still actionable, not a hard failure).
 */
export function notifyWarning(message, options = {}) {
  const text = dismissDuplicates(message);
  if (!text) return;
  return toast(text, {
    duration: TOAST_DURATION.warning,
    icon: "⚠️",
    className: `app-toast app-toast--warning ${options.className || ""}`.trim(),
    ...options,
  });
}

/**
 * Neutral information toast.
 */
export function notifyInfo(message, options = {}) {
  const text = dismissDuplicates(message);
  if (!text) return;
  return toast(text, {
    duration: TOAST_DURATION.info,
    icon: "ℹ️",
    className: `app-toast app-toast--info ${options.className || ""}`.trim(),
    ...options,
  });
}

/**
 * Map Zod/react-hook-form-style issue arrays or flattenError maps into
 * `{ fieldName: message }` for inline Field error rendering.
 */
export function mapZodFieldErrors(zodError) {
  const errors = {};
  if (!zodError?.issues?.length) return errors;

  for (const issue of zodError.issues) {
    const path = Array.isArray(issue.path) ? issue.path : [];
    if (!path.length) continue;
    // Prefer first error per leaf path; join nested paths with "."
    const key = path
      .map((part) => (typeof part === "number" ? String(part) : part))
      .join(".");
    if (key && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

/**
 * Flatten nested ton field paths like `tons.0.name` into a nested structure
 * usable by rakht forms: `{ tons: { 0: { name: "..." } } }`.
 */
export function nestFieldErrors(flatErrors) {
  const nested = {};
  for (const [key, message] of Object.entries(flatErrors || {})) {
    const parts = key.split(".");
    if (parts.length === 1) {
      nested[key] = message;
      continue;
    }
    let cursor = nested;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      cursor[part] = cursor[part] || {};
      cursor = cursor[part];
    }
    cursor[parts[parts.length - 1]] = message;
  }
  return nested;
}
