import { db } from "./db";
import { getBlockingCourseFormForUser } from "./forms";
import type { CourseAccessGate } from "./forms";

export interface LessonWithStatus {
  id: string;
  title: string;
  position: number;
  videoUrl: string | null;
  videoEmbedCode: string | null;
  videoProvider: string | null;
  videoDuration: number | null;
  videoProgress: number;
  watchedPercentage: number | null;
  remainingSeconds: number | null;
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
  totalVideoDuration: number;
  watchedPercentage: number | null;
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
  accessGate: CourseAccessGate | null;
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

  const accessGate = await getBlockingCourseFormForUser(userId, course.id);

  // Get all lesson progress for this user in this course
  const lessonProgress = await db.progress.findMany({
    where: {
      userId,
      lesson: {
        module: {
          courseId: course.id,
        },
      },
    },
    select: { lessonId: true, completedAt: true, videoProgress: true },
  });

  const progressByLessonId = new Map(lessonProgress.map((p) => [p.lessonId, p]));

  // Build modules with status
  const modulesWithStatus: ModuleWithLessons[] = course.modules.map((module) => {
    const moduleUnlockDate = calculateUnlockDate(
      enrollment.startDate,
      module.unlockAfterDays,
      course.drippingUnit
    );
    const courseHasNotStarted = now < enrollment.startDate;
    const moduleIsLocked = courseHasNotStarted || isContentLocked(moduleUnlockDate);

    const lessonsWithStatus: LessonWithStatus[] = module.lessons.map((lesson) => {
      // Lesson can have its own unlock date, or inherit from module
      const lessonUnlockDate = lesson.unlockAfterDays !== null
        ? calculateUnlockDate(enrollment.startDate, lesson.unlockAfterDays, course.drippingUnit)
        : moduleUnlockDate;
      
      const lessonIsLocked = courseHasNotStarted || moduleIsLocked || isContentLocked(lessonUnlockDate);
      const progress = progressByLessonId.get(lesson.id);
      const videoProgress = progress?.videoProgress ?? 0;
      const watchedSeconds = progress?.completedAt && lesson.videoDuration
        ? lesson.videoDuration
        : Math.min(videoProgress, lesson.videoDuration ?? videoProgress);
      const watchedPercentage = lesson.videoDuration && lesson.videoDuration > 0
        ? Math.min(100, Math.round((watchedSeconds / lesson.videoDuration) * 100))
        : null;
      const remainingSeconds = lesson.videoDuration && watchedPercentage !== null && watchedPercentage < 100
        ? Math.max(0, lesson.videoDuration - watchedSeconds)
        : null;

      return {
        id: lesson.id,
        title: lesson.title,
        position: lesson.position,
        videoUrl: lesson.videoUrl,
        videoEmbedCode: lesson.videoEmbedCode,
        videoProvider: lesson.videoProvider,
        videoDuration: lesson.videoDuration,
        videoProgress,
        watchedPercentage,
        remainingSeconds,
        isCompleted: Boolean(progress?.completedAt),
        isLocked: lessonIsLocked,
        unlocksAt: lessonIsLocked ? (courseHasNotStarted ? enrollment.startDate : lessonUnlockDate) : null,
      };
    });

    const totalVideoDuration = lessonsWithStatus.reduce((total, l) => total + (l.videoDuration ?? 0), 0);
    const watchedVideoDuration = lessonsWithStatus.reduce((total, l) => {
      if (!l.videoDuration || l.watchedPercentage === null) return total;
      return total + Math.round((l.videoDuration * l.watchedPercentage) / 100);
    }, 0);

    return {
      id: module.id,
      title: module.title,
      description: module.description,
      position: module.position,
      isLocked: moduleIsLocked,
      unlocksAt: moduleIsLocked ? (courseHasNotStarted ? enrollment.startDate : moduleUnlockDate) : null,
      lessons: lessonsWithStatus,
      completedCount: lessonsWithStatus.filter((l) => l.isCompleted).length,
      totalCount: lessonsWithStatus.length,
      totalVideoDuration,
      watchedPercentage: totalVideoDuration > 0
        ? Math.min(100, Math.round((watchedVideoDuration / totalVideoDuration) * 100))
        : null,
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
    accessGate,
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
            select: { id: true, title: true, position: true, videoDuration: true },
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

  const now = new Date();

  const accessGate = await getBlockingCourseFormForUser(userId, lesson.module.courseId);
  if (accessGate) {
    return {
      ...lesson,
      isLocked: true,
      unlocksAt: null,
      accessGate,
      isCompleted: false,
      videoProgress: 0,
      moduleWatchedPercentage: null,
      checklistState: {},
      previousLesson: null,
      nextLesson: null,
    };
  }

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

  const isLocked = now < enrollment.startDate || isContentLocked(moduleUnlockDate) || isContentLocked(lessonUnlockDate);

  if (isLocked) {
    return {
      ...lesson,
      isLocked: true,
      unlocksAt: now < enrollment.startDate ? enrollment.startDate : lessonUnlockDate || moduleUnlockDate,
      isCompleted: false,
      videoProgress: 0,
      moduleWatchedPercentage: null,
      checklistState: {},
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
  const moduleProgress = await db.progress.findMany({
    where: {
      userId,
      lessonId: {
        in: allLessons.map((moduleLesson) => moduleLesson.id),
      },
    },
    select: {
      lessonId: true,
      completedAt: true,
      videoProgress: true,
    },
  });
  const moduleProgressByLessonId = new Map(moduleProgress.map((item) => [item.lessonId, item]));
  const moduleTotalDuration = allLessons.reduce((total, moduleLesson) => total + (moduleLesson.videoDuration ?? 0), 0);
  const moduleWatchedDuration = allLessons.reduce((total, moduleLesson) => {
    const item = moduleProgressByLessonId.get(moduleLesson.id);
    const duration = moduleLesson.videoDuration ?? 0;
    const watched = item?.completedAt && duration > 0
      ? duration
      : Math.min(item?.videoProgress ?? 0, duration);

    return total + watched;
  }, 0);

  return {
    ...lesson,
    isLocked: false,
    unlocksAt: null,
    isCompleted: !!progress?.completedAt,
    videoProgress: progress?.videoProgress || 0,
    moduleWatchedPercentage: moduleTotalDuration > 0
      ? Math.min(100, Math.round((moduleWatchedDuration / moduleTotalDuration) * 100))
      : null,
    checklistState: progress?.checklistState || {},
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
