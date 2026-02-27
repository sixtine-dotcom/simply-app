import { db } from "./db";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "simply_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes in ms
const REGISTRATION_LINK_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Hash a token for storage
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Generate a random token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
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
export async function createRegistrationToken(email: string): Promise<string> {
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
      expiresAt: new Date(Date.now() + REGISTRATION_LINK_EXPIRY),
    },
  });

  return token;
}

// Verify a registration token and return email
export async function verifyRegistrationToken(token: string): Promise<{ success: boolean; email?: string; error?: string }> {
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

  return { success: true, email: verificationToken.email };
}

// Mark registration token as used and create user + session
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
  const verificationToken = await db.verificationToken.findUnique({
    where: { token: hashedToken },
  });
  if (!verificationToken) return { success: false, error: "Ongeldige link" };

  const existing = await db.user.findUnique({
    where: { email: result.email },
  });
  if (existing) {
    return { success: false, error: "Dit email adres heeft al een account. Log in." };
  }

  const user = await db.user.create({
    data: {
      email: result.email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || null,
      bio: bio?.trim() || null,
      role: "CLIENT",
    },
  });

  // Mark token as used
  await db.verificationToken.update({
    where: { id: verificationToken.id },
    data: { usedAt: new Date() },
  });

  return { success: true, user };
}

// Verify a magic link token
export async function verifyMagicLink(token: string) {
  const hashedToken = hashToken(token);

  const verificationToken = await db.verificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!verificationToken) {
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
    user,
  };
}

// Create a session for a user
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = generateToken();
  const hashedToken = hashToken(token);

  await db.authSession.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      userAgent,
      ipAddress,
    },
  });

  // Update user's last login
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  return token;
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

// Get current user from session
export async function getCurrentUser() {
  const token = await getSessionCookie();
  if (!token) return null;

  const hashedToken = hashToken(token);
  const session = await db.authSession.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await clearSessionCookie();
    return null;
  }

  return session.user;
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
  await clearSessionCookie();
}

// Create audit log
export async function createAuditLog(
  action: string,
  userId: string | null,
  metadata?: Record<string, unknown>,
  ipAddress?: string
) {
  await db.auditLog.create({
    data: {
      action,
      userId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      ipAddress,
    },
  });
}
