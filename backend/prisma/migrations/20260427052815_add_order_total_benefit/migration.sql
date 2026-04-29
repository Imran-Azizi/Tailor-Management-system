-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "totalBenefit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill current orders so existing records get an initial benefit value.
UPDATE "Order"
SET "totalBenefit" =
	COALESCE("totalPrice", 0)
	- CASE
			WHEN COALESCE("qichikarPaymentAmount", 0) > 0 OR COALESCE("dokhtPaymentAmount", 0) > 0
				THEN COALESCE("qichikarPaymentAmount", 0) + COALESCE("dokhtPaymentAmount", 0)
			WHEN COALESCE("workerPaymentAmount", 0) > 0
				THEN COALESCE("workerPaymentAmount", 0)
			WHEN COALESCE("assignmentPrice", 0) > 0
				THEN COALESCE("assignmentPrice", 0)
			ELSE 0
		END;
