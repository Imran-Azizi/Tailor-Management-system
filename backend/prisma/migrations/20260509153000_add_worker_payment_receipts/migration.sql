-- CreateEnum
CREATE TYPE "WorkerRoleType" AS ENUM ('QICHIKAR', 'DOKHT', 'WORKER');

-- CreateTable
CREATE TABLE "WorkerPaymentReceipt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerRole" "WorkerRoleType" NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedByAdminId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerPaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerPaymentReceipt_orderId_workerRole_key" ON "WorkerPaymentReceipt"("orderId", "workerRole");

-- CreateIndex
CREATE INDEX "WorkerPaymentReceipt_orderId_idx" ON "WorkerPaymentReceipt"("orderId");

-- CreateIndex
CREATE INDEX "WorkerPaymentReceipt_workerId_idx" ON "WorkerPaymentReceipt"("workerId");

-- CreateIndex
CREATE INDEX "WorkerPaymentReceipt_workerRole_idx" ON "WorkerPaymentReceipt"("workerRole");

-- CreateIndex
CREATE INDEX "WorkerPaymentReceipt_receiptDate_idx" ON "WorkerPaymentReceipt"("receiptDate");

-- CreateIndex
CREATE INDEX "WorkerPaymentReceipt_receivedByAdminId_idx" ON "WorkerPaymentReceipt"("receivedByAdminId");

-- AddForeignKey
ALTER TABLE "WorkerPaymentReceipt" ADD CONSTRAINT "WorkerPaymentReceipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerPaymentReceipt" ADD CONSTRAINT "WorkerPaymentReceipt_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerPaymentReceipt" ADD CONSTRAINT "WorkerPaymentReceipt_receivedByAdminId_fkey" FOREIGN KEY ("receivedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
