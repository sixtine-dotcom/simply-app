/** Only server-created invitations can activate an existing app account. */
const INVITATION_SOURCES = new Set([
  "shopify_paid", "admin_user_create", "admin_user_detail", "admin_user_csv_import",
  "admin_users_bulk_invite", "admin_onboarding", "cron_onboarding_follow_up", "superadmin_tenant_follow_up",
]);

export function isTrustedRegistrationInvitation(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const data = metadata as Record<string, unknown>;
  return data.accountType === "client" && typeof data.source === "string" && INVITATION_SOURCES.has(data.source);
}
