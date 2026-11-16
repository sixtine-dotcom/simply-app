CREATE TABLE "CarouselBrandPhoto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CarouselBrandPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CarouselBrandPhoto_tenantId_createdAt_idx" ON "CarouselBrandPhoto"("tenantId", "createdAt");
