import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const submitSchema = z.object({
  periodIndex: z.number().int().min(0),
  beforePhotoUrl: z.string().url().nullable().optional(),
  afterPhotoUrl: z.string().url().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { id: courseId } = await params;

    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId },
      },
      include: {
        course: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Je bent niet ingeschreven voor deze cursus" },
        { status: 403 }
      );
    }

    const course = enrollment.course;
    const count = course.photoMomentsCount ?? 0;
    const intervalWeeks = course.photoMomentsIntervalWeeks ?? 0;

    if (count === 0 || intervalWeeks === 0) {
      return NextResponse.json({
        course: { id: course.id, title: course.title },
        enrollmentStartDate: enrollment.startDate,
        intervalWeeks: null,
        moments: [],
      });
    }

    const existing = await db.progressPhoto.findMany({
      where: { userId: user.id, courseId },
      orderBy: { periodIndex: "asc" },
    });
    const byPeriod = Object.fromEntries(
      existing.map((p) => [p.periodIndex, p])
    );

    const moments = Array.from({ length: count }, (_, i) => {
      const row = byPeriod[i];
      return {
        periodIndex: i,
        weekLabel: `Week ${i * intervalWeeks}`,
        beforePhotoUrl: row?.beforePhotoUrl ?? null,
        afterPhotoUrl: row?.afterPhotoUrl ?? null,
        submittedAt: row?.submittedAt ?? null,
      };
    });

    return NextResponse.json({
      course: { id: course.id, title: course.title },
      enrollmentStartDate: enrollment.startDate,
      intervalWeeks,
      moments,
    });
  } catch (error) {
    console.error("Progress photos GET error:", error);
    return NextResponse.json(
      { error: "Kon gegevens niet ophalen" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { id: courseId } = await params;

    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId },
      },
      include: { course: true },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Je bent niet ingeschreven voor deze cursus" },
        { status: 403 }
      );
    }

    const count = enrollment.course.photoMomentsCount ?? 0;
    if (count === 0) {
      return NextResponse.json(
        { error: "Deze cursus heeft geen progressiefoto-momenten" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = submitSchema.parse(body);
    if (data.periodIndex >= count) {
      return NextResponse.json(
        { error: "Ongeldig periodIndex" },
        { status: 400 }
      );
    }

    const before = data.beforePhotoUrl ?? undefined;
    const after = data.afterPhotoUrl ?? undefined;
    const hasAny = before !== undefined || after !== undefined;

    const updated = await db.progressPhoto.upsert({
      where: {
        userId_courseId_periodIndex: {
          userId: user.id,
          courseId,
          periodIndex: data.periodIndex,
        },
      },
      create: {
        userId: user.id,
        courseId,
        periodIndex: data.periodIndex,
        beforePhotoUrl: before ?? null,
        afterPhotoUrl: after ?? null,
        submittedAt: hasAny ? new Date() : null,
      },
      update: {
        ...(before !== undefined && { beforePhotoUrl: before }),
        ...(after !== undefined && { afterPhotoUrl: after }),
        submittedAt: hasAny ? new Date() : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Progress photos POST error:", error);
    return NextResponse.json(
      { error: "Kon niet opslaan" },
      { status: 500 }
    );
  }
}
