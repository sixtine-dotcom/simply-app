import { db } from "./db";
import { isTrustedRegistrationInvitation } from "./registration-access";

/** Customers need course access or an explicit staff invitation, never just a shop contact record. */
export async function hasProvisionedAccountAccess(user: { id: string; email: string; role: string; deletedAt?: Date | null }) {
  if (user.deletedAt) return false;
  if (user.role !== "CLIENT") return true;
  const enrollment = await db.enrollment.findFirst({ where: { userId: user.id }, select: { id: true } });
  if (enrollment) return true;
  const invitations = await db.verificationToken.findMany({ where: { email: user.email, type: "registration" }, select: { metadata: true } });
  if (invitations.some(({ metadata }) => isTrustedRegistrationInvitation(metadata) && (metadata as Record<string, unknown>).source !== "shopify_paid")) return true;
  // Also preserve explicit staff-created test/customer accounts whose original
  // invitation was rotated. Public registration never supplies targetUserId.
  const staffInvitation = await db.auditLog.findFirst({
    where: { action: { in: ["user.created", "user.invited"] }, metadata: { path: ["targetUserId"], equals: user.id } },
    select: { id: true },
  });
  return Boolean(staffInvitation);
}
