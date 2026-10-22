CREATE TABLE "SocialPublication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "draft" JSONB NOT NULL,
  "media" JSONB NOT NULL,
  "caption" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'reel',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "remoteId" TEXT,
  "lastError" TEXT,
  "claimedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialPublication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SocialPublication_userId_publicationId_platform_key" ON "SocialPublication"("userId", "publicationId", "platform");
CREATE INDEX "SocialPublication_status_scheduledAt_idx" ON "SocialPublication"("status", "scheduledAt");
CREATE INDEX "SocialPublication_userId_draftId_idx" ON "SocialPublication"("userId", "draftId");
ALTER TABLE "SocialPublication" ADD CONSTRAINT "SocialPublication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
