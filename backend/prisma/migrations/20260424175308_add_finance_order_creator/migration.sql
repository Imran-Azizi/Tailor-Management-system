-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "createdByFinanceId" TEXT;

-- CreateIndex
CREATE INDEX "Order_createdByFinanceId_idx" ON "Order"("createdByFinanceId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdByFinanceId_fkey" FOREIGN KEY ("createdByFinanceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
