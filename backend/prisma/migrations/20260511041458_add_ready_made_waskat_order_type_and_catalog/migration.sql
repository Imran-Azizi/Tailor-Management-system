-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'READY_MADE_WASKAT';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "readyMadeWaskatClothingCode" TEXT,
ADD COLUMN     "readyMadeWaskatClothingId" TEXT,
ADD COLUMN     "readyMadeWaskatOriginalPrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ReadyMadeWaskatClothing" (
    "id" TEXT NOT NULL,
    "waskatCode" TEXT NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadyMadeWaskatClothing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadyMadeWaskatOrder" (
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

    CONSTRAINT "ReadyMadeWaskatOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadyMadeWaskatClothing_waskatCode_key" ON "ReadyMadeWaskatClothing"("waskatCode");

-- CreateIndex
CREATE INDEX "ReadyMadeWaskatClothing_waskatCode_idx" ON "ReadyMadeWaskatClothing"("waskatCode");

-- CreateIndex
CREATE UNIQUE INDEX "ReadyMadeWaskatOrder_orderId_key" ON "ReadyMadeWaskatOrder"("orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_readyMadeWaskatClothingId_fkey" FOREIGN KEY ("readyMadeWaskatClothingId") REFERENCES "ReadyMadeWaskatClothing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyMadeWaskatOrder" ADD CONSTRAINT "ReadyMadeWaskatOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
