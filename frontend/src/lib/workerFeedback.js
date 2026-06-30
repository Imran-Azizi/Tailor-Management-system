import { getApiErrorMessage } from "./feedback.js";
import { normalizeLanguage } from "./locale.js";

const CODE_KEYS = {
  ORDER_NOT_FOUND: "orderNotFound",
  ORDER_NOT_ASSIGNED_TO_WORKER: "notAssignedToYou",
  ORDER_CLAIMED_BY_ANOTHER_WORKER: "claimedByOther",
  QICHIKAR_NOT_COMPLETED: "waitingForQichikar",
  ORDER_ALREADY_COMPLETED: "alreadyCompleted",
  WORK_ALREADY_COMPLETED: "workAlreadyCompleted",
  RECEIVE_ORDER_BEFORE_START: "receiveBeforeStart",
  INVALID_WORKER_ROLE: "invalidWorkerRole",
  NO_ELIGIBLE_ORDER: "noEligibleOrder",
};

const LEGACY_MESSAGE_CODES = new Map([
  ["order not found.", "ORDER_NOT_FOUND"],
  ["order not found", "ORDER_NOT_FOUND"],
  ["no matching record found", "ORDER_NOT_FOUND"],
  [
    "this order already receive by someone else try another",
    "ORDER_CLAIMED_BY_ANOTHER_WORKER",
  ],
  [
    "this order cannot be received yet. waiting for the qichikar (cutting) worker to complete their work first.",
    "QICHIKAR_NOT_COMPLETED",
  ],
  ["completed orders cannot be received.", "ORDER_ALREADY_COMPLETED"],
  ["order already completed.", "ORDER_ALREADY_COMPLETED"],
  [
    "qichikar work for this order is already completed.",
    "WORK_ALREADY_COMPLETED",
  ],
  [
    "dokht work for this order is already completed.",
    "WORK_ALREADY_COMPLETED",
  ],
  [
    "you can only complete orders assigned to you.",
    "ORDER_NOT_ASSIGNED_TO_WORKER",
  ],
  [
    "you can only update orders assigned to you.",
    "ORDER_NOT_ASSIGNED_TO_WORKER",
  ],
  ["receive this order before starting work.", "RECEIVE_ORDER_BEFORE_START"],
  ["invalid worker role.", "INVALID_WORKER_ROLE"],
  [
    "no eligible order found for this bill number.",
    "NO_ELIGIBLE_ORDER",
  ],
]);

function getFeedbackCode(error) {
  const responseCode = error?.response?.data?.code;
  if (responseCode) return responseCode;

  const rawMessage = String(
    error?.response?.data?.error || error?.response?.data?.message || "",
  )
    .trim()
    .toLowerCase();
  return LEGACY_MESSAGE_CODES.get(rawMessage) || null;
}

export function getWorkerFeedbackMessage(
  error,
  t,
  language,
  fallbackKey,
  fallbackEnglish,
) {
  const fallback = t(fallbackKey, fallbackEnglish);
  if (normalizeLanguage(language) === "en") {
    return getApiErrorMessage(error, fallback);
  }

  const feedbackKey = CODE_KEYS[getFeedbackCode(error)];
  return feedbackKey
    ? t(`workerPanel.feedback.${feedbackKey}`, fallback)
    : fallback;
}

export function workerToastOptions(language) {
  const isRtl = normalizeLanguage(language) !== "en";
  return {
    className: `app-toast worker-feedback-toast${
      isRtl ? " worker-feedback-toast--rtl" : ""
    }`,
    ariaProps: {
      role: "status",
      "aria-live": "polite",
    },
    style: {
      direction: isRtl ? "rtl" : "ltr",
      textAlign: isRtl ? "right" : "left",
    },
  };
}
