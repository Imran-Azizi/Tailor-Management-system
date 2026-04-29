-- AlterTable
ALTER TABLE "DailyTask" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE INDEX "DailyTask_orderId_idx" ON "DailyTask"("orderId");

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
