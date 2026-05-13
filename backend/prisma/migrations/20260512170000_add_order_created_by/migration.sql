-- Track the authenticated user who created each order.
ALTER TABLE "Order" ADD COLUMN "createdById" TEXT;

UPDATE "Order"
SET "createdById" = "createdByFinanceId"
WHERE "createdByFinanceId" IS NOT NULL;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");
