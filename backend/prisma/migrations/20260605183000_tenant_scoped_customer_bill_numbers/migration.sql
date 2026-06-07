-- Bill numbers are tenant-local in the SaaS model. Tenant A and Tenant B can
-- both have bill #1, but one tenant cannot have two customers with bill #1.
DROP INDEX IF EXISTS "Customer_billNumber_key";
DROP INDEX IF EXISTS "Customer_tenantId_billNumber_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_tenantId_billNumber_key"
  ON "Customer"("tenantId", "billNumber");
