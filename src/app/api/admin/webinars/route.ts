import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  duration: z.number().int().min(5).max(1440).default(60),
  autoRecord: z.boolean().default(true),
  eventType: z.enum(["online", "physical"]).default("online"),
  location: z.string().optional(),
  onlineUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  capacity: z.number().int().positive().nullable().optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const data = schema.parse(await request.json());
  const base = slugify(data.title) || "webinar";
  const registrationSlug = `${base}-${crypto.randomBytes(3).toString("hex")}`;
  const webinar = await db.webinar.create({
    data: {
      hostId: user.id,
      title: data.title,
      description: data.description?.trim() || null,
      startsAt: new Date(data.startsAt),
      duration: data.duration,
      autoRecord: data.autoRecord,
      eventType: data.eventType,
      location: data.eventType === "physical" ? data.location?.trim() || null : null,
      onlineUrl: data.eventType === "online" ? data.onlineUrl?.trim() || null : null,
      bannerUrl: data.bannerUrl?.trim() || null,
      capacity: data.capacity || null,
      registrationSlug,
    },
  });

  return NextResponse.json({
    webinar,
    registrationUrl: `/webinars/${registrationSlug}`,
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const webinars = await db.webinar.findMany({
    where: user.role === "COACH" ? { hostId: user.id } : {},
    include: { _count: { select: { registrations: true } } },
    orderBy: { startsAt: "desc" },
  });
  return NextResponse.json({ webinars });
}
