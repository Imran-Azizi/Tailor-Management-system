-- SaaS roles and subscription enums
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlan') THEN
    CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'MONTHLY', 'YEARLY', 'CUSTOM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED');
  END IF;
END $$;

-- Core tenant tables
CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "systemName" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "mobile" TEXT,
  "email" TEXT,
  "logoUrl" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'AFN',
  "language" TEXT NOT NULL DEFAULT 'fa',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kabul',
  "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
  "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "subscriptionStart" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_tenantId_key" ON "Tenant"("tenantId");
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
CREATE INDEX "Tenant_subscriptionStatus_idx" ON "Tenant"("subscriptionStatus");
CREATE INDEX "Tenant_expiryDate_idx" ON "Tenant"("expiryDate");
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");

INSERT INTO "Tenant" (
  "id", "tenantId", "slug", "businessName", "systemName",
  "subscriptionPlan", "subscriptionStatus", "isActive"
) VALUES (
  'default-tenant', 'default-tenant', 'default',
  'Default Tailor Shop', 'Tailoring Management System',
  'TRIAL', 'ACTIVE', true
) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- Tenant references on existing business tables
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
UPDATE "User" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "User_tenantId_accountType_idx" ON "User"("tenantId", "accountType");

ALTER TABLE "UserNotification" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "Customer" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "WorkerPaymentReceipt" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "OrderDraft" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "Rakht" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "RakhtPaymentHistory" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "RakhtTon" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "ReadyMadeClothing" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "ReadyMadeWaskatClothing" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "Notification" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "Box" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "Contributor" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "DailyTask" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "Transaction" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "DamagedClothesPenalty" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "Item" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE "ItemSale" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';

-- Indexes for tenant-isolated search/reporting
CREATE INDEX "UserNotification_tenantId_idx" ON "UserNotification"("tenantId");
CREATE INDEX "UserNotification_tenantId_userId_isRead_createdAt_idx" ON "UserNotification"("tenantId", "userId", "isRead", "createdAt");
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX "Customer_tenantId_phoneNumber_idx" ON "Customer"("tenantId", "phoneNumber");
CREATE INDEX "Customer_tenantId_billNumber_idx" ON "Customer"("tenantId", "billNumber");
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");
CREATE INDEX "Order_tenantId_customerId_idx" ON "Order"("tenantId", "customerId");
CREATE INDEX "Order_tenantId_isCompleted_createdAt_idx" ON "Order"("tenantId", "isCompleted", "createdAt");
CREATE INDEX "Order_tenantId_entryYear_entryMonth_idx" ON "Order"("tenantId", "entryYear", "entryMonth");
CREATE INDEX "WorkerPaymentReceipt_tenantId_idx" ON "WorkerPaymentReceipt"("tenantId");
CREATE INDEX "WorkerPaymentReceipt_tenantId_receiptDate_idx" ON "WorkerPaymentReceipt"("tenantId", "receiptDate");
CREATE INDEX "OrderDraft_tenantId_idx" ON "OrderDraft"("tenantId");
CREATE INDEX "OrderDraft_tenantId_userId_status_idx" ON "OrderDraft"("tenantId", "userId", "status");
CREATE INDEX "Rakht_tenantId_idx" ON "Rakht"("tenantId");
CREATE INDEX "Rakht_tenantId_companyName_idx" ON "Rakht"("tenantId", "companyName");
CREATE INDEX "RakhtPaymentHistory_tenantId_idx" ON "RakhtPaymentHistory"("tenantId");
CREATE INDEX "RakhtPaymentHistory_tenantId_companyName_idx" ON "RakhtPaymentHistory"("tenantId", "companyName");
CREATE INDEX "RakhtTon_tenantId_idx" ON "RakhtTon"("tenantId");
CREATE INDEX "RakhtTon_tenantId_rakhtId_idx" ON "RakhtTon"("tenantId", "rakhtId");
CREATE INDEX "ReadyMadeClothing_tenantId_idx" ON "ReadyMadeClothing"("tenantId");
CREATE INDEX "ReadyMadeClothing_tenantId_clothingCode_idx" ON "ReadyMadeClothing"("tenantId", "clothingCode");
CREATE INDEX "ReadyMadeWaskatClothing_tenantId_idx" ON "ReadyMadeWaskatClothing"("tenantId");
CREATE INDEX "ReadyMadeWaskatClothing_tenantId_waskatCode_idx" ON "ReadyMadeWaskatClothing"("tenantId", "waskatCode");
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX "Notification_tenantId_isRead_idx" ON "Notification"("tenantId", "isRead");
CREATE INDEX "Box_tenantId_idx" ON "Box"("tenantId");
CREATE INDEX "Box_tenantId_boxType_idx" ON "Box"("tenantId", "boxType");
CREATE INDEX "Contributor_tenantId_idx" ON "Contributor"("tenantId");
CREATE INDEX "Contributor_tenantId_name_idx" ON "Contributor"("tenantId", "name");
CREATE INDEX "DailyTask_tenantId_idx" ON "DailyTask"("tenantId");
CREATE INDEX "DailyTask_tenantId_taskDate_idx" ON "DailyTask"("tenantId", "taskDate");
CREATE INDEX "Transaction_tenantId_idx" ON "Transaction"("tenantId");
CREATE INDEX "Transaction_tenantId_transactionDate_idx" ON "Transaction"("tenantId", "transactionDate");
CREATE INDEX "DamagedClothesPenalty_tenantId_idx" ON "DamagedClothesPenalty"("tenantId");
CREATE INDEX "DamagedClothesPenalty_tenantId_createdAt_idx" ON "DamagedClothesPenalty"("tenantId", "createdAt");
CREATE INDEX "Item_tenantId_idx" ON "Item"("tenantId");
CREATE INDEX "Item_tenantId_type_idx" ON "Item"("tenantId", "type");
CREATE INDEX "ItemSale_tenantId_idx" ON "ItemSale"("tenantId");
CREATE INDEX "ItemSale_tenantId_createdAt_idx" ON "ItemSale"("tenantId", "createdAt");

-- Foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkerPaymentReceipt" ADD CONSTRAINT "WorkerPaymentReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderDraft" ADD CONSTRAINT "OrderDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rakht" ADD CONSTRAINT "Rakht_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RakhtPaymentHistory" ADD CONSTRAINT "RakhtPaymentHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RakhtTon" ADD CONSTRAINT "RakhtTon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadyMadeClothing" ADD CONSTRAINT "ReadyMadeClothing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadyMadeWaskatClothing" ADD CONSTRAINT "ReadyMadeWaskatClothing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Box" ADD CONSTRAINT "Box_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contributor" ADD CONSTRAINT "Contributor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DamagedClothesPenalty" ADD CONSTRAINT "DamagedClothesPenalty_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemSale" ADD CONSTRAINT "ItemSale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
