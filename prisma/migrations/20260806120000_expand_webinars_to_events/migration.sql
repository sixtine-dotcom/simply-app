ALTER TABLE "Webinar"
ADD COLUMN "eventType" TEXT NOT NULL DEFAULT 'online',
ADD COLUMN "location" TEXT,
ADD COLUMN "onlineUrl" TEXT,
ADD COLUMN "capacity" INTEGER,
ADD COLUMN "registrationOpen" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "WebinarRegistration"
ADD COLUMN "phone" TEXT;
