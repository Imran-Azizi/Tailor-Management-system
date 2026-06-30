-- Store the latest owner password value for Superadmin tenant-owner visibility.
-- Existing rows remain null until a password is created or updated through the app.
ALTER TABLE "User" ADD COLUMN "latestPassword" TEXT;
