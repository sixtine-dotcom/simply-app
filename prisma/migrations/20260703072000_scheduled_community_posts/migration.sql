-- CreateTable
CREATE TABLE "ScheduledCommunityPost" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "pollQuestion" TEXT,
    "pollOptions" JSONB,
    "attachments" JSONB,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "publishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastError" TEXT,
    "publishedPostId" TEXT,
    "duplicateSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledCommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledCommunityPost_publishedPostId_key" ON "ScheduledCommunityPost"("publishedPostId");

-- CreateIndex
CREATE INDEX "ScheduledCommunityPost_courseId_idx" ON "ScheduledCommunityPost"("courseId");

-- CreateIndex
CREATE INDEX "ScheduledCommunityPost_spaceId_idx" ON "ScheduledCommunityPost"("spaceId");

-- CreateIndex
CREATE INDEX "ScheduledCommunityPost_authorId_idx" ON "ScheduledCommunityPost"("authorId");

-- CreateIndex
CREATE INDEX "ScheduledCommunityPost_scheduledAt_idx" ON "ScheduledCommunityPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledCommunityPost_status_idx" ON "ScheduledCommunityPost"("status");

-- CreateIndex
CREATE INDEX "ScheduledCommunityPost_duplicateSourceId_idx" ON "ScheduledCommunityPost"("duplicateSourceId");

-- AddForeignKey
ALTER TABLE "ScheduledCommunityPost" ADD CONSTRAINT "ScheduledCommunityPost_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledCommunityPost" ADD CONSTRAINT "ScheduledCommunityPost_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledCommunityPost" ADD CONSTRAINT "ScheduledCommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledCommunityPost" ADD CONSTRAINT "ScheduledCommunityPost_publishedPostId_fkey" FOREIGN KEY ("publishedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledCommunityPost" ADD CONSTRAINT "ScheduledCommunityPost_duplicateSourceId_fkey" FOREIGN KEY ("duplicateSourceId") REFERENCES "ScheduledCommunityPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
