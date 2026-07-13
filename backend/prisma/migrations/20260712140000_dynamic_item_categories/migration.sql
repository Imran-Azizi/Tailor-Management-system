-- CreateTable
CREATE TABLE "ItemCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "iconKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCategory_pkey" PRIMARY KEY ("id")
);

-- Add nullable category columns
ALTER TABLE "Item" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "ItemSale" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "ItemSale" ADD COLUMN "categoryName" TEXT;

-- Seed categories from existing item/sale types per tenant
WITH type_mapping AS (
    SELECT *
    FROM (
        VALUES
            ('WATCH'::"ItemType", 'ساعت‌ها', 'watch', '#2563EB', 0),
            ('PERFUME'::"ItemType", 'عطرها', 'sparkles', '#DB2777', 1),
            ('BOOT'::"ItemType", 'بوت‌ها', 'bag', '#92400E', 2),
            ('RING'::"ItemType", 'انگشترها', 'gem', '#7C3AED', 3),
            ('SLIPPER'::"ItemType", 'چپلی‌ها', 'footprints', '#0D9488', 4)
    ) AS mapping(type, name, icon_key, color, sort_order)
),
distinct_types AS (
    SELECT "tenantId", type
    FROM "Item"
    UNION
    SELECT "tenantId", type
    FROM "ItemSale"
),
category_seed AS (
    SELECT
        md5(dt."tenantId" || ':' || dt.type::text || ':item-category') AS id,
        dt."tenantId",
        tm.name,
        tm.icon_key AS "iconKey",
        tm.color,
        tm.sort_order AS "sortOrder",
        COALESCE(
            (
                SELECT i."createdById"
                FROM "Item" i
                WHERE i."tenantId" = dt."tenantId" AND i.type = dt.type
                ORDER BY i."createdAt" ASC
                LIMIT 1
            ),
            (
                SELECT s."createdById"
                FROM "ItemSale" s
                WHERE s."tenantId" = dt."tenantId" AND s.type = dt.type
                ORDER BY s."createdAt" ASC
                LIMIT 1
            ),
            (
                SELECT u.id
                FROM "User" u
                WHERE u."tenantId" = dt."tenantId"
                ORDER BY u."createdAt" ASC
                LIMIT 1
            )
        ) AS "createdById"
    FROM distinct_types dt
    JOIN type_mapping tm ON tm.type = dt.type
)
INSERT INTO "ItemCategory" (
    "id",
    "tenantId",
    "name",
    "iconKey",
    "color",
    "isActive",
    "sortOrder",
    "createdById",
    "createdAt",
    "updatedAt"
)
SELECT
    cs.id,
    cs."tenantId",
    cs.name,
    cs."iconKey",
    cs.color,
    true,
    cs."sortOrder",
    cs."createdById",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM category_seed cs
WHERE cs."createdById" IS NOT NULL;

-- Backfill item category references
UPDATE "Item" i
SET "categoryId" = ic.id
FROM "ItemCategory" ic
JOIN (
    SELECT *
    FROM (
        VALUES
            ('WATCH'::"ItemType", 'ساعت‌ها'),
            ('PERFUME'::"ItemType", 'عطرها'),
            ('BOOT'::"ItemType", 'بوت‌ها'),
            ('RING'::"ItemType", 'انگشترها'),
            ('SLIPPER'::"ItemType", 'چپلی‌ها')
    ) AS mapping(type, name)
) tm ON tm.name = ic.name
WHERE i."tenantId" = ic."tenantId"
  AND i.type = tm.type;

-- Backfill sale category references
UPDATE "ItemSale" s
SET
    "categoryId" = ic.id,
    "categoryName" = ic.name
FROM "ItemCategory" ic
JOIN (
    SELECT *
    FROM (
        VALUES
            ('WATCH'::"ItemType", 'ساعت‌ها'),
            ('PERFUME'::"ItemType", 'عطرها'),
            ('BOOT'::"ItemType", 'بوت‌ها'),
            ('RING'::"ItemType", 'انگشترها'),
            ('SLIPPER'::"ItemType", 'چپلی‌ها')
    ) AS mapping(type, name)
) tm ON tm.name = ic.name
WHERE s."tenantId" = ic."tenantId"
  AND s.type = tm.type;

-- Remove legacy type columns
DROP INDEX IF EXISTS "Item_type_idx";
DROP INDEX IF EXISTS "Item_tenantId_type_idx";
DROP INDEX IF EXISTS "ItemSale_type_idx";

ALTER TABLE "Item" DROP COLUMN "type";
ALTER TABLE "ItemSale" DROP COLUMN "type";

DROP TYPE "ItemType";

-- Enforce new schema
ALTER TABLE "Item" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "ItemSale" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "ItemSale" ALTER COLUMN "categoryName" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ItemCategory_tenantId_name_key" ON "ItemCategory"("tenantId", "name");
CREATE INDEX "ItemCategory_tenantId_idx" ON "ItemCategory"("tenantId");
CREATE INDEX "ItemCategory_tenantId_isActive_idx" ON "ItemCategory"("tenantId", "isActive");
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");
CREATE INDEX "Item_tenantId_categoryId_idx" ON "Item"("tenantId", "categoryId");
CREATE INDEX "ItemSale_categoryId_idx" ON "ItemSale"("categoryId");

-- AddForeignKey
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
