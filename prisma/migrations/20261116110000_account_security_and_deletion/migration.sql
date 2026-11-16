CREATE TABLE "AuthRateLimit" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "resetAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AuthRateLimit_resetAt_idx" ON "AuthRateLimit"("resetAt");
CREATE TABLE "AccountDeletionRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "tenantId" TEXT,
  "email" TEXT,
  "emailDigest" TEXT NOT NULL,
  "shopifyOrderIds" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AccountDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccountDeletionRequest_userId_key" ON "AccountDeletionRequest"("userId");
CREATE INDEX "AccountDeletionRequest_tenantId_status_idx" ON "AccountDeletionRequest"("tenantId", "status");
CREATE INDEX "AccountDeletionRequest_emailDigest_idx" ON "AccountDeletionRequest"("emailDigest");
