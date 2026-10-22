-- CreateTable
CREATE TABLE "VideoAudio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAudio_tenantId_idx" ON "VideoAudio"("tenantId");

