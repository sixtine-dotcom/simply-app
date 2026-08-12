ALTER TABLE "User"
ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "marketingSource" TEXT,
ADD COLUMN "marketingConsentAt" TIMESTAMP(3);

CREATE INDEX "User_tenantId_marketingConsent_idx" ON "User"("tenantId", "marketingConsent");
