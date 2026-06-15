CREATE INDEX IF NOT EXISTS "UserNotification_createdAt_idx"
  ON "UserNotification"("createdAt");

CREATE INDEX IF NOT EXISTS "UserNotification_tenantId_createdAt_idx"
  ON "UserNotification"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "UserNotification_userId_createdAt_idx"
  ON "UserNotification"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "UserNotification_tenantId_userId_createdAt_idx"
  ON "UserNotification"("tenantId", "userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx"
  ON "Notification"("createdAt");

CREATE INDEX IF NOT EXISTS "Notification_tenantId_createdAt_idx"
  ON "Notification"("tenantId", "createdAt");
