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

const SYSTEM_PROMPT = `Je bent SIX, de vriendelijke FAQ-assistent van Simply in Balance.
Je voert een natuurlijk gesprek, maar je inhoudelijke kennis is strikt beperkt tot de meegegeven, door Sixtine goedgekeurde kennisbronnen.

Richtlijnen:
- Antwoord altijd in het Nederlands (tenzij de gebruiker een andere taal gebruikt)
- Wees warm, persoonlijk en beknopt; gebruik de voornaam van de klant op een natuurlijke manier
- Herformuleer de bron zodat het antwoord past bij de vraag, maar voeg geen nieuw feit, advies, diagnose of conclusie toe
- Gebruik uitsluitend informatie die letterlijk of ondubbelzinnig in de kennisbronnen staat
- Noem de bronnen, brontitels of het bestaan van een kennisbank niet aan de klant
- Combineer bronnen alleen wanneer ze elkaar niet tegenspreken
- Bij twijfel: geef geen inhoudelijk antwoord en verwijs naar Sixtine en de community
- Bij medische vragen: verwijs altijd door naar Sixtine en indien passend naar een arts of zorgverlener
- Geef geen medische diagnoses
- Geef geen behandelplan voor ziektebeelden, medicatie, zwangerschap of eetstoornissen; verwijs dan naar de coach of arts
- Houd antwoorden beknopt maar volledig (maximaal 180 woorden)
- Gebruik af en toe een emoji voor warmte 😊
- Doe nooit alsof Sixtine de vraag persoonlijk heeft gelezen wanneer dat niet zo is`;

const STOP_WORDS = new Set([
  "aan", "als", "bij", "dat", "deze", "die", "dit", "een", "en", "heb", "het", "hoe",
  "ik", "in", "is", "kan", "maar", "met", "mijn", "nog", "of", "om", "ook", "op", "te",
  "van", "voor", "waar", "wat", "wel", "wil", "zijn", "zou", "jij", "jullie", "er", "dan",
]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulWords(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

export type QuestionRisk = "medical" | "personal" | null;

export function classifyQuestionRisk(question: string): QuestionRisk {
  const normalized = normalizeText(question);
  const medicalPatterns = [
    /\b(zwanger|zwangerschap|medicatie|medicijn|diagnose|eetstoornis|anorexia|boulimia)\b/,
    /\b(bloedverlies|flauwvallen|benauwd|borstpijn|hevige pijn|spoed|urgent)\b/,
    /\b(insuline|schildkliermedicatie|antidepressiva|antibiotica)\b/,
  ];
  if (medicalPatterns.some((pattern) => pattern.test(normalized))) return "medical";

  const personalPatterns = [
    /\b(mijn bloedwaarden|mijn uitslag|mijn arts|mijn medicatie|mijn diagnose)\b/,
    /\b(hoeveel moet ik persoonlijk|specifiek voor mij|persoonlijk schema)\b/,
  ];
  return personalPatterns.some((pattern) => pattern.test(normalized)) ? "personal" : null;
}

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

    // Bewust deterministische matching: zonder voldoende overeenkomst krijgt de AI geen bron.
    const normalizedQuery = normalizeText(query);
    const queryWords = meaningfulWords(query);
    if (queryWords.length === 0) return [];

    const scored = sources.map((source) => {
      const title = normalizeText(source.title);
      const text = normalizeText(`${source.title} ${source.content} ${source.tags.join(" ")}`);
      const sourceWords = new Set(meaningfulWords(text));
      let score = 0;
      for (const word of queryWords) {
        if (sourceWords.has(word)) score += title.includes(word) ? 2 : 1;
      }
      if (normalizedQuery.length >= 8 && text.includes(normalizedQuery)) score += 6;
      const possibleScore = Math.max(queryWords.length * 2, 2);
      const confidence = Math.min(1, score / possibleScore);
      return { source, score, confidence };
    });

    return scored
      .filter((item) => item.score >= 2 && item.confidence >= 0.34)
      .sort((a, b) => b.confidence - a.confidence || b.score - a.score)
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
  firstName: string;
  tenantId?: string | null;
}) {
  if (!isAiConfigured()) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const openai = getClient();
  const { conversationId, userMessage, firstName, tenantId } = params;

  // Get conversation history
  const history = await db.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  // Get relevant knowledge sources
  const sources = await getRelevantSources(userMessage, tenantId);

  if (sources.length === 0) throw new Error("AI_NO_SOURCE");

  const systemWithContext = `${SYSTEM_PROMPT}\n\nDe voornaam van de klant is: ${firstName}.\n\n=== INTERN GOEDGEKEURDE KENNIS ===\n${sources
    .map((s) => `[${s.title}]\n${s.content}`)
    .join("\n\n")}`;

  const input = [
    ...history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const stream = openai.responses.stream({
    model: getChatModel(),
    max_output_tokens: 450,
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
