/*
  Warnings:

  - Changed the type of `boxType` on the `Box` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BoxType" AS ENUM ('OUTFIT', 'WASKAT', 'KORTY', 'YAKHANQAQ', 'FOREIGN_COUNTRY');

-- AlterTable
ALTER TABLE "Box" 
ALTER COLUMN "boxType" TYPE "BoxType" USING "boxType"::text::"BoxType";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "foreignBoxId" INTEGER,
ADD COLUMN     "isForeignOrder" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Order_isForeignOrder_idx" ON "Order"("isForeignOrder");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_foreignBoxId_fkey" FOREIGN KEY ("foreignBoxId") REFERENCES "Box"("id") ON DELETE SET NULL ON UPDATE CASCADE;
