-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "orderId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_orderId_idx" ON "Transaction"("orderId");

-- AddForeignKey
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
