-- Remove unused tenant email field from system settings
ALTER TABLE "Tenant" DROP COLUMN IF EXISTS "email";
