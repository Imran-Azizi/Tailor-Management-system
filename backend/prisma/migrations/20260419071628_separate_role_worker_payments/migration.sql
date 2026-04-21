-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "dokhtPaidAt" TIMESTAMP(3),
ADD COLUMN     "dokhtPaidById" TEXT,
ADD COLUMN     "dokhtPaymentAmount" DOUBLE PRECISION,
ADD COLUMN     "dokhtPaymentStatus" "WorkerPaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "qichikarPaidAt" TIMESTAMP(3),
ADD COLUMN     "qichikarPaidById" TEXT,
ADD COLUMN     "qichikarPaymentAmount" DOUBLE PRECISION,
ADD COLUMN     "qichikarPaymentStatus" "WorkerPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE INDEX "Order_qichikarPaymentStatus_idx" ON "Order"("qichikarPaymentStatus");

-- CreateIndex
CREATE INDEX "Order_qichikarPaidById_idx" ON "Order"("qichikarPaidById");

-- CreateIndex
CREATE INDEX "Order_dokhtPaymentStatus_idx" ON "Order"("dokhtPaymentStatus");

-- CreateIndex
CREATE INDEX "Order_dokhtPaidById_idx" ON "Order"("dokhtPaidById");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_qichikarPaidById_fkey" FOREIGN KEY ("qichikarPaidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_dokhtPaidById_fkey" FOREIGN KEY ("dokhtPaidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
