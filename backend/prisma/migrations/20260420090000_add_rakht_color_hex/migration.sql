ALTER TABLE "Order"
ADD COLUMN "rakhtColorHex" TEXT;

ALTER TABLE "Rakht"
ADD COLUMN "colorHex" TEXT NOT NULL DEFAULT '#94A3B8';

UPDATE "Rakht"
SET "colorHex" = CASE
  WHEN "color" ~ '^#[0-9A-Fa-f]{6}$' THEN "color"
  ELSE '#94A3B8'
END
WHERE "colorHex" IS NULL OR "colorHex" = '';