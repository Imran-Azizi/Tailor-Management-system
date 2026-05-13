CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_customerId_type_createdAt_idx" ON "Order"("customerId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_entryYear_entryMonth_idx" ON "Order"("entryYear", "entryMonth");
CREATE INDEX IF NOT EXISTS "Order_createdByFinanceId_entryYear_entryMonth_idx" ON "Order"("createdByFinanceId", "entryYear", "entryMonth");
CREATE INDEX IF NOT EXISTS "Order_isCompleted_createdAt_idx" ON "Order"("isCompleted", "createdAt");

CREATE INDEX IF NOT EXISTS "UserNotification_userId_isRead_createdAt_idx" ON "UserNotification"("userId", "isRead", "createdAt");

CREATE INDEX IF NOT EXISTS "Rakht_date_idx" ON "Rakht"("date");

CREATE INDEX IF NOT EXISTS "Notification_nextAlert_idx" ON "Notification"("nextAlert");
CREATE INDEX IF NOT EXISTS "Notification_expiresAt_idx" ON "Notification"("expiresAt");

CREATE INDEX IF NOT EXISTS "Box_boxType_idx" ON "Box"("boxType");

CREATE INDEX IF NOT EXISTS "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");
CREATE INDEX IF NOT EXISTS "Transaction_source_kind_transactionDate_idx" ON "Transaction"("source", "kind", "transactionDate");
CREATE INDEX IF NOT EXISTS "Transaction_createdById_transactionDate_idx" ON "Transaction"("createdById", "transactionDate");
