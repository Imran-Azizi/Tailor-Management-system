-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT');

-- CreateTable
CREATE TABLE "OrderDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "customerName" TEXT,
    "orderTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "step" INTEGER NOT NULL DEFAULT 0,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "draftData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderDraft_userId_clientKey_key" ON "OrderDraft"("userId", "clientKey");

-- CreateIndex
CREATE INDEX "OrderDraft_userId_status_idx" ON "OrderDraft"("userId", "status");

-- CreateIndex
CREATE INDEX "OrderDraft_updatedAt_idx" ON "OrderDraft"("updatedAt");

-- AddForeignKey
ALTER TABLE "OrderDraft" ADD CONSTRAINT "OrderDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
