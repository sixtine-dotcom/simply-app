import { db } from "@/lib/db";
import { ensureCourseCommunityMembership } from "@/lib/course-community";
import { syncEnrollmentToRecurringGroupPlans } from "@/lib/coaching";

export async function assignOfferAccessToUser(input: {
  offerId: string;
  userId: string;
  startDate?: Date;
}) {
  const offer = await db.offer.findUnique({
    where: { id: input.offerId },
    include: {
      courses: {
        include: {
          course: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!offer) {
    throw new Error("Offer niet gevonden");
  }

  if (offer.courses.length === 0) {
    throw new Error("Koppel eerst minstens 1 cursus aan dit offer.");
  }

  const existingAssignment = await db.offerAssignment.findFirst({
    where: {
      offerId: offer.id,
      userId: input.userId,
      revokedAt: null,
    },
    select: { id: true },
  });

  if (existingAssignment) {
    return {
      offer,
      createdAssignments: 0,
      createdEnrollments: 0,
      skippedEnrollments: offer.courses.length,
      matchedExistingAssignment: true,
    };
  }

  const startDate = input.startDate ?? new Date();
  const endDate =
    offer.accessDurationDays && offer.accessDurationDays > 0
      ? new Date(startDate.getTime() + offer.accessDurationDays * 24 * 60 * 60 * 1000)
      : null;

  const assignment = await db.offerAssignment.create({
    data: {
      offerId: offer.id,
      userId: input.userId,
      startDate,
      endDate,
    },
  });

  let createdEnrollments = 0;
  let skippedEnrollments = 0;

  for (const linkedCourse of offer.courses) {
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: input.userId,
          courseId: linkedCourse.course.id,
        },
      },
      select: { id: true },
    });

    if (existingEnrollment) {
      skippedEnrollments += 1;
      continue;
    }

    await db.enrollment.create({
      data: {
        userId: input.userId,
        courseId: linkedCourse.course.id,
        offerAssignmentId: assignment.id,
        startDate,
        endDate,
      },
    });
    await ensureCourseCommunityMembership({
      userId: input.userId,
      courseId: linkedCourse.course.id,
    });
    await syncEnrollmentToRecurringGroupPlans({
      userId: input.userId,
      courseId: linkedCourse.course.id,
    });
    createdEnrollments += 1;
  }

  return {
    offer,
    createdAssignments: 1,
    createdEnrollments,
    skippedEnrollments,
    matchedExistingAssignment: false,
  };
}
