ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "netProfitRecognizedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "netProfitRecognizedAmount" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "netProfitRecognizedById" TEXT;

UPDATE "Order"
SET
  "netProfitRecognizedAt" = COALESCE("completedAt", "updatedAt"),
  "netProfitRecognizedAmount" = COALESCE("totalBenefit", 0)
WHERE "isCompleted" = true
  AND "netProfitRecognizedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Order_netProfitRecognizedAt_idx" ON "Order"("netProfitRecognizedAt");
CREATE INDEX IF NOT EXISTS "Order_netProfitRecognizedById_idx" ON "Order"("netProfitRecognizedById");
CREATE INDEX IF NOT EXISTS "Order_isCompleted_completedAt_idx" ON "Order"("isCompleted", "completedAt");
CREATE INDEX IF NOT EXISTS "Order_tenantId_netProfitRecognizedAt_idx" ON "Order"("tenantId", "netProfitRecognizedAt");
