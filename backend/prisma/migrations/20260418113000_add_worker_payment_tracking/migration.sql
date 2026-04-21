-- CreateEnum
CREATE TYPE "WorkerPaymentStatus" AS ENUM ('UNPAID', 'PAID_TO_WORKER');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN     "workerPaidAt" TIMESTAMP(3),
ADD COLUMN     "workerPaidById" TEXT,
ADD COLUMN     "workerPaymentAmount" DOUBLE PRECISION,
ADD COLUMN     "workerPaymentStatus" "WorkerPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE INDEX "Order_workerPaymentStatus_idx" ON "Order"("workerPaymentStatus");

-- CreateIndex
CREATE INDEX "Order_workerPaidById_idx" ON "Order"("workerPaidById");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workerPaidById_fkey" FOREIGN KEY ("workerPaidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
