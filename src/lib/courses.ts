import { db } from "./db";

export interface LessonWithStatus {
  id: string;
  title: string;
  position: number;
  videoUrl: string | null;
  videoProvider: string | null;
  isCompleted: boolean;
  isLocked: boolean;
  unlocksAt: Date | null;
}

export interface ModuleWithLessons {
  id: string;
  title: string;
  description: string | null;
  position: number;
  isLocked: boolean;
  unlocksAt: Date | null;
  lessons: LessonWithStatus[];
  completedCount: number;
  totalCount: number;
}

export interface CourseWithProgress {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPrivate: boolean;
  hasCommunity: boolean;
  modules: ModuleWithLessons[];
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  enrollment: {
    startDate: Date;
    endDate: Date | null;
    daysRemaining: number | null;
  };
}

/**
 * Calculate when content unlocks based on enrollment start date and dripping settings
 */
function calculateUnlockDate(
  enrollmentStartDate: Date,
  unlockAfterDays: number | null,
  drippingUnit: string | null
): Date | null {
  if (unlockAfterDays === null || unlockAfterDays === 0) {
    return null; // Immediately available
  }

  const unlockDate = new Date(enrollmentStartDate);
  
  if (drippingUnit === "weeks") {
    unlockDate.setDate(unlockDate.getDate() + unlockAfterDays * 7);
  } else {
    unlockDate.setDate(unlockDate.getDate() + unlockAfterDays);
  }

  return unlockDate;
}

/**
 * Check if content is locked based on unlock date
 */
function isContentLocked(unlocksAt: Date | null): boolean {
  if (!unlocksAt) return false;
  return new Date() < unlocksAt;
}

/**
 * Get course with full progress and dripping status for a user
 */
export async function getCourseWithProgress(
  courseSlug: string,
  userId: string
): Promise<CourseWithProgress | null> {
  // Get enrollment
  const enrollment = await db.enrollment.findFirst({
    where: {
      userId,
      course: { slug: courseSlug },
    },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { position: "asc" },
            include: {
              lessons: {
                orderBy: { position: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    return null;
  }

  // Cursus toegang aflopen (groep afgerond → cursus gaat weg)
  const now = new Date();
  if (enrollment.endDate && enrollment.endDate < now) {
    return null;
  }

  const { course } = enrollment;

  // Get all completed lessons for this user in this course
  const completedProgress = await db.progress.findMany({
    where: {
      userId,
      lesson: {
        module: {
          courseId: course.id,
        },
      },
      completedAt: { not: null },
    },
    select: { lessonId: true },
  });

  const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId));

  // Build modules with status
  const modulesWithStatus: ModuleWithLessons[] = course.modules.map((module) => {
    const moduleUnlockDate = calculateUnlockDate(
      enrollment.startDate,
      module.unlockAfterDays,
      course.drippingUnit
    );
    const moduleIsLocked = isContentLocked(moduleUnlockDate);

    const lessonsWithStatus: LessonWithStatus[] = module.lessons.map((lesson) => {
      // Lesson can have its own unlock date, or inherit from module
      const lessonUnlockDate = lesson.unlockAfterDays !== null
        ? calculateUnlockDate(enrollment.startDate, lesson.unlockAfterDays, course.drippingUnit)
        : moduleUnlockDate;
      
      const lessonIsLocked = moduleIsLocked || isContentLocked(lessonUnlockDate);

      return {
        id: lesson.id,
        title: lesson.title,
        position: lesson.position,
        videoUrl: lesson.videoUrl,
        videoProvider: lesson.videoProvider,
        isCompleted: completedLessonIds.has(lesson.id),
        isLocked: lessonIsLocked,
        unlocksAt: lessonIsLocked ? lessonUnlockDate : null,
      };
    });

    return {
      id: module.id,
      title: module.title,
      description: module.description,
      position: module.position,
      isLocked: moduleIsLocked,
      unlocksAt: moduleIsLocked ? moduleUnlockDate : null,
      lessons: lessonsWithStatus,
      completedCount: lessonsWithStatus.filter((l) => l.isCompleted).length,
      totalCount: lessonsWithStatus.length,
    };
  });

  // Calculate totals
  const totalLessons = modulesWithStatus.reduce((acc, m) => acc + m.totalCount, 0);
  const completedLessons = modulesWithStatus.reduce((acc, m) => acc + m.completedCount, 0);
  const progressPercentage = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;

  // Calculate days remaining
  const daysRemaining = enrollment.endDate
    ? Math.ceil((enrollment.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    isPrivate: course.isPrivate,
    hasCommunity: course.hasCommunity ?? true,
    modules: modulesWithStatus,
    totalLessons,
    completedLessons,
    progressPercentage,
    enrollment: {
      startDate: enrollment.startDate,
      endDate: enrollment.endDate,
      daysRemaining: daysRemaining !== null && daysRemaining >= 0 ? daysRemaining : null,
    },
  };
}

/**
 * Get a single lesson with full details
 */
export async function getLesson(lessonId: string, userId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: true,
          lessons: {
            orderBy: { position: "asc" },
            select: { id: true, title: true, position: true },
          },
        },
      },
      attachments: true,
    },
  });

  if (!lesson) return null;

  // Check enrollment
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: lesson.module.courseId,
      },
    },
  });

  if (!enrollment) return null;

  // Check if lesson is locked
  const course = lesson.module.course;
  const moduleUnlockDate = calculateUnlockDate(
    enrollment.startDate,
    lesson.module.unlockAfterDays,
    course.drippingUnit
  );
  const lessonUnlockDate = lesson.unlockAfterDays !== null
    ? calculateUnlockDate(enrollment.startDate, lesson.unlockAfterDays, course.drippingUnit)
    : moduleUnlockDate;

  const isLocked = isContentLocked(moduleUnlockDate) || isContentLocked(lessonUnlockDate);

  if (isLocked) {
    return {
      ...lesson,
      isLocked: true,
      unlocksAt: lessonUnlockDate || moduleUnlockDate,
      isCompleted: false,
      videoProgress: 0,
      previousLesson: null,
      nextLesson: null,
    };
  }

  // Get progress
  const progress = await db.progress.findUnique({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
  });

  // Find previous and next lessons
  const allLessons = lesson.module.lessons;
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return {
    ...lesson,
    isLocked: false,
    unlocksAt: null,
    isCompleted: !!progress?.completedAt,
    videoProgress: progress?.videoProgress || 0,
    previousLesson,
    nextLesson,
  };
}

/**
 * Mark a lesson as complete
 */
export async function markLessonComplete(lessonId: string, userId: string) {
  return db.progress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    create: {
      userId,
      lessonId,
      completedAt: new Date(),
    },
    update: {
      completedAt: new Date(),
    },
  });
}

/**
 * Mark a lesson as incomplete
 */
export async function markLessonIncomplete(lessonId: string, userId: string) {
  return db.progress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    create: {
      userId,
      lessonId,
      completedAt: null,
    },
    update: {
      completedAt: null,
    },
  });
}

/**
 * Update video progress (seconds watched)
 */
export async function updateVideoProgress(
  lessonId: string,
  userId: string,
  seconds: number
) {
  return db.progress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    create: {
      userId,
      lessonId,
      videoProgress: seconds,
    },
    update: {
      videoProgress: seconds,
    },
  });
}
