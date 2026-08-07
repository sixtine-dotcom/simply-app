import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEventRegistrationEmail } from "@/lib/email";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(6),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = schema.parse(await request.json());
  const webinar = await db.webinar.findUnique({
    where: { registrationSlug: slug },
    select: {
      id: true, title: true, description: true, startsAt: true, duration: true,
      eventType: true, location: true, onlineUrl: true, bannerUrl: true,
      registrationOpen: true, capacity: true, _count: { select: { registrations: true } },
    },
  });
  if (!webinar) {
    return NextResponse.json({ error: "Webinar niet gevonden" }, { status: 404 });
  }
  if (!webinar.registrationOpen) return NextResponse.json({ error: "De inschrijvingen zijn gesloten" }, { status: 409 });
  if (webinar.capacity && webinar._count.registrations >= webinar.capacity) return NextResponse.json({ error: "Dit event is volzet" }, { status: 409 });

  const registration = await db.webinarRegistration.upsert({
    where: {
      webinarId_email: {
        webinarId: webinar.id,
        email: data.email.toLowerCase(),
      },
    },
    create: {
      webinarId: webinar.id,
      firstName: data.firstName,
      lastName: data.lastName || null,
      email: data.email.toLowerCase(),
      phone: data.phone.trim(),
      joinToken: crypto.randomBytes(24).toString("hex"),
    },
    update: {
      firstName: data.firstName,
      lastName: data.lastName || null,
      phone: data.phone.trim(),
    },
  });

  const appUrl = process.env.APP_URL || request.nextUrl.origin;
  const publicUrl = `${appUrl}/events/${slug}`;
  const emailResult = await sendEventRegistrationEmail({
    email: registration.email,
    firstName: registration.firstName,
    title: webinar.title,
    description: webinar.description,
    startsAt: webinar.startsAt,
    duration: webinar.duration,
    eventType: webinar.eventType,
    location: webinar.location,
    onlineUrl: webinar.onlineUrl,
    bannerUrl: webinar.bannerUrl,
    publicUrl,
  });

  return NextResponse.json({
    ok: true,
    emailSent: emailResult.success,
    joinUrl: webinar.eventType === "online" ? `/webinars/${slug}/join?token=${registration.joinToken}` : null,
  });
}
