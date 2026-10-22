-- CreateTable
CREATE TABLE "VideoAnimation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "previewUrl" TEXT,
    "source" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAnimation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAnimation_tenantId_idx" ON "VideoAnimation"("tenantId");

