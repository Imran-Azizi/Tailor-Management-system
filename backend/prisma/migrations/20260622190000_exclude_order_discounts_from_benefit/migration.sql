-- totalBenefit historically used the gross order price. Normalize existing
-- records so dashboard and report aggregates use post-discount income.
UPDATE "Order"
SET "totalBenefit" = "totalBenefit" - COALESCE("discount", 0)
WHERE COALESCE("discount", 0) <> 0;

UPDATE "DamagedClothesPenalty" AS penalty
SET "totalOrderAmount" = GREATEST(
  0,
  penalty."totalOrderAmount" - COALESCE("Order"."discount", 0)
)
FROM "Order"
WHERE penalty."orderId" = "Order"."id"
  AND COALESCE("Order"."discount", 0) <> 0;
