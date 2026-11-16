export const REACTION_EMOJIS = ["❤️", "👍", "😂", "😍", "🙌", "👏", "🔥", "🌿", "💪", "🙏", "😮", "😢"] as const;

export const LIKE_EMOJI = "❤️";

export function isAllowedReaction(emoji: unknown): emoji is string {
  return typeof emoji === "string" && (REACTION_EMOJIS as readonly string[]).includes(emoji);
}
