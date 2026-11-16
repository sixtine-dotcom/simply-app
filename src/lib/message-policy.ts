// Participants communicate privately with the team; peer conversations belong in the community.
export const MESSAGE_TEAM_ROLES = ["SUPERADMIN", "ADMIN", "STAFF", "COACH", "SUPPORT"] as const;

export type MessagingUser = {
  id: string;
  role: string;
  tenantId: string | null;
  deletedAt?: Date | null;
};

export function isMessagingTeamRole(role: string) {
  return MESSAGE_TEAM_ROLES.some((teamRole) => teamRole === role);
}

export function canDirectMessage(first: MessagingUser, second: MessagingUser) {
  return first.id !== second.id && !first.deletedAt && !second.deletedAt &&
    first.tenantId === second.tenantId &&
    (isMessagingTeamRole(first.role) || isMessagingTeamRole(second.role));
}

export class MessageAccessError extends Error {
  constructor() {
    super("Privéberichten zijn alleen mogelijk met het beheerteam of je coach");
    this.name = "MessageAccessError";
  }
}
