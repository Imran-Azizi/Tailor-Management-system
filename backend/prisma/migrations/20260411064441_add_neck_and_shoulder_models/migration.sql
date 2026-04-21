-- CreateTable
CREATE TABLE "NeckOutfit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeckOutfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeckWaskat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeckWaskat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NeckOutfit_name_key" ON "NeckOutfit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NeckWaskat_name_key" ON "NeckWaskat"("name");
