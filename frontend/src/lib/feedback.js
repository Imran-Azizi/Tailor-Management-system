import i18n from "../i18n/index.js";
import {
  localizeApiValidationDetail,
  localizeValidationMessage,
} from "./validationLocalization.js";
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from "./toast.js";

const API_ERROR_CODE_MESSAGES = {
  ORDER_ALREADY_ASSIGNED_QICHIKAR:
    "This order is already assigned to a Qichikar worker and cannot be assigned again.",
  ORDER_ALREADY_ASSIGNED_DOKHT:
    "This order is already assigned to a Dokht worker and cannot be assigned again.",
  ORDER_COMPLETED_REASSIGN_BLOCKED:
    "This order completed, you can not assign it again",
  ORDER_CLAIMED_BY_ANOTHER_WORKER:
    "this order already receive by someone else try another",
  TENANT_SUSPENDED: "Tenant account is suspended.",
  SUBSCRIPTION_EXPIRED: "Subscription expired.",
  INVALID_CURRENT_PASSWORD: "Current password is incorrect.",
  PHONE_IN_USE: "This phone number is already in use.",
};

export function getApiErrorMessage(
  error,
  fallback = i18n.t(
    "feedback.genericError",
    "Something went wrong. Please try again.",
  ),
) {
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const status = error?.response?.status;
  const responseCode = error?.response?.data?.code;

  if (responseCode && API_ERROR_CODE_MESSAGES[responseCode]) {
    return localizeValidationMessage(
      API_ERROR_CODE_MESSAGES[responseCode],
      language,
    );
  }

  if (!error?.response && error?.message) {
    const lowered = String(error.message).toLowerCase();
    if (lowered.includes("network") || error?.code === "ERR_NETWORK") {
      return i18n.t(
        "feedback.networkError",
        "The server could not be reached. Check your connection and try again.",
      );
    }
    if (lowered.includes("timeout") || error?.code === "ECONNABORTED") {
      return i18n.t(
        "feedback.timeoutError",
        "The request took too long. Please try again.",
      );
    }
  }

  if (status === 403) {
    const firstDetail = error?.response?.data?.details?.[0];
    if (firstDetail?.message) {
      return localizeApiValidationDetail(firstDetail, language);
    }
    const permissionMessage =
      error?.response?.data?.error || error?.response?.data?.message;
    if (permissionMessage) {
      return localizeValidationMessage(permissionMessage, language);
    }
    return i18n.t(
      "feedback.permissionDenied",
      "You do not have permission to perform this action.",
    );
  }

  if (status === 401) {
    return i18n.t(
      "feedback.unauthorized",
      "Your session has expired. Please sign in again.",
    );
  }

  if (status >= 500) {
    return i18n.t(
      "feedback.serverError",
      "A server error occurred. Please try again shortly.",
    );
  }

  const firstDetail = error?.response?.data?.details?.[0];

  if (firstDetail?.message) {
    return localizeApiValidationDetail(firstDetail, language);
  }

  const message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback;

  return localizeValidationMessage(message, language);
}

/** Toast success for CRUD / action outcomes. */
export function showSuccessToast(message, options) {
  return notifySuccess(message, options);
}

/** Toast error — pass API errors through getApiErrorMessage first when possible. */
export function showErrorToast(messageOrError, fallback, options) {
  if (messageOrError && typeof messageOrError === "object" && (messageOrError.response || messageOrError.message)) {
    return notifyError(getApiErrorMessage(messageOrError, fallback), options);
  }
  return notifyError(messageOrError || fallback, options);
}

export function showWarningToast(message, options) {
  return notifyWarning(message, options);
}

export function showInfoToast(message, options) {
  return notifyInfo(message, options);
}
