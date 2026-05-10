-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'READY_MADE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "readyMadeClothingCode" TEXT,
ADD COLUMN     "readyMadeClothingId" TEXT,
ADD COLUMN     "readyMadeOriginalPrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ReadyMadeClothing" (
    "id" TEXT NOT NULL,
    "clothingCode" TEXT NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadyMadeClothing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadyMadeOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "height" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "shoulder" DOUBLE PRECISION,
    "sleeve" DOUBLE PRECISION,
    "neck" DOUBLE PRECISION,
    "armpit" DOUBLE PRECISION,
    "skirt" DOUBLE PRECISION,
    "tenban" DOUBLE PRECISION,
    "pantLeg" DOUBLE PRECISION,
    "arm" DOUBLE PRECISION,
    "calf" DOUBLE PRECISION,
    "sorain" DOUBLE PRECISION,
    "additionalNotes" TEXT,

    CONSTRAINT "ReadyMadeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadyMadeClothing_clothingCode_key" ON "ReadyMadeClothing"("clothingCode");

-- CreateIndex
CREATE INDEX "ReadyMadeClothing_clothingCode_idx" ON "ReadyMadeClothing"("clothingCode");

-- CreateIndex
CREATE UNIQUE INDEX "ReadyMadeOrder_orderId_key" ON "ReadyMadeOrder"("orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_readyMadeClothingId_fkey" FOREIGN KEY ("readyMadeClothingId") REFERENCES "ReadyMadeClothing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyMadeOrder" ADD CONSTRAINT "ReadyMadeOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
