ALTER TABLE "Course"
ADD COLUMN "trajectoryStartDate" TIMESTAMP(3),
ADD COLUMN "trajectoryEndDate" TIMESTAMP(3);

ALTER TABLE "Enrollment"
ADD COLUMN "shopifyOrderName" TEXT,
ADD COLUMN "revenueCents" INTEGER,
ADD COLUMN "revenueCurrency" TEXT;
