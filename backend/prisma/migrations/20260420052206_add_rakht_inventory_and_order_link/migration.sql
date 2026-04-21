-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "rakhtBrandName" TEXT,
ADD COLUMN     "rakhtColor" TEXT,
ADD COLUMN     "rakhtCompanyName" TEXT,
ADD COLUMN     "rakhtId" TEXT,
ADD COLUMN     "rakhtPiecePrice" DOUBLE PRECISION,
ADD COLUMN     "rakhtRequiredMeters" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Rakht" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "metersPerTon" DOUBLE PRECISION NOT NULL,
    "totalTons" DOUBLE PRECISION NOT NULL,
    "totalMeters" DOUBLE PRECISION NOT NULL,
    "usedMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rakht_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rakht_companyName_idx" ON "Rakht"("companyName");

-- CreateIndex
CREATE INDEX "Rakht_brandName_idx" ON "Rakht"("brandName");

-- CreateIndex
CREATE INDEX "Rakht_color_idx" ON "Rakht"("color");

-- CreateIndex
CREATE INDEX "Order_rakhtId_idx" ON "Order"("rakhtId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_rakhtId_fkey" FOREIGN KEY ("rakhtId") REFERENCES "Rakht"("id") ON DELETE SET NULL ON UPDATE CASCADE;
