import { db } from "./db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { isTrustedRegistrationInvitation } from "./registration-access";
import { hasProvisionedAccountAccess } from "./account-access";
import { getTenantContextFromHeaders } from "./tenant";

const SESSION_COOKIE_NAME = "simply_session";
const IMPERSONATION_COOKIE_NAME = "simply_impersonation";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const IMPERSONATION_MAX_AGE = 2 * 60 * 60; // 2 hours in seconds
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes in ms
const REGISTRATION_LINK_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

type AuthUser = Awaited<ReturnType<typeof db.user.findUnique>>;
type ImpersonationState = {
  adminUserId: string;
  targetUserId: string;
  targetTenantId: string | null;
  expiresAt: number;
};
export type ActiveImpersonation = {
  isActive: true;
  adminUserId: string;
  adminEmail: string;
  adminName: string;
  targetUserId: string;
  targetEmail: string;
};
export type CurrentUser = NonNullable<AuthUser> & {
  preferredLanguage: "nl" | "en";
  impersonation?: ActiveImpersonation;
};
export type UserSessionDevice = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
  deviceLabel: string;
};

function normalizeCurrentUser(user: NonNullable<AuthUser>): CurrentUser {
  return {
    ...user,
    preferredLanguage: user.preferredLanguage === "en" ? "en" : "nl",
  };
}

function getImpersonationSecret(): string {
  return process.env.AUTH_SECRET || "simply-dev-impersonation-secret";
}

function hasClerkConfig(): boolean {
  return Boolean(
    process.env.ENABLE_CLERK_AUTH === "true" &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY
  );
}

// Hash a token for storage
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Generate a random token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function signImpersonationState(state: ImpersonationState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getImpersonationSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function parseImpersonationCookie(value: string | undefined): ImpersonationState | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", getImpersonationSecret())
    .update(payload)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ImpersonationState;
    if (
      typeof parsed.adminUserId !== "string" ||
      typeof parsed.targetUserId !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    if (parsed.expiresAt < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// Create a magic link token
export async function createMagicLink(email: string): Promise<string> {
  const token = generateToken();
  const hashedToken = hashToken(token);

  // Delete any existing tokens for this email
  await db.verificationToken.deleteMany({
    where: { email, type: "magic_link" },
  });

  // Create new token
  await db.verificationToken.create({
    data: {
      email,
      token: hashedToken,
      type: "magic_link",
      expiresAt: new Date(Date.now() + MAGIC_LINK_EXPIRY),
    },
  });

  return token;
}

// Create a registration link token (for "account aanmaken via link in inbox")
export async function createRegistrationToken(
  email: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  if (!isTrustedRegistrationInvitation(metadata)) {
    throw new Error("An activation link requires a server-authorized invitation");
  }
  const invitedUser = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!invitedUser || invitedUser.deletedAt) throw new Error("The invited account does not exist");
  const token = generateToken();
  const hashedToken = hashToken(token);

  await db.verificationToken.deleteMany({
    where: { email: email.toLowerCase(), type: "registration" },
  });

  await db.verificationToken.create({
    data: {
      email: email.toLowerCase(),
      token: hashedToken,
      type: "registration",
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      expiresAt: new Date(Date.now() + REGISTRATION_LINK_EXPIRY),
    },
  });

  return token;
}

// Verify a registration token and return email
export async function verifyRegistrationToken(token: string): Promise<{
  success: boolean;
  email?: string;
  metadata?: Record<string, unknown> | null;
  error?: string;
}> {
  const hashedToken = hashToken(token);

  const verificationToken = await db.verificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!verificationToken || verificationToken.type !== "registration") {
    return { success: false, error: "Ongeldige link" };
  }
  if (verificationToken.usedAt) {
    return { success: false, error: "Deze link is al gebruikt" };
  }
  if (verificationToken.expiresAt < new Date()) {
    return { success: false, error: "Deze link is verlopen" };
  }

  if (!isTrustedRegistrationInvitation(verificationToken.metadata)) {
    return { success: false, error: "Deze link geeft geen toegang. Gebruik de activatiemail van je aankoop." };
  }
  const invitedUser = await db.user.findUnique({ where: { email: verificationToken.email } });
  if (!invitedUser || invitedUser.deletedAt) return { success: false, error: "Account niet beschikbaar" };
  const metadata = verificationToken.metadata as Record<string, unknown>;
  if (metadata.source === "shopify_paid") {
    if (typeof metadata.orderId !== "string") return { success: false, error: "Aankoop ontbreekt" };
    const courseIds = Array.isArray(metadata.courseIds) ? metadata.courseIds.filter((id): id is string => typeof id === "string") : [];
    const purchase = await db.enrollment.findFirst({ where: {
      userId: invitedUser.id,
      OR: [{ shopifyOrderId: metadata.orderId }, ...(courseIds.length ? [{ courseId: { in: courseIds } }] : [])],
    } });
    if (!purchase) return { success: false, error: "Deze aankoop geeft geen toegang meer" };
  }

  return {
    success: true,
    email: verificationToken.email,
    metadata:
      verificationToken.metadata && typeof verificationToken.metadata === "object"
        ? (verificationToken.metadata as Record<string, unknown>)
        : null,
  };
}

// Activate a provisioned account; never create an account from a public link
export async function completeRegistration(
  token: string,
  firstName: string,
  lastName: string,
  phone: string,
  bio?: string | null
): Promise<{ success: boolean; user?: any; error?: string }> {
  const result = await verifyRegistrationToken(token);
  if (!result.success || !result.email) {
    return { success: false, error: result.error };
  }
  const hashedToken = hashToken(token);
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email: result.email! } });
    if (!user || user.deletedAt) return { success: false, error: "Account niet beschikbaar" };
    const claimed = await tx.verificationToken.updateMany({
      where: { token: hashedToken, type: "registration", usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return { success: false, error: "Deze link is al gebruikt of verlopen" };
    const activatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || null,
        bio: bio?.trim() || null, emailVerified: user.emailVerified ?? new Date(),
      },
    });
    return { success: true, user: activatedUser };
  });
}

