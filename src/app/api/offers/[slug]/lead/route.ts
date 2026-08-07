import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantBrandingFromHeaders } from "@/lib/branding";
import { sendOfferLeadNotificationEmail } from "@/lib/email";

const createLeadSchema = z.object({
  firstName: z.string().trim().min(1, "Voornaam is verplicht"),
  lastName: z.string().trim().optional(),
  email: z.string().email("Voer een geldig e-mailadres in"),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const offer = await db.offer.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        isPublished: true,
      },
    });

    if (!offer || !offer.isPublished) {
      return NextResponse.json({ error: "Offer niet gevonden" }, { status: 404 });
    }

    const body = createLeadSchema.parse(await request.json());
    const branding = await getTenantBrandingFromHeaders();

    const existingLead = await db.offerLead.findFirst({
      where: {
        offerId: offer.id,
        email: body.email.toLowerCase(),
        status: { in: ["new", "contacted"] },
      },
      select: { id: true },
    });

    if (existingLead) {
      return NextResponse.json(
        { error: "Er bestaat al een open aanvraag voor dit e-mailadres." },
        { status: 400 }
      );
    }

    const lead = await db.offerLead.create({
      data: {
        offerId: offer.id,
        firstName: body.firstName,
        lastName: body.lastName || null,
        email: body.email.toLowerCase(),
        note: body.note || null,
      },
    });

    const recipients = await db.user.findMany({
      where: branding.tenantId
        ? {
            tenantId: branding.tenantId,
            role: { in: ["ADMIN", "SUPPORT"] },
            deletedAt: null,
          }
        : {
            role: { in: ["ADMIN", "SUPPORT"] },
            deletedAt: null,
          },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    });

    await Promise.all(
      recipients.map(async (recipient) => {
        await db.notification.create({
          data: {
            userId: recipient.id,
            type: "offer_lead",
            title: `Nieuwe lead voor ${offer.title}`,
            body: `${body.firstName} ${body.lastName || ""} heeft interesse getoond via ${body.email}.`,
            link: "/admin/offers",
          },
        });

        await sendOfferLeadNotificationEmail({
          to: recipient.email,
          offerTitle: offer.title,
          leadName: `${body.firstName} ${body.lastName || ""}`.trim(),
          leadEmail: body.email.toLowerCase(),
          note: body.note || null,
        });
      })
    );

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create offer lead error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
