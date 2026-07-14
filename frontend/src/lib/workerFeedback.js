import { getApiErrorMessage } from "./feedback.js";
import { normalizeLanguage } from "./locale.js";

const CODE_KEYS = {
  ORDER_NOT_FOUND: "orderNotFound",
  ORDER_NOT_ASSIGNED_TO_WORKER: "notAssignedToYou",
  ORDER_CLAIMED_BY_ANOTHER_WORKER: "claimedByOther",
  ORDER_ALREADY_COMPLETED: "alreadyCompleted",
  WORK_ALREADY_COMPLETED: "workAlreadyCompleted",
  RECEIVE_ORDER_BEFORE_START: "receiveBeforeStart",
  INVALID_WORKER_ROLE: "invalidWorkerRole",
  NO_ELIGIBLE_ORDER: "noEligibleOrder",
  ORDER_ALREADY_ASSIGNED_QICHIKAR: "alreadyAssignedQichikar",
  ORDER_ALREADY_ASSIGNED_DOKHT: "alreadyAssignedDokht",
  ORDER_COMPLETED_REASSIGN_BLOCKED: "completedReassignBlocked",
  ORDER_ALREADY_ACCEPTED: "alreadyAccepted",
};

const LEGACY_MESSAGE_CODES = new Map([
  ["order not found.", "ORDER_NOT_FOUND"],
  ["order not found", "ORDER_NOT_FOUND"],
  ["no matching record found", "ORDER_NOT_FOUND"],
  [
    "this order already receive by someone else try another",
    "ORDER_CLAIMED_BY_ANOTHER_WORKER",
  ],
  ["completed orders cannot be received.", "ORDER_ALREADY_COMPLETED"],
  ["completed orders cannot be declined.", "ORDER_ALREADY_COMPLETED"],
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
  [
    "you can only decline orders assigned to you.",
    "ORDER_NOT_ASSIGNED_TO_WORKER",
  ],
  ["receive this order before starting work.", "RECEIVE_ORDER_BEFORE_START"],
  ["invalid worker role.", "INVALID_WORKER_ROLE"],
  ["no eligible order found for this bill number.", "NO_ELIGIBLE_ORDER"],
  [
    "this order is already assigned to a qichikar worker and cannot be assigned again.",
    "ORDER_ALREADY_ASSIGNED_QICHIKAR",
  ],
  [
    "this order is already assigned to a dokht worker and cannot be assigned again.",
    "ORDER_ALREADY_ASSIGNED_DOKHT",
  ],
  [
    "this order completed, you can not assign it again",
    "ORDER_COMPLETED_REASSIGN_BLOCKED",
  ],
  [
    "cannot decline an order that was already accepted.",
    "ORDER_ALREADY_ACCEPTED",
  ],
]);

function getFeedbackCode(error) {
  const responseCode = error?.response?.data?.code;
  if (responseCode && CODE_KEYS[responseCode]) return responseCode;

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
  const feedbackKey = CODE_KEYS[getFeedbackCode(error)];
  if (feedbackKey) {
    return t(`workerPanel.feedback.${feedbackKey}`, fallback);
  }
  return getApiErrorMessage(error, fallback);
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
