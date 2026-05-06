-- CreateTable
CREATE TABLE "OutfitDesign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutfitDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YakhanQaqNeck" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YakhanQaqNeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YakhanQaqSleeve" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YakhanQaqSleeve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YakhanQaqSkirt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YakhanQaqSkirt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YakhanQaqDesignOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YakhanQaqDesignOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YakhanQaqButtonShip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YakhanQaqButtonShip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YakhanQaqPantShip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YakhanQaqPantShip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutfitDesign_name_key" ON "OutfitDesign"("name");

-- CreateIndex
CREATE UNIQUE INDEX "YakhanQaqNeck_name_key" ON "YakhanQaqNeck"("name");

-- CreateIndex
CREATE UNIQUE INDEX "YakhanQaqSleeve_name_key" ON "YakhanQaqSleeve"("name");

-- CreateIndex
CREATE UNIQUE INDEX "YakhanQaqSkirt_name_key" ON "YakhanQaqSkirt"("name");

-- CreateIndex
CREATE UNIQUE INDEX "YakhanQaqDesignOption_name_key" ON "YakhanQaqDesignOption"("name");

-- CreateIndex
CREATE UNIQUE INDEX "YakhanQaqButtonShip_name_key" ON "YakhanQaqButtonShip"("name");

-- CreateIndex
CREATE UNIQUE INDEX "YakhanQaqPantShip_name_key" ON "YakhanQaqPantShip"("name");