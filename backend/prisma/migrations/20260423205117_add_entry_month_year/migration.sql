-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "entryMonth" INTEGER,
ADD COLUMN     "entryYear" INTEGER;

-- CreateIndex
CREATE INDEX "Order_entryMonth_idx" ON "Order"("entryMonth");

-- CreateIndex
CREATE INDEX "Order_entryYear_idx" ON "Order"("entryYear");
