-- CreateTable
CREATE TABLE "RakhtPaymentHistory" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL,
    "totalPriceBefore" DOUBLE PRECISION NOT NULL,
    "totalPaidBefore" DOUBLE PRECISION NOT NULL,
    "remainingBefore" DOUBLE PRECISION NOT NULL,
    "totalPriceAfter" DOUBLE PRECISION NOT NULL,
    "totalPaidAfter" DOUBLE PRECISION NOT NULL,
    "remainingAfter" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RakhtPaymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RakhtPaymentHistory_companyName_idx" ON "RakhtPaymentHistory"("companyName");

-- CreateIndex
CREATE INDEX "RakhtPaymentHistory_paidAt_idx" ON "RakhtPaymentHistory"("paidAt");

-- CreateIndex
CREATE INDEX "RakhtPaymentHistory_paidById_idx" ON "RakhtPaymentHistory"("paidById");

-- AddForeignKey
ALTER TABLE "RakhtPaymentHistory" ADD CONSTRAINT "RakhtPaymentHistory_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
