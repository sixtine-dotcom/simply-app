import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isTenantFeatureEnabled } from "@/lib/feature-flags";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().url("URL is ongeldig").nullable()
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().email("Reply-to email is ongeldig").nullable()
);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(240).nullable()
);

const optionalCss = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().max(12000).nullable()
);

const brandingSchema = z.object({
  platformName: z.string().trim().min(2, "Platformnaam is verplicht").max(120),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  loginBackgroundUrl: optionalUrl,
  loginVideoUrl: optionalUrl,
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Primaire kleur moet een hex kleur zijn"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Secundaire kleur moet een hex kleur zijn"),
  emailSenderName: z.string().trim().min(2, "Afzendernaam is verplicht").max(120),
  emailReplyTo: optionalEmail,
  footerText: optionalText,
  hidePoweredBy: z.boolean(),
  customCss: optionalCss,
});

async function requireAdminWithTenant() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return null;
  }
  if (!user.tenantId) {
    return { user, tenantId: null };
  }
  return { user, tenantId: user.tenantId };
}

export async function GET() {
  try {
    const auth = await requireAdminWithTenant();
    if (!auth) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    if (!auth.tenantId) {
      return NextResponse.json(
        { error: "Je account is nog niet gekoppeld aan een tenant." },
        { status: 400 }
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: auth.tenantId },
      include: { settings: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    const [hidePoweredByEnabled, customCssEnabled] = await Promise.all([
      isTenantFeatureEnabled(auth.tenantId, "hide_powered_by"),
      isTenantFeatureEnabled(auth.tenantId, "custom_css"),
    ]);

    return NextResponse.json({
      branding: {
        platformName: tenant.settings?.platformName || tenant.platformName || tenant.name,
        logoUrl: tenant.settings?.logoUrl || tenant.logoUrl || "",
        faviconUrl: tenant.settings?.faviconUrl || tenant.faviconUrl || "",
        loginBackgroundUrl: tenant.settings?.loginBackgroundUrl || "",
        loginVideoUrl: tenant.settings?.loginVideoUrl || "",
        primaryColor: tenant.settings?.primaryColor || tenant.primaryColor || "#385739",
        secondaryColor: tenant.settings?.secondaryColor || "#B18A4A",
        emailSenderName: tenant.settings?.emailSenderName || tenant.name,
        emailReplyTo: tenant.settings?.emailReplyTo || "",
        footerText: tenant.settings?.footerText || "",
        hidePoweredBy: hidePoweredByEnabled ? tenant.settings?.hidePoweredBy || false : false,
        customCss: customCssEnabled ? tenant.settings?.customCss || "" : "",
        featureAccess: {
          hidePoweredBy: hidePoweredByEnabled,
          customCss: customCssEnabled,
        },
      },
    });
  } catch (error) {
    console.error("Get branding error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminWithTenant();
    if (!auth) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    if (!auth.tenantId) {
      return NextResponse.json(
        { error: "Je account is nog niet gekoppeld aan een tenant." },
        { status: 400 }
      );
    }

    const parsed = brandingSchema.parse(await request.json());
    const [hidePoweredByEnabled, customCssEnabled] = await Promise.all([
      isTenantFeatureEnabled(auth.tenantId, "hide_powered_by"),
      isTenantFeatureEnabled(auth.tenantId, "custom_css"),
    ]);

    await db.$transaction([
      db.tenant.update({
        where: { id: auth.tenantId },
        data: {
          platformName: parsed.platformName,
          logoUrl: parsed.logoUrl,
          primaryColor: parsed.primaryColor,
          faviconUrl: parsed.faviconUrl,
        },
      }),
      db.tenantSettings.upsert({
        where: { tenantId: auth.tenantId },
        update: {
          platformName: parsed.platformName,
          logoUrl: parsed.logoUrl,
          faviconUrl: parsed.faviconUrl,
          loginBackgroundUrl: parsed.loginBackgroundUrl,
          loginVideoUrl: parsed.loginVideoUrl,
          primaryColor: parsed.primaryColor,
          secondaryColor: parsed.secondaryColor,
          emailSenderName: parsed.emailSenderName,
          emailReplyTo: parsed.emailReplyTo || null,
          footerText: parsed.footerText || null,
          hidePoweredBy: hidePoweredByEnabled ? parsed.hidePoweredBy : false,
          customCss: customCssEnabled ? parsed.customCss || null : null,
        },
        create: {
          tenantId: auth.tenantId,
          platformName: parsed.platformName,
          logoUrl: parsed.logoUrl,
          faviconUrl: parsed.faviconUrl,
          loginBackgroundUrl: parsed.loginBackgroundUrl,
          loginVideoUrl: parsed.loginVideoUrl,
          primaryColor: parsed.primaryColor,
          secondaryColor: parsed.secondaryColor,
          emailSenderName: parsed.emailSenderName,
          emailReplyTo: parsed.emailReplyTo || null,
          footerText: parsed.footerText || null,
          hidePoweredBy: hidePoweredByEnabled ? parsed.hidePoweredBy : false,
          customCss: customCssEnabled ? parsed.customCss || null : null,
        },
      }),
    ]);

    await createAuditLog(
      "tenant.branding.updated",
      auth.user.id,
      { tenantId: auth.tenantId },
      undefined,
      auth.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update branding error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
