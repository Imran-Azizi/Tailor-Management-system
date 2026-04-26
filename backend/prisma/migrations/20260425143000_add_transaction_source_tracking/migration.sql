-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'SYSTEM_ORDER_ASSIGNMENT', 'SYSTEM_WORKER_COMPLETION');

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL';

-- Backfill legacy system-generated rows so Loan Total stays manual-only.
UPDATE "Transaction"
SET "source" = 'SYSTEM_ORDER_ASSIGNMENT'
WHERE "note" IS NOT NULL
  AND "note" LIKE 'Order assignment (%';

UPDATE "Transaction"
SET "source" = 'SYSTEM_WORKER_COMPLETION'
WHERE "note" IS NOT NULL
  AND "note" LIKE 'Worker completion payment -%';

-- CreateIndex
CREATE INDEX "Transaction_source_idx" ON "Transaction"("source");
CREATE INDEX "Transaction_userId_source_kind_idx" ON "Transaction"("userId", "source", "kind");
