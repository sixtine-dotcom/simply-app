CREATE TABLE "AiEscalation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "question" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiEscalation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiEscalation_tenantId_status_idx" ON "AiEscalation"("tenantId", "status");
CREATE INDEX "AiEscalation_userId_idx" ON "AiEscalation"("userId");
CREATE INDEX "AiEscalation_createdAt_idx" ON "AiEscalation"("createdAt");

ALTER TABLE "AiEscalation" ADD CONSTRAINT "AiEscalation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiEscalation" ADD CONSTRAINT "AiEscalation_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
