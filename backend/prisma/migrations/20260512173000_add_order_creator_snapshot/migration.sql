-- Keep a stable creator label on each order even if the user profile changes later.
ALTER TABLE "Order" ADD COLUMN "createdByName" TEXT;
ALTER TABLE "Order" ADD COLUMN "createdByRole" "AccountType";

-- Backfill creator id from the legacy Finance creator where available.
UPDATE "Order"
SET "createdById" = "createdByFinanceId"
WHERE "createdById" IS NULL AND "createdByFinanceId" IS NOT NULL;

-- Backfill snapshots for orders that already have a creator relation.
UPDATE "Order" AS o
SET
  "createdByName" = u."name",
  "createdByRole" = u."accountType"
FROM "User" AS u
WHERE o."createdById" = u."id"
  AND (o."createdByName" IS NULL OR o."createdByRole" IS NULL);
