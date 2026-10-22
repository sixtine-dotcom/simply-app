import { db } from "@/lib/db";
import { classifyQuestionRisk } from "@/lib/ai";

function anonymize(value: string, names: string[] = []) {
  let cleaned = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[e-mailadres verwijderd]")
    .replace(/(?:\+?\d[\s().-]?){9,}/g, "[telefoonnummer verwijderd]")
    .replace(/https?:\/\/\S+/gi, "[link verwijderd]");

  for (const name of names.filter((item) => item.trim().length >= 2)) {
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegExp(name.trim())}\\b`, "gi"), "de klant");
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function syncCommunityCommentToKnowledge(params: {
  commentId: string;
  postId: string;
  authorRole: string;
  tenantId?: string | null;
}) {
  if (!new Set(["ADMIN", "SUPERADMIN"]).has(params.authorRole)) {
    return { stored: false, reason: "not_admin" } as const;
  }

  const [comment, post] = await Promise.all([
    db.comment.findUnique({
      where: { id: params.commentId },
      include: { author: { select: { firstName: true, lastName: true } } },
    }),
    db.post.findUnique({
      where: { id: params.postId },
      include: { author: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  if (!comment || !post) return { stored: false, reason: "not_found" } as const;

  const names = [post.author.firstName, post.author.lastName, comment.author.firstName, comment.author.lastName];
  const question = anonymize([post.title, post.content].filter(Boolean).join(" — "), names);
  const answer = anonymize(comment.content, names);

  if (question.length < 12 || answer.length < 12) {
    return { stored: false, reason: "too_short" } as const;
  }

  // Persoonlijke/medische antwoorden worden nooit automatisch algemene FAQ-kennis.
  if (classifyQuestionRisk(`${question} ${answer}`)) {
    return { stored: false, reason: "sensitive" } as const;
  }

  const sourceRef = `community-comment:${comment.id}`;
  const data = {
    tenantId: params.tenantId ?? null,
    title: `Communityvraag: ${(post.title || question).slice(0, 100)}`,
    content: `Vraag:\n${question}\n\nAntwoord van Sixtine:\n${answer}`,
    type: "community_qa",
    sourceRef,
    tags: ["community", "vraag", "antwoord"],
    isActive: true,
  };

  const existing = await db.aiSource.findFirst({
    where: { sourceRef, tenantId: params.tenantId ?? null },
  });

  if (existing) {
    await db.aiSource.update({ where: { id: existing.id }, data });
  } else {
    await db.aiSource.create({ data });
  }

  return { stored: true } as const;
}
