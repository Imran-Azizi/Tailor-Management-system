-- Per-tenant user creation limits with optional super-admin extensions.
ALTER TABLE "Tenant" ADD COLUMN "extraUserLimit" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "TenantUserLimitHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "previousExtraLimit" INTEGER NOT NULL,
    "newExtraLimit" INTEGER NOT NULL,
    "defaultLimit" INTEGER NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantUserLimitHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantUserLimitHistory_tenantId_createdAt_idx" ON "TenantUserLimitHistory"("tenantId", "createdAt");

ALTER TABLE "TenantUserLimitHistory" ADD CONSTRAINT "TenantUserLimitHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantUserLimitHistory" ADD CONSTRAINT "TenantUserLimitHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
