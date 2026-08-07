import OpenAI from "openai";
import { db } from "@/lib/db";

let client: OpenAI | null = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  client = new OpenAI({ apiKey });
  return client;
}

export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getChatModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

const SYSTEM_PROMPT = `Je bent SIX, een vriendelijke en deskundige AI-assistent voor het Simply platform.
Je helpt leden met vragen over voeding, gezondheid, beweging, hormonen, cyclusTracking en het Simply programma.

Richtlijnen:
- Antwoord altijd in het Nederlands (tenzij de gebruiker een andere taal gebruikt)
- Wees warm, aanmoedigend en persoonlijk
- Baseer je antwoorden op de kennisbronnen die je hebt gekregen
- Bij medische vragen: verwijs altijd door naar een arts of zorgverlener
- Geef geen medische diagnoses
- Geef geen behandelplan voor ziektebeelden, medicatie, zwangerschap of eetstoornissen; verwijs dan naar de coach of arts
- Houd antwoorden beknopt maar volledig (max 300 woorden tenzij nodig)
- Gebruik af en toe een emoji voor warmte 😊
- Als je iets niet weet, zeg dat eerlijk en verwijs door naar de coach`;

export async function getRelevantSources(query: string, tenantId?: string | null) {
  try {
    const sources = await db.aiSource.findMany({
      where: {
        isActive: true,
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (sources.length === 0) return [];

    // Simple keyword matching for relevance (no vector DB needed for MVP)
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 3);

    const scored = sources.map((source) => {
      const text = `${source.title} ${source.content}`.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (text.includes(word)) score++;
      }
      return { source, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.source);
  } catch {
    return [];
  }
}

export async function syncCourseKnowledgeSources(tenantId?: string | null) {
  const courses = await db.course.findMany({
    orderBy: { title: "asc" },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              content: true,
              extraContent: true,
              checklistTitle: true,
              checklistItems: true,
            },
          },
        },
      },
    },
  });

  let upserted = 0;
  let skipped = 0;

  for (const course of courses) {
    for (const courseModule of course.modules) {
      for (const lesson of courseModule.lessons) {
        const contentBlocks = [
          lesson.content,
          lesson.extraContent,
          Array.isArray(lesson.checklistItems) && lesson.checklistItems.length > 0
            ? `${lesson.checklistTitle || "Opdrachten"}:\n${lesson.checklistItems
                .filter(
                  (item: unknown): item is string =>
                    typeof item === "string" && item.trim().length > 0
                )
                .map((item: string) => `- ${item.trim()}`)
                .join("\n")}`
            : null,
        ].filter((block): block is string => Boolean(block?.trim()));

        if (contentBlocks.length === 0) {
          skipped++;
          continue;
        }

        const content = [
          `Cursus: ${course.title}`,
          `Module: ${courseModule.title}`,
          `Les: ${lesson.title}`,
          "",
          ...contentBlocks,
        ].join("\n");

        const sourceRef = `lesson:${lesson.id}`;
        const sourceData = {
          tenantId: tenantId ?? null,
          title: `${course.title} - ${lesson.title}`,
          content,
          type: "course",
          sourceRef,
          tags: ["cursus", course.slug, courseModule.title, lesson.title]
            .map((tag) => tag.toLowerCase().trim())
            .filter(Boolean),
          isActive: true,
        };
        const existingSource = await db.aiSource.findFirst({
          where: {
            sourceRef,
            tenantId: tenantId ?? null,
          },
        });

        if (existingSource) {
          await db.aiSource.update({
            where: { id: existingSource.id },
            data: sourceData,
          });
        } else {
          await db.aiSource.create({ data: sourceData });
        }

        upserted++;
      }
    }
  }

  return { courses: courses.length, upserted, skipped };
}

export async function streamAiChat(params: {
  conversationId: string;
  userMessage: string;
  tenantId?: string | null;
}) {
  if (!isAiConfigured()) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const openai = getClient();
  const { conversationId, userMessage, tenantId } = params;

  // Get conversation history
  const history = await db.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  // Get relevant knowledge sources
  const sources = await getRelevantSources(userMessage, tenantId);

  const systemWithContext =
    sources.length > 0
      ? `${SYSTEM_PROMPT}\n\n=== KENNISBRONNEN ===\n${sources
          .map((s) => `[${s.title}]\n${s.content}`)
          .join("\n\n")}`
      : SYSTEM_PROMPT;

  const input = [
    ...history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const stream = openai.responses.stream({
    model: getChatModel(),
    max_output_tokens: 1024,
    instructions: systemWithContext,
    input,
  });

  return { stream, sourceIds: sources.map((s) => s.id) };
}

export async function getOrCreateConversation(userId: string) {
  // Get the most recent conversation from the last 24h, or create a new one
  const recent = await db.aiConversation.findFirst({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (recent) return recent;

  return db.aiConversation.create({
    data: { userId },
  });
}

export async function summarizeCoachingTranscript(transcript: string) {
  const cleanedTranscript = transcript.trim();
  if (!cleanedTranscript) return null;

  try {
    const openai = getClient();
    const response = await openai.responses.create({
      model: getChatModel(),
      max_output_tokens: 700,
      instructions:
        "Je maakt korte Nederlandstalige samenvattingen van groepscoachings voor cursisten. Benoem hoofdthema's, concrete inzichten en actiepunten. Laat gevoelige persoonlijke details weg.",
      input: [
        {
          role: "user",
          content: `Vat dit coachingtranscript samen voor deelnemers:\n\n${cleanedTranscript.slice(0, 50000)}`,
        },
      ],
    });

    return response.output_text?.trim() || null;
  } catch (error) {
    console.error("Coaching transcript summary failed:", error);
    return null;
  }
}
