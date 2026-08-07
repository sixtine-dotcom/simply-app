CREATE TABLE "NutritionPlanTemplate" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "biologicalSex" "BiologicalSex" NOT NULL,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NutritionPlanTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "NutritionPlan"
ADD COLUMN "courseId" TEXT,
ADD COLUMN "templateId" TEXT,
ADD COLUMN "displayFileName" TEXT,
ADD COLUMN "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "NutritionPlanTemplate_courseId_biologicalSex_key" ON "NutritionPlanTemplate"("courseId", "biologicalSex");
CREATE INDEX "NutritionPlanTemplate_courseId_idx" ON "NutritionPlanTemplate"("courseId");
CREATE UNIQUE INDEX "NutritionPlan_userId_courseId_key" ON "NutritionPlan"("userId", "courseId");
CREATE INDEX "NutritionPlan_courseId_idx" ON "NutritionPlan"("courseId");
CREATE INDEX "NutritionPlan_availableAt_idx" ON "NutritionPlan"("availableAt");

ALTER TABLE "NutritionPlanTemplate" ADD CONSTRAINT "NutritionPlanTemplate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NutritionPlanTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
