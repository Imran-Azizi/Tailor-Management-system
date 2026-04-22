-- AlterTable (conditional: only if colorHex column already exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Rakht' AND column_name = 'colorHex'
  ) THEN
    ALTER TABLE "Rakht" ALTER COLUMN "colorHex" DROP DEFAULT;
  END IF;
END $$;
