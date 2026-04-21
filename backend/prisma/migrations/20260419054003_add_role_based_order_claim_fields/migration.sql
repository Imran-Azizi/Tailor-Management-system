-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "dokhtAssignedAt" TIMESTAMP(3),
ADD COLUMN     "dokhtAssignedToId" TEXT,
ADD COLUMN     "dokhtInProgress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dokhtReceivedAt" TIMESTAMP(3),
ADD COLUMN     "dokhtReceivedById" TEXT,
ADD COLUMN     "qichikarAssignedAt" TIMESTAMP(3),
ADD COLUMN     "qichikarAssignedToId" TEXT,
ADD COLUMN     "qichikarInProgress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qichikarReceivedAt" TIMESTAMP(3),
ADD COLUMN     "qichikarReceivedById" TEXT;

-- CreateIndex
CREATE INDEX "Order_qichikarAssignedToId_idx" ON "Order"("qichikarAssignedToId");

-- CreateIndex
CREATE INDEX "Order_dokhtAssignedToId_idx" ON "Order"("dokhtAssignedToId");

-- CreateIndex
CREATE INDEX "Order_qichikarReceivedById_idx" ON "Order"("qichikarReceivedById");

-- CreateIndex
CREATE INDEX "Order_dokhtReceivedById_idx" ON "Order"("dokhtReceivedById");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_qichikarAssignedToId_fkey" FOREIGN KEY ("qichikarAssignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_dokhtAssignedToId_fkey" FOREIGN KEY ("dokhtAssignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_qichikarReceivedById_fkey" FOREIGN KEY ("qichikarReceivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_dokhtReceivedById_fkey" FOREIGN KEY ("dokhtReceivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
