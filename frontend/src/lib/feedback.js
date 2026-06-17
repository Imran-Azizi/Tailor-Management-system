import i18n from "../i18n/index.js";
import {
  localizeApiValidationDetail,
  localizeValidationMessage,
} from "./validationLocalization.js";

export function getApiErrorMessage(
  error,
  fallback = "Something went wrong. Please try again.",
) {
  const language = i18n.resolvedLanguage || i18n.language || "en";
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
