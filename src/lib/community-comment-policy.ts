export const COMMENTS_CLOSED_MESSAGE = "Reacties zijn uitgeschakeld voor dit bericht.";

export function canManagePostComments(role?: string | null) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export class CommentsClosedError extends Error {
  constructor() { super(COMMENTS_CLOSED_MESSAGE); this.name = "CommentsClosedError"; }
}
