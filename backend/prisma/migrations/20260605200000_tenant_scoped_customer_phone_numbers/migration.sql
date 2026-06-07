-- Customer phone numbers are tenant-local in the SaaS model. Separate tenants
-- may have the same customer phone number, while duplicates inside one tenant
-- remain blocked.
DROP INDEX IF EXISTS "Customer_phoneNumber_key";
DROP INDEX IF EXISTS "Customer_tenantId_phoneNumber_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_tenantId_phoneNumber_key"
  ON "Customer"("tenantId", "phoneNumber");
