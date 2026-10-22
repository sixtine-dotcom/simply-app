-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING_FOR_FOOTAGE',
    "steps" JSONB,
    "aspectRatio" TEXT,
    "errorMessage" TEXT,
    "feedbackRequestedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "workerSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "proxyUrl" TEXT,
    "posterUrl" TEXT,
    "durationSec" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "transcript" JSONB,
    "edl" JSONB,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'COMMENT',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION,
    "selectedText" TEXT,
    "body" TEXT NOT NULL,
    "markers" JSONB,
    "authorId" TEXT,
    "authorName" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoProject_slug_key" ON "VideoProject"("slug");

-- CreateIndex
CREATE INDEX "VideoProject_tenantId_idx" ON "VideoProject"("tenantId");

-- CreateIndex
CREATE INDEX "VideoProject_status_idx" ON "VideoProject"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoVersion_projectId_number_key" ON "VideoVersion"("projectId", "number");

-- CreateIndex
CREATE INDEX "VideoComment_projectId_status_idx" ON "VideoComment"("projectId", "status");

-- AddForeignKey
ALTER TABLE "VideoVersion" ADD CONSTRAINT "VideoVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VideoVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

