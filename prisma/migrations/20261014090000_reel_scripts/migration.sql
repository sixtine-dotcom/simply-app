
-- CreateTable
CREATE TABLE "ReelScript" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "headline" TEXT NOT NULL,
    "topic" TEXT,
    "hook" TEXT NOT NULL,
    "credibility" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "hookFormat" TEXT,
    "storyNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "recordedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "weekStart" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReelScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "briefing" TEXT,
    "idealClient" TEXT,
    "myStory" TEXT,
    "hooks" TEXT,
    "hooksUpdatedAt" TIMESTAMP(3),
    "perWeek" INTEGER NOT NULL DEFAULT 7,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "generateRequestedAt" TIMESTAMP(3),
    "hooksRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReelScript_tenantId_weekStart_idx" ON "ReelScript"("tenantId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptSettings_tenantId_key" ON "ScriptSettings"("tenantId");

