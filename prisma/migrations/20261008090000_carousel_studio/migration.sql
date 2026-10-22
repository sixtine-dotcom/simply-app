
-- CreateTable
CREATE TABLE "Carousel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "slides" JSONB NOT NULL,
    "caption" TEXT,
    "photoUrl" TEXT,
    "photoQuery" TEXT,
    "imageUrls" JSONB,
    "renderedAt" TIMESTAMP(3),
    "renderRequestedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "errorMessage" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishStatus" TEXT,
    "publishContainerId" TEXT,
    "publishError" TEXT,
    "publishedAt" TIMESTAMP(3),
    "instagramMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carousel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarouselSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "briefing" TEXT,
    "topics" TEXT,
    "theme" JSONB,
    "perWeek" INTEGER NOT NULL DEFAULT 7,
    "postTime" TEXT NOT NULL DEFAULT '07:00',
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarouselSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Carousel_tenantId_scheduledAt_idx" ON "Carousel"("tenantId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "CarouselSettings_tenantId_key" ON "CarouselSettings"("tenantId");

