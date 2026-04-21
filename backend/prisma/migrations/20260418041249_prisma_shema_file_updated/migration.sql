-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('LOAN', 'NOT_LOAN');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assignmentPrice" DOUBLE PRECISION,
ADD COLUMN     "dokhtCompletedAt" TIMESTAMP(3),
ADD COLUMN     "inProgress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qichikarCompletedAt" TIMESTAMP(3),
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "receivedById" TEXT;

-- AlterTable
ALTER TABLE "Outfit" ADD COLUMN     "sleeveSize" TEXT;

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "TransactionKind" NOT NULL DEFAULT 'NOT_LOAN',
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_accountType_idx" ON "Transaction"("accountType");

-- CreateIndex
CREATE INDEX "Transaction_kind_idx" ON "Transaction"("kind");

-- CreateIndex
CREATE INDEX "Transaction_createdById_idx" ON "Transaction"("createdById");

-- CreateIndex
CREATE INDEX "Order_receivedById_idx" ON "Order"("receivedById");

-- CreateIndex
CREATE INDEX "Order_qichikarCompletedAt_idx" ON "Order"("qichikarCompletedAt");

-- CreateIndex
CREATE INDEX "Order_dokhtCompletedAt_idx" ON "Order"("dokhtCompletedAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