// Verify a magic link token
export async function verifyMagicLink(token: string) {
  const hashedToken = hashToken(token);

  const verificationToken = await db.verificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!verificationToken || verificationToken.type !== "magic_link") {
    return { success: false, error: "Invalid token" };
  }

  if (verificationToken.usedAt) {
    return { success: false, error: "Token already used" };
  }

  if (verificationToken.expiresAt < new Date()) {
    return { success: false, error: "Token expired" };
  }

  // Mark token as used
  await db.verificationToken.update({
    where: { id: verificationToken.id },
    data: { usedAt: new Date() },
  });

  // Find or indicate user needs to be created
  const user = await db.user.findUnique({
    where: { email: verificationToken.email },
  });

  return {
    success: true,
    email: verificationToken.email,
    user: user && await hasProvisionedAccountAccess(user) ? user : null,
  };
}

// Create a session for a user
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const normalizedIpAddress = normalizeIpAddress(ipAddress);
  await createSuspiciousSessionAlert(userId, userAgent, normalizedIpAddress);

  const token = generateToken();
  const hashedToken = hashToken(token);

  await db.authSession.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      userAgent,
      ipAddress: normalizedIpAddress,
    },
  });

  const sessions = await db.authSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const sessionsToDelete = sessions.slice(2);
  if (sessionsToDelete.length > 0) {
    await db.authSession.deleteMany({
      where: {
        id: {
          in: sessionsToDelete.map((session) => session.id),
        },
      },
    });
  }

  // Update user's last login
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  return token;
}

function getDeviceLabel(userAgent?: string | null) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return "Onbekend apparaat";

  const device =
    ua.includes("iphone") ? "iPhone" :
    ua.includes("ipad") ? "iPad" :
    ua.includes("android") ? "Android" :
    ua.includes("mac os x") || ua.includes("macintosh") ? "Mac" :
    ua.includes("windows") ? "Windows pc" :
    ua.includes("linux") ? "Linux toestel" :
    "Apparaat";

  const browser =
    ua.includes("edg/") ? "Edge" :
    ua.includes("chrome/") ? "Chrome" :
    ua.includes("safari/") && !ua.includes("chrome/") ? "Safari" :
    ua.includes("firefox/") ? "Firefox" :
    ua.includes("opr/") || ua.includes("opera") ? "Opera" :
    "Browser";

  return `${device} · ${browser}`;
}

function normalizeIpAddress(ipAddress?: string | null) {
  if (!ipAddress) return null;
  return ipAddress.split(",")[0]?.trim() || null;
}

async function createSuspiciousSessionAlert(
  userId: string,
  userAgent?: string,
  ipAddress?: string | null
) {
  const priorSessions = await db.authSession.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (priorSessions.length === 0) return;

  const currentDeviceLabel = getDeviceLabel(userAgent);
  const knownDevice = priorSessions.some(
    (session) => getDeviceLabel(session.userAgent) === currentDeviceLabel
  );
  const latestSessionIp = normalizeIpAddress(priorSessions[0]?.ipAddress);
  const newIp = ipAddress && latestSessionIp !== ipAddress;

  if (!knownDevice && newIp) {
    await db.notification.create({
      data: {
        userId,
        type: "security",
        title: "Nieuwe login gedetecteerd",
        body: `${currentDeviceLabel}${ipAddress ? ` vanaf IP ${ipAddress}` : ""}. Controleer je actieve sessies als dit niet van jou is.`,
        link: "/settings",
      },
    });
  }
}

// Set session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

// Get session cookie
export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

async function setImpersonationCookie(state: ImpersonationState) {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE_NAME, signImpersonationState(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: IMPERSONATION_MAX_AGE,
    path: "/",
  });
}

export async function clearImpersonationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE_NAME);
}

