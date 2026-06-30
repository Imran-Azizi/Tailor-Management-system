-- Enforce the tenant ownership invariant at the database level so concurrent
-- requests cannot create or promote a second Admin.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    WHERE "tenantId" IS NOT NULL
      AND "accountType" = 'ADMIN'
    GROUP BY "tenantId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one Admin per tenant because duplicate Admin users already exist.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_one_admin_per_tenant_key"
  ON "User" ("tenantId")
  WHERE "tenantId" IS NOT NULL
    AND "accountType" = 'ADMIN';
