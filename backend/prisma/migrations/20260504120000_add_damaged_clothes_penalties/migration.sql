-- CreateTable
CREATE TABLE "DamagedClothesPenalty" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "roleType" "AccountType" NOT NULL,
    "reason" TEXT NOT NULL,
    "confirmedDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "billNumber" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "totalOrderAmount" DOUBLE PRECISION NOT NULL,
    "rakhtExpense" DOUBLE PRECISION NOT NULL,
    "dokhtExpense" DOUBLE PRECISION NOT NULL,
    "qichikarExpense" DOUBLE PRECISION NOT NULL,
    "dailyTaskExpense" DOUBLE PRECISION NOT NULL,
    "totalExpense" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DamagedClothesPenalty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DamagedClothesPenalty_transactionId_key" ON "DamagedClothesPenalty"("transactionId");

-- CreateIndex
CREATE INDEX "DamagedClothesPenalty_userId_idx" ON "DamagedClothesPenalty"("userId");

-- CreateIndex
CREATE INDEX "DamagedClothesPenalty_orderId_idx" ON "DamagedClothesPenalty"("orderId");

-- CreateIndex
CREATE INDEX "DamagedClothesPenalty_createdById_idx" ON "DamagedClothesPenalty"("createdById");

-- CreateIndex
CREATE INDEX "DamagedClothesPenalty_roleType_idx" ON "DamagedClothesPenalty"("roleType");

-- CreateIndex
CREATE INDEX "DamagedClothesPenalty_createdAt_idx" ON "DamagedClothesPenalty"("createdAt");

-- AddForeignKey
ALTER TABLE "DamagedClothesPenalty" ADD CONSTRAINT "DamagedClothesPenalty_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamagedClothesPenalty" ADD CONSTRAINT "DamagedClothesPenalty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamagedClothesPenalty" ADD CONSTRAINT "DamagedClothesPenalty_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamagedClothesPenalty" ADD CONSTRAINT "DamagedClothesPenalty_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
