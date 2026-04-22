/*
  Warnings:

  - You are about to drop the column `color` on the `Rakht` table. All the data in the column will be lost.
  - You are about to drop the column `colorHex` on the `Rakht` table. All the data in the column will be lost.
  - You are about to drop the column `metersPerTon` on the `Rakht` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Rakht` table. All the data in the column will be lost.
  - You are about to drop the column `totalMeters` on the `Rakht` table. All the data in the column will be lost.
  - You are about to drop the column `totalTons` on the `Rakht` table. All the data in the column will be lost.
  - You are about to drop the column `usedMeters` on the `Rakht` table. All the data in the column will be lost.
  - Added the required column `tonQuantity` to the `Rakht` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `Rakht` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Rakht_color_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "rakhtTonId" TEXT;

-- AlterTable
ALTER TABLE "Rakht" DROP COLUMN "color",
DROP COLUMN "colorHex",
DROP COLUMN "metersPerTon",
DROP COLUMN "price",
DROP COLUMN "totalMeters",
DROP COLUMN "totalTons",
DROP COLUMN "usedMeters",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "givenMoney" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "remainingMoney" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tonQuantity" INTEGER NOT NULL,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "RakhtTon" (
    "id" TEXT NOT NULL,
    "rakhtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "totalMeters" DOUBLE PRECISION NOT NULL,
    "usedMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RakhtTon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RakhtTon_rakhtId_idx" ON "RakhtTon"("rakhtId");

-- CreateIndex
CREATE INDEX "Order_rakhtTonId_idx" ON "Order"("rakhtTonId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_rakhtTonId_fkey" FOREIGN KEY ("rakhtTonId") REFERENCES "RakhtTon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RakhtTon" ADD CONSTRAINT "RakhtTon_rakhtId_fkey" FOREIGN KEY ("rakhtId") REFERENCES "Rakht"("id") ON DELETE CASCADE ON UPDATE CASCADE;
