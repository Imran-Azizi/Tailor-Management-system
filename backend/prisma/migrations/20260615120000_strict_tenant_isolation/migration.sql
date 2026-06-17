-- Make user phone numbers tenant-specific instead of globally unique.
DROP INDEX IF EXISTS "User_phoneNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_tenantId_phoneNumber_key"
  ON "User"("tenantId", "phoneNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "User_superAdmin_phoneNumber_key"
  ON "User"("phoneNumber")
  WHERE "tenantId" IS NULL;

-- Design option tables are tenant-owned settings. Existing global rows belong
-- to the default tenant; new tenants start empty unless they add their own.
DO $$
DECLARE
  model_name TEXT;
  design_models TEXT[] := ARRAY[
    'Yakhan',
    'Astin',
    'ShoulderState',
    'NeckOutfit',
    'NeckWaskat',
    'Daman',
    'JibRow',
    'JibBaghle',
    'JibTenban',
    'PatyShip',
    'ButtonShip',
    'TenbanShip',
    'OutfitDesign',
    'YakhanQaqNeck',
    'YakhanQaqSleeve',
    'YakhanQaqSkirt',
    'YakhanQaqDesignOption',
    'YakhanQaqButtonShip',
    'YakhanQaqPantShip'
  ];
BEGIN
  FOREACH model_name IN ARRAY design_models LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT %L',
      model_name,
      'default-tenant'
    );

    EXECUTE format('DROP INDEX IF EXISTS %I', model_name || '_name_key');
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I ("tenantId")',
      model_name || '_tenantId_idx',
      model_name
    );
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I ("tenantId", "name")',
      model_name || '_tenantId_name_key',
      model_name
    );

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = model_name || '_tenantId_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE',
        model_name,
        model_name || '_tenantId_fkey'
      );
    END IF;
  END LOOP;
END $$;

-- Order detail tables are tenant-owned too. Backfill from their parent order.
DO $$
DECLARE
  model_name TEXT;
  order_detail_models TEXT[] := ARRAY[
    'Outfit',
    'Waskat',
    'Korty',
    'YakhanQaq',
    'ReadyMadeOrder',
    'ReadyMadeWaskatOrder'
  ];
BEGIN
  FOREACH model_name IN ARRAY order_detail_models LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "tenantId" TEXT', model_name);
    EXECUTE format(
      'UPDATE %I AS detail SET "tenantId" = COALESCE(detail."tenantId", parent."tenantId", %L) FROM "Order" AS parent WHERE detail."orderId" = parent."id"',
      model_name,
      'default-tenant'
    );
    EXECUTE format('UPDATE %I SET "tenantId" = %L WHERE "tenantId" IS NULL', model_name, 'default-tenant');
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "tenantId" SET DEFAULT %L', model_name, 'default-tenant');
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "tenantId" SET NOT NULL', model_name);

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I ("tenantId")',
      model_name || '_tenantId_idx',
      model_name
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I ("tenantId", "orderId")',
      model_name || '_tenantId_orderId_idx',
      model_name
    );

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = model_name || '_tenantId_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE',
        model_name,
        model_name || '_tenantId_fkey'
      );
    END IF;
  END LOOP;
END $$;
