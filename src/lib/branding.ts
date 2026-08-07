import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { isTenantFeatureEnabled } from "@/lib/feature-flags";

export type TenantBranding = {
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string;
  platformName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  loginBackgroundUrl: string | null;
  loginVideoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  emailSenderName: string;
  emailReplyTo: string | null;
  footerText: string | null;
  hidePoweredBy: boolean;
  customCss: string | null;
};

export const DEFAULT_BRANDING: TenantBranding = {
  tenantId: null,
  tenantSlug: null,
  tenantName: "Simply leeromgeving",
  platformName: "Simply leeromgeving",
  logoUrl: null,
  faviconUrl: null,
  loginBackgroundUrl: "/auth-login-bg.jpg",
  loginVideoUrl: null,
  primaryColor: "#385739",
  secondaryColor: "#b18a4a",
  emailSenderName: "Simply leeromgeving",
  emailReplyTo: null,
  footerText: "Rust, ritme en resultaat op een plek.",
  hidePoweredBy: false,
  customCss: null,
};

function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return fallback;
  return trimmed.toUpperCase();
}

function parseHost(hostHeader: string | null): string {
  if (!hostHeader) return "";
  return hostHeader.split(":")[0].toLowerCase();
}

function mergeBranding(tenant: {
  id: string;
  slug: string;
  name: string;
  platformName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  faviconUrl: string | null;
  settings: {
    platformName: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    loginBackgroundUrl: string | null;
    loginVideoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    emailSenderName: string | null;
    emailReplyTo: string | null;
    footerText: string | null;
    hidePoweredBy: boolean;
    customCss: string | null;
  } | null;
}): TenantBranding {
  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    platformName:
      tenant.settings?.platformName?.trim() ||
      tenant.platformName?.trim() ||
      tenant.name,
    logoUrl: tenant.settings?.logoUrl || tenant.logoUrl || null,
    faviconUrl: tenant.settings?.faviconUrl || tenant.faviconUrl || null,
    loginBackgroundUrl:
      tenant.settings?.loginBackgroundUrl || DEFAULT_BRANDING.loginBackgroundUrl,
    loginVideoUrl: tenant.settings?.loginVideoUrl || null,
    primaryColor: normalizeHexColor(
      tenant.settings?.primaryColor || tenant.primaryColor,
      DEFAULT_BRANDING.primaryColor
    ),
    secondaryColor: normalizeHexColor(
      tenant.settings?.secondaryColor,
      DEFAULT_BRANDING.secondaryColor
    ),
    emailSenderName:
      tenant.settings?.emailSenderName?.trim() || tenant.name,
    emailReplyTo: tenant.settings?.emailReplyTo?.trim() || null,
    footerText: tenant.settings?.footerText?.trim() || DEFAULT_BRANDING.footerText,
    hidePoweredBy: tenant.settings?.hidePoweredBy ?? DEFAULT_BRANDING.hidePoweredBy,
    customCss: tenant.settings?.customCss || null,
  };
}

async function getBrandingRecord(where: { id?: string; slug?: string; domain?: string }) {
  if (where.id) {
    return db.tenant.findUnique({
      where: { id: where.id },
      select: {
        id: true,
        slug: true,
        name: true,
        platformName: true,
        logoUrl: true,
        primaryColor: true,
        faviconUrl: true,
        settings: {
          select: {
            platformName: true,
            logoUrl: true,
            faviconUrl: true,
            loginBackgroundUrl: true,
            loginVideoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            emailSenderName: true,
            emailReplyTo: true,
            footerText: true,
            hidePoweredBy: true,
            customCss: true,
          },
        },
      },
    });
  }

  if (where.slug) {
    return db.tenant.findUnique({
      where: { slug: where.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        platformName: true,
        logoUrl: true,
        primaryColor: true,
        faviconUrl: true,
        settings: {
          select: {
            platformName: true,
            logoUrl: true,
            faviconUrl: true,
            loginBackgroundUrl: true,
            loginVideoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            emailSenderName: true,
            emailReplyTo: true,
            footerText: true,
            hidePoweredBy: true,
            customCss: true,
          },
        },
      },
    });
  }

  if (where.domain) {
    const domainMatch = await db.tenantDomain.findUnique({
      where: { domain: where.domain },
      select: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            platformName: true,
            logoUrl: true,
            primaryColor: true,
            faviconUrl: true,
            settings: {
              select: {
                platformName: true,
                logoUrl: true,
                faviconUrl: true,
                loginBackgroundUrl: true,
                loginVideoUrl: true,
                primaryColor: true,
                secondaryColor: true,
                emailSenderName: true,
                emailReplyTo: true,
                footerText: true,
                hidePoweredBy: true,
                customCss: true,
              },
            },
          },
        },
      },
    });

    return domainMatch?.tenant ?? null;
  }

  return null;
}

export async function getTenantBrandingById(tenantId: string | null | undefined) {
  if (!tenantId) return DEFAULT_BRANDING;
  const tenant = await getBrandingRecord({ id: tenantId });
  if (!tenant) return DEFAULT_BRANDING;

  const branding = mergeBranding(tenant);
  const [hidePoweredByEnabled, customCssEnabled] = await Promise.all([
    isTenantFeatureEnabled(tenantId, "hide_powered_by"),
    isTenantFeatureEnabled(tenantId, "custom_css"),
  ]);

  return {
    ...branding,
    hidePoweredBy: hidePoweredByEnabled ? branding.hidePoweredBy : false,
    customCss: customCssEnabled ? branding.customCss : null,
  };
}

export async function getTenantBrandingFromHeaders() {
  const headerStore = await headers();
  const explicitSlug = headerStore.get("x-tenant-slug");
  const host = parseHost(headerStore.get("x-request-host") || headerStore.get("host"));

  const tenant = explicitSlug
    ? await getBrandingRecord({ slug: explicitSlug })
    : host
      ? await getBrandingRecord({ domain: host })
      : null;

  if (!tenant) return DEFAULT_BRANDING;

  const branding = mergeBranding(tenant);
  const [hidePoweredByEnabled, customCssEnabled] = await Promise.all([
    isTenantFeatureEnabled(tenant.id, "hide_powered_by"),
    isTenantFeatureEnabled(tenant.id, "custom_css"),
  ]);

  return {
    ...branding,
    hidePoweredBy: hidePoweredByEnabled ? branding.hidePoweredBy : false,
    customCss: customCssEnabled ? branding.customCss : null,
  };
}

function hexToHslString(hex: string): string | null {
  const normalized = normalizeHexColor(hex, "");
  if (!normalized) return null;

  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / d) % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      default:
        h = 60 * ((r - g) / d + 4);
        break;
    }
  }

  if (h < 0) h += 360;

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function getBrandingCssVariables(branding: TenantBranding) {
  const primaryHsl = hexToHslString(branding.primaryColor);
  const secondaryHsl = hexToHslString(branding.secondaryColor);

  return {
    "--primary": primaryHsl || "112 38% 25%",
    "--ring": primaryHsl || "112 38% 25%",
    "--tenant-secondary": secondaryHsl || "41 43% 49%",
  } as CSSProperties;
}
