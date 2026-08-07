import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "simply_session";

function normalizeHost(hostHeader: string | null): string {
  if (!hostHeader) return "";
  return hostHeader.split(":")[0].toLowerCase();
}

function getPlatformHosts(): Set<string> {
  const fromEnv = (process.env.PLATFORM_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return new Set(["localhost", "127.0.0.1", ...fromEnv]);
}

function extractTenantSlug(host: string): string | null {
  if (!host) return null;

  if (host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length);
    return sub || null;
  }

  const rootDomain = (process.env.ROOT_DOMAIN || "").trim().toLowerCase();
  if (rootDomain && host.endsWith(`.${rootDomain}`)) {
    const sub = host.slice(0, -(`.${rootDomain}`).length);
    if (!sub || sub === "www") return null;
    return sub.split(".")[0] || null;
  }

  return null;
}

function shouldRedirectAnonymousRoot(req: NextRequest): boolean {
  if (req.nextUrl.pathname !== "/") return false;
  return !req.cookies.get(SESSION_COOKIE_NAME)?.value;
}

function shouldRedirectLockedLaunchRoute(req: NextRequest): boolean {
  if (process.env.LAUNCH_LOCK_ENABLED !== "true") return false;

  return (
    req.nextUrl.pathname === "/register" ||
    req.nextUrl.pathname.startsWith("/register/") ||
    req.nextUrl.pathname === "/sign-up" ||
    req.nextUrl.pathname.startsWith("/sign-up/")
  );
}

function withTenantHeaders(req: NextRequest) {
  if (shouldRedirectLockedLaunchRoute(req)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (shouldRedirectAnonymousRoot(req)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const host = normalizeHost(req.headers.get("host"));
  const platformHosts = getPlatformHosts();
  const tenantSlug = extractTenantSlug(host);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-host", host);
  requestHeaders.set(
    "x-platform-host",
    platformHosts.has(host) || !tenantSlug ? "1" : "0"
  );

  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

const hasClerkConfig = Boolean(
  process.env.ENABLE_CLERK_AUTH === "true" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
);

export default hasClerkConfig
  ? clerkMiddleware((_, req) => withTenantHeaders(req))
  : function middleware(req: NextRequest) {
      return withTenantHeaders(req);
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