async function getAuthenticatedUser(): Promise<AuthUser> {
  const token = await getSessionCookie();
  if (token) {
    const hashedToken = hashToken(token);
    const session = await db.authSession.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (session) {
      if (!(await hasProvisionedAccountAccess(session.user))) return null;
      if (session.expiresAt < new Date()) {
        await clearSessionCookie();
      } else {
        return session.user;
      }
    }
  }

  if (hasClerkConfig()) {
    const clerkAuth = await auth();
    if (clerkAuth.userId) {
      const clerkUser = await clerkCurrentUser();
      const primaryEmail =
        clerkUser?.emailAddresses.find(
          (email) => email.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;

      if (primaryEmail) {
        const normalizedEmail = primaryEmail.toLowerCase();
        const existingUser = await db.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser && await hasProvisionedAccountAccess(existingUser) && clerkUser?.emailAddresses.some(
          (entry) => entry.emailAddress.toLowerCase() === normalizedEmail && entry.verification?.status === "verified"
        )) {
          await db.user.update({
            where: { id: existingUser.id },
            data: { lastLoginAt: new Date() },
          });
          return existingUser;
        }

        // An external identity never creates an app account. Shopify or an
        // authenticated administrator must have provisioned it first.
        return null;
      }
    }
  }

  return null;
}

export async function getImpersonationState() {
  const cookieStore = await cookies();
  return parseImpersonationCookie(cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value);
}

// Get current user from session
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const authenticatedUser = await getAuthenticatedUser();
  if (!authenticatedUser) return null;
  const requestTenant = await getTenantContextFromHeaders();

  if (authenticatedUser.role !== "SUPERADMIN") {
    if (requestTenant) {
      if (authenticatedUser.tenantId !== requestTenant.id) {
        return null;
      }

      if (requestTenant.status === "SUSPENDED") {
        return null;
      }
    }

    return normalizeCurrentUser(authenticatedUser);
  }

  const impersonation = await getImpersonationState();
  if (!impersonation) return normalizeCurrentUser(authenticatedUser);

  if (impersonation.adminUserId !== authenticatedUser.id) {
    await clearImpersonationCookie();
    return normalizeCurrentUser(authenticatedUser);
  }

  const targetUser = await db.user.findUnique({
    where: { id: impersonation.targetUserId },
  });

  if (!targetUser || targetUser.deletedAt) {
    await clearImpersonationCookie();
    return normalizeCurrentUser(authenticatedUser);
  }

  if (requestTenant) {
    if (targetUser.tenantId !== requestTenant.id || requestTenant.status === "SUSPENDED") {
      await clearImpersonationCookie();
      return normalizeCurrentUser(authenticatedUser);
    }
  }

  return {
    ...normalizeCurrentUser(targetUser),
    impersonation: {
      isActive: true,
      adminUserId: authenticatedUser.id,
      adminEmail: authenticatedUser.email,
      adminName: `${authenticatedUser.firstName} ${authenticatedUser.lastName}`.trim(),
      targetUserId: targetUser.id,
      targetEmail: targetUser.email,
    },
  } as CurrentUser;
}

export async function requireAdminUser(nextPath = "/admin"): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    redirect("/");
  }

  return user;
}

export async function requireAdminOrCoachUser(nextPath = "/admin"): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (user.role !== "ADMIN" && user.role !== "COACH" && user.role !== "SUPERADMIN") {
    redirect("/");
  }

  return user;
}

export async function startImpersonation(adminUserId: string, targetUserId: string, targetTenantId?: string | null) {
  await setImpersonationCookie({
    adminUserId,
    targetUserId,
    targetTenantId: targetTenantId ?? null,
    expiresAt: Date.now() + IMPERSONATION_MAX_AGE * 1000,
  });
}

export async function stopImpersonation() {
  await clearImpersonationCookie();
}

export async function listUserSessions(userId: string): Promise<UserSessionDevice[]> {
  const currentToken = await getSessionCookie();
  const currentHashedToken = currentToken ? hashToken(currentToken) : null;

  const sessions = await db.authSession.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    userAgent: session.userAgent ?? null,
    ipAddress: session.ipAddress ?? null,
    isCurrent: currentHashedToken === session.token,
    deviceLabel: getDeviceLabel(session.userAgent),
  }));
}

export async function revokeSessionById(userId: string, sessionId: string) {
  return db.authSession.deleteMany({
    where: {
      id: sessionId,
      userId,
    },
  });
}

export async function revokeOtherSessions(userId: string) {
  const currentToken = await getSessionCookie();
  const currentHashedToken = currentToken ? hashToken(currentToken) : null;

  return db.authSession.deleteMany({
    where: {
      userId,
      ...(currentHashedToken ? { token: { not: currentHashedToken } } : {}),
    },
  });
}

// Logout - delete session
export async function logout() {
  const token = await getSessionCookie();
  if (token) {
    const hashedToken = hashToken(token);
    await db.authSession.deleteMany({
      where: { token: hashedToken },
    });
  }
  await clearImpersonationCookie();
  await clearSessionCookie();
}

// Create audit log
export async function createAuditLog(
  action: string,
  userId: string | null,
  metadata?: Record<string, unknown>,
  ipAddress?: string,
  tenantId?: string | null
) {
  await db.auditLog.create({
    data: {
      action,
      userId,
      tenantId: tenantId ?? null,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      ipAddress,
    },
  });
}
