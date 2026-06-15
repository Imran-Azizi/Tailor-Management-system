-- Superadmin-only backup metadata and schedule settings.
CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL,
    "backupId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "scopeName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "localSaveStatus" TEXT NOT NULL DEFAULT 'SUCCESS',
    "emailSentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "compressed" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdByName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackupSchedule" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "customCron" TEXT,
    "backupTime" TEXT NOT NULL DEFAULT '02:00',
    "retentionDays" INTEGER NOT NULL DEFAULT 35,
    "compressionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "encryptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deleteOldAfterDays" INTEGER NOT NULL DEFAULT 35,
    "totalStorageBytes" INTEGER NOT NULL DEFAULT 1073741824,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BackupRecord_backupId_key" ON "BackupRecord"("backupId");
CREATE INDEX "BackupRecord_backupId_idx" ON "BackupRecord"("backupId");
CREATE INDEX "BackupRecord_type_idx" ON "BackupRecord"("type");
CREATE INDEX "BackupRecord_scopeType_scopeId_idx" ON "BackupRecord"("scopeType", "scopeId");
CREATE INDEX "BackupRecord_status_idx" ON "BackupRecord"("status");
CREATE INDEX "BackupRecord_createdAt_idx" ON "BackupRecord"("createdAt");
