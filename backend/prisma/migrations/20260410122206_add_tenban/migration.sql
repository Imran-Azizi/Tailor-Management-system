-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('OUTFIT', 'WASKAT', 'KORTY', 'YAKHANQAQ');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "billNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderName" TEXT,
    "type" "OrderType" NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL,
    "remaining" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "emergencyExpiry" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "boxId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "shoulder" DOUBLE PRECISION NOT NULL,
    "sleeve" DOUBLE PRECISION NOT NULL,
    "neck" DOUBLE PRECISION NOT NULL,
    "chest" DOUBLE PRECISION NOT NULL,
    "armpit" DOUBLE PRECISION NOT NULL,
    "waist" DOUBLE PRECISION NOT NULL,
    "skirt" DOUBLE PRECISION NOT NULL,
    "tenban" DOUBLE PRECISION NOT NULL,
    "pantLeg" DOUBLE PRECISION NOT NULL,
    "arm" DOUBLE PRECISION NOT NULL,
    "calf" DOUBLE PRECISION NOT NULL,
    "neckStyle" TEXT,
    "sleeveStyle" TEXT,
    "sleeveSize" TEXT,
    "skirtStyle" TEXT,
    "frontPocket" BOOLEAN NOT NULL DEFAULT false,
    "sidePocket" BOOLEAN NOT NULL DEFAULT false,
    "underPocket" BOOLEAN NOT NULL DEFAULT false,
    "outfitDesign" TEXT,
    "outfitStyle" TEXT,
    "buttonStyle" TEXT,
    "pantStyle" TEXT,
    "additionalStyleInfo" TEXT,

    CONSTRAINT "Outfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waskat" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "shoulder" DOUBLE PRECISION NOT NULL,
    "neck" DOUBLE PRECISION NOT NULL,
    "chest" DOUBLE PRECISION NOT NULL,
    "waist" DOUBLE PRECISION NOT NULL,
    "sorain" DOUBLE PRECISION NOT NULL,
    "neckStyle" TEXT,
    "shoulderState" TEXT,
    "waskatStyle" TEXT,

    CONSTRAINT "Waskat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Korty" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "arm" DOUBLE PRECISION NOT NULL,
    "shoulder" DOUBLE PRECISION NOT NULL,
    "neck" DOUBLE PRECISION NOT NULL,
    "sleeve" DOUBLE PRECISION NOT NULL,
    "patlonHeight" DOUBLE PRECISION NOT NULL,
    "kamerPatlon" DOUBLE PRECISION NOT NULL,
    "doroBaghlePatlon" DOUBLE PRECISION NOT NULL,
    "waist" DOUBLE PRECISION NOT NULL,
    "sorainPatlon" DOUBLE PRECISION NOT NULL,
    "sorain" DOUBLE PRECISION NOT NULL,
    "patPatlon" DOUBLE PRECISION NOT NULL,
    "pachaPatlon" DOUBLE PRECISION NOT NULL,
    "style" TEXT,

    CONSTRAINT "Korty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YakhanQaq" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "sleeve" DOUBLE PRECISION NOT NULL,
    "shoulder" DOUBLE PRECISION NOT NULL,
    "neck" DOUBLE PRECISION NOT NULL,
    "armpit" DOUBLE PRECISION NOT NULL,
    "sorain" DOUBLE PRECISION NOT NULL,
    "chest" DOUBLE PRECISION NOT NULL,
    "neckStyle" TEXT,
    "sleeveStyle" TEXT,
    "sleeveSize" TEXT,
    "skirtStyle" TEXT,
    "frontPocket" BOOLEAN NOT NULL DEFAULT false,
    "yakhanQaqDesign" TEXT,
    "buttonStyle" TEXT,
    "pantStyle" TEXT,

    CONSTRAINT "YakhanQaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "nextAlert" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Box" (
    "id" SERIAL NOT NULL,
    "boxName" TEXT NOT NULL,
    "boxType" "OrderType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Yakhan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Yakhan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Astin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Astin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Daman" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Daman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JibRow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JibRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JibBaghle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JibBaghle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JibTenban" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JibTenban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatyShip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatyShip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ButtonShip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ButtonShip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenbanShip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenbanShip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phoneNumber_key" ON "Customer"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_billNumber_key" ON "Customer"("billNumber");

-- CreateIndex
CREATE INDEX "Customer_phoneNumber_idx" ON "Customer"("phoneNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_type_idx" ON "Order"("type");

-- CreateIndex
CREATE INDEX "Order_isCompleted_idx" ON "Order"("isCompleted");

-- CreateIndex
CREATE INDEX "Order_isEmergency_idx" ON "Order"("isEmergency");

-- CreateIndex
CREATE UNIQUE INDEX "Outfit_orderId_key" ON "Outfit"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Waskat_orderId_key" ON "Waskat"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Korty_orderId_key" ON "Korty"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "YakhanQaq_orderId_key" ON "YakhanQaq"("orderId");

-- CreateIndex
CREATE INDEX "Notification_orderId_idx" ON "Notification"("orderId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "Yakhan_name_key" ON "Yakhan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Astin_name_key" ON "Astin"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Daman_name_key" ON "Daman"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JibRow_name_key" ON "JibRow"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JibBaghle_name_key" ON "JibBaghle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JibTenban_name_key" ON "JibTenban"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PatyShip_name_key" ON "PatyShip"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ButtonShip_name_key" ON "ButtonShip"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TenbanShip_name_key" ON "TenbanShip"("name");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outfit" ADD CONSTRAINT "Outfit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Waskat" ADD CONSTRAINT "Waskat_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Korty" ADD CONSTRAINT "Korty_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YakhanQaq" ADD CONSTRAINT "YakhanQaq_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
