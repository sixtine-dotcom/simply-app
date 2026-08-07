import { headers } from "next/headers";
import { db } from "@/lib/db";

export type TenantContext = {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
};

function parseHost(hostHeader: string | null): string {
  if (!hostHeader) return "";
  return hostHeader.split(":")[0].toLowerCase();
}

export async function getTenantContextFromHeaders(): Promise<TenantContext | null> {
  const h = await headers();
  const explicitSlug = h.get("x-tenant-slug");
  const host = parseHost(h.get("x-request-host") || h.get("host"));

  if (explicitSlug) {
    const tenant = await db.tenant.findUnique({
      where: { slug: explicitSlug },
      select: { id: true, slug: true, name: true, status: true, plan: true },
    });
    return tenant;
  }

  if (!host) return null;

  const tenantByDomain = await db.tenantDomain.findUnique({
    where: { domain: host },
    select: {
      tenant: {
        select: { id: true, slug: true, name: true, status: true, plan: true },
      },
    },
  });

  return tenantByDomain?.tenant ?? null;
}

export async function requireActiveTenant(): Promise<TenantContext | null> {
  const tenant = await getTenantContextFromHeaders();
  if (!tenant) return null;
  if (tenant.status === "SUSPENDED") return null;
  return tenant;
}
