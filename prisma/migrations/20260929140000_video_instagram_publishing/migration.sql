ALTER TABLE "VideoProject" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "captionGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "captionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "instagramMediaId" TEXT,
ADD COLUMN     "publishContainerId" TEXT,
ADD COLUMN     "publishError" TEXT,
ADD COLUMN     "publishStatus" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VideoStudioSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "captionExamples" TEXT,
    "captionGuidelines" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoStudioSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoStudioSettings_tenantId_key" ON "VideoStudioSettings"("tenantId");

