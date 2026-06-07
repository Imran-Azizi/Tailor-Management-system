-- Tenant-owned catalog codes must not collide across separate businesses.
DROP INDEX IF EXISTS "ReadyMadeClothing_clothingCode_key";
DROP INDEX IF EXISTS "ReadyMadeClothing_tenantId_clothingCode_idx";
DROP INDEX IF EXISTS "ReadyMadeWaskatClothing_waskatCode_key";
DROP INDEX IF EXISTS "ReadyMadeWaskatClothing_tenantId_waskatCode_idx";
DROP INDEX IF EXISTS "Item_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ReadyMadeClothing_tenantId_clothingCode_key"
  ON "ReadyMadeClothing"("tenantId", "clothingCode");

CREATE UNIQUE INDEX IF NOT EXISTS "ReadyMadeWaskatClothing_tenantId_waskatCode_key"
  ON "ReadyMadeWaskatClothing"("tenantId", "waskatCode");

CREATE UNIQUE INDEX IF NOT EXISTS "Item_tenantId_code_key"
  ON "Item"("tenantId", "code");
