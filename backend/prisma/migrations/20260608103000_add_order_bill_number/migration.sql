ALTER TABLE "Order" ADD COLUMN "billNumber" INTEGER;

UPDATE "Order" AS o
SET "billNumber" = c."billNumber"
FROM "Customer" AS c
WHERE o."customerId" = c."id"
  AND o."billNumber" IS NULL;

CREATE INDEX "Order_billNumber_idx" ON "Order"("billNumber");
CREATE INDEX "Order_tenantId_billNumber_idx" ON "Order"("tenantId", "billNumber");
