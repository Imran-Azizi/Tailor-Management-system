-- Remove premature worker payouts from orders that are not completed by the relevant worker role.
UPDATE "Order"
SET
  "qichikarPaymentStatus" = 'UNPAID',
  "qichikarPaymentAmount" = NULL,
  "qichikarPaidAt" = NULL,
  "qichikarPaidById" = NULL
WHERE "qichikarCompletedAt" IS NULL
  AND (
    "qichikarPaymentStatus" = 'PAID_TO_WORKER'
    OR "qichikarPaymentAmount" IS NOT NULL
    OR "qichikarPaidAt" IS NOT NULL
    OR "qichikarPaidById" IS NOT NULL
  );

UPDATE "Order"
SET
  "dokhtPaymentStatus" = 'UNPAID',
  "dokhtPaymentAmount" = NULL,
  "dokhtPaidAt" = NULL,
  "dokhtPaidById" = NULL
WHERE "dokhtCompletedAt" IS NULL
  AND (
    "dokhtPaymentStatus" = 'PAID_TO_WORKER'
    OR "dokhtPaymentAmount" IS NOT NULL
    OR "dokhtPaidAt" IS NOT NULL
    OR "dokhtPaidById" IS NOT NULL
  );

UPDATE "Order"
SET
  "workerPaymentStatus" = 'UNPAID',
  "workerPaymentAmount" = NULL,
  "workerPaidAt" = NULL,
  "workerPaidById" = NULL
WHERE "qichikarCompletedAt" IS NULL
  AND "dokhtCompletedAt" IS NULL
  AND (
    "workerPaymentStatus" = 'PAID_TO_WORKER'
    OR "workerPaymentAmount" IS NOT NULL
    OR "workerPaidAt" IS NOT NULL
    OR "workerPaidById" IS NOT NULL
  );

-- Ensure historically completed orders reflect earned amounts.
UPDATE "Order"
SET
  "qichikarPaymentStatus" = 'PAID_TO_WORKER',
  "qichikarPaymentAmount" = COALESCE("qichikarPaymentAmount", "assignmentPrice"),
  "qichikarPaidAt" = COALESCE("qichikarPaidAt", "qichikarCompletedAt", "updatedAt")
WHERE "qichikarCompletedAt" IS NOT NULL
  AND COALESCE("qichikarPaymentAmount", "assignmentPrice", 0) > 0
  AND (
    "qichikarPaymentStatus" <> 'PAID_TO_WORKER'
    OR "qichikarPaymentAmount" IS NULL
  );

UPDATE "Order"
SET
  "dokhtPaymentStatus" = 'PAID_TO_WORKER',
  "dokhtPaymentAmount" = COALESCE("dokhtPaymentAmount", "assignmentPrice"),
  "dokhtPaidAt" = COALESCE("dokhtPaidAt", "dokhtCompletedAt", "updatedAt")
WHERE "dokhtCompletedAt" IS NOT NULL
  AND COALESCE("dokhtPaymentAmount", "assignmentPrice", 0) > 0
  AND (
    "dokhtPaymentStatus" <> 'PAID_TO_WORKER'
    OR "dokhtPaymentAmount" IS NULL
  );

-- Keep legacy payment fields aligned with role-specific completion records.
UPDATE "Order"
SET
  "workerPaymentStatus" = "dokhtPaymentStatus",
  "workerPaymentAmount" = "dokhtPaymentAmount",
  "workerPaidAt" = "dokhtPaidAt",
  "workerPaidById" = "dokhtPaidById"
WHERE "dokhtCompletedAt" IS NOT NULL;

UPDATE "Order"
SET
  "workerPaymentStatus" = "qichikarPaymentStatus",
  "workerPaymentAmount" = "qichikarPaymentAmount",
  "workerPaidAt" = "qichikarPaidAt",
  "workerPaidById" = "qichikarPaidById"
WHERE "qichikarCompletedAt" IS NOT NULL
  AND "dokhtCompletedAt" IS NULL;
