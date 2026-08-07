import { db } from "@/lib/db";

type QuestionSource = {
  id: string;
  content: string;
  createdAt: Date;
  authorName: string;
  authorRole: string;
  sourceType: "post" | "comment";
  postId: string;
};

type InsightQuestion = {
  id: string;
  text: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
  sourceType: "post" | "comment";
  postId: string;
  href: string;
};

export type CommunityQuestionInsights = {
  space: {
    id: string;
    name: string;
    slug: string;
  };
  totals: {
    postsScanned: number;
    commentsScanned: number;
    detectedQuestions: number;
    groupedTopics: number;
  };
  generatedAt: string;
  topics: Array<{
    key: string;
    label: string;
    keywords: string[];
    questionCount: number;
    sampleQuestion: string;
    questions: InsightQuestion[];
  }>;
};

const STOP_WORDS = new Set([
  "a",
  "aan",
  "al",
  "als",
  "and",
  "ben",
  "bij",
  "dat",
  "de",
  "den",
  "der",
  "dit",
  "do",
  "een",
  "en",
  "er",
  "for",
  "ga",
  "gaat",
  "heb",
  "heeft",
  "het",
  "hoe",
  "i",
  "ik",
  "in",
  "is",
  "je",
  "kan",
  "kun",
  "maar",
  "met",
  "mijn",
  "naar",
  "niet",
  "of",
  "om",
  "ons",
  "op",
  "te",
  "the",
  "to",
  "van",
  "voor",
  "wat",
  "we",
  "wel",
  "waar",
  "wie",
  "why",
  "wil",
  "wordt",
  "you",
  "your",
  "zijn",
  "zo",
]);

const QUESTION_HINTS = [
  "hoe",
  "wat",
  "waar",
  "wanneer",
  "waarom",
  "welke",
  "wie",
  "kan",
  "kun",
  "mag",
  "moet",
  "is dit",
  "is er",
  "should",
  "can i",
  "how",
  "what",
  "why",
  "when",
  "where",
];

function splitPossibleQuestions(content: string) {
  return content
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[?!])\s+/))
    .map((part) => part.trim())
    .filter(Boolean);
}

function looksLikeQuestion(text: string) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("?")) return true;
  return QUESTION_HINTS.some((hint) => normalized.startsWith(hint + " ") || normalized.includes(` ${hint} `));
}

function normalizeWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\s-]/gi, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function buildTopicKey(text: string) {
  const words = normalizeWords(text);
  const topWords = Array.from(new Set(words)).slice(0, 3);
  return topWords.length > 0 ? topWords.join(" | ") : "algemene vragen";
}

function buildTopicLabel(keywords: string[]) {
  if (keywords.length === 0) return "Algemene vragen";
  return keywords.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" / ");
}

function toQuestion(source: QuestionSource): InsightQuestion[] {
  return splitPossibleQuestions(source.content)
    .filter(looksLikeQuestion)
    .map((text, index) => ({
      id: `${source.sourceType}-${source.id}-${index}`,
      text,
      createdAt: source.createdAt.toISOString(),
      authorName: source.authorName,
      authorRole: source.authorRole,
      sourceType: source.sourceType,
      postId: source.postId,
      href: `/community/post/${source.postId}`,
    }));
}

export async function getCommunityQuestionInsights(
  spaceId: string
): Promise<CommunityQuestionInsights | null> {
  const space = await db.space.findUnique({
    where: { id: spaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      posts: {
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          comments: {
            orderBy: { createdAt: "desc" },
            include: {
              author: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!space) return null;

  const postSources: QuestionSource[] = space.posts.map((post) => ({
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    authorName: `${post.author.firstName} ${post.author.lastName}`.trim() || "Onbekend",
    authorRole: post.author.role,
    sourceType: "post",
    postId: post.id,
  }));

  const commentSources: QuestionSource[] = space.posts.flatMap((post) =>
    post.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      authorName: `${comment.author.firstName} ${comment.author.lastName}`.trim() || "Onbekend",
      authorRole: comment.author.role,
      sourceType: "comment" as const,
      postId: post.id,
    }))
  );

  const questions = [...postSources, ...commentSources].flatMap(toQuestion);
  const grouped = new Map<
    string,
    {
      keywords: string[];
      questions: InsightQuestion[];
    }
  >();

  for (const question of questions) {
    const keywords = Array.from(new Set(normalizeWords(question.text))).slice(0, 3);
    const key = buildTopicKey(question.text);
    const existing = grouped.get(key);
    if (existing) {
      existing.questions.push(question);
      existing.keywords = Array.from(new Set([...existing.keywords, ...keywords])).slice(0, 4);
    } else {
      grouped.set(key, {
        keywords,
        questions: [question],
      });
    }
  }

  const topics = Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      label: buildTopicLabel(value.keywords),
      keywords: value.keywords,
      questionCount: value.questions.length,
      sampleQuestion: value.questions[0]?.text || "",
      questions: value.questions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
    .sort((a, b) => b.questionCount - a.questionCount);

  return {
    space: {
      id: space.id,
      name: space.name,
      slug: space.slug,
    },
    totals: {
      postsScanned: postSources.length,
      commentsScanned: commentSources.length,
      detectedQuestions: questions.length,
      groupedTopics: topics.length,
    },
    generatedAt: new Date().toISOString(),
    topics,
  };
}

export function exportCommunityQuestionInsightsAsMarkdown(
  insights: CommunityQuestionInsights
) {
  const lines = [
    `# Vraaganalyse - ${insights.space.name}`,
    "",
    `Gegenereerd op: ${new Date(insights.generatedAt).toLocaleString("nl-BE")}`,
    `Posts gescand: ${insights.totals.postsScanned}`,
    `Reacties gescand: ${insights.totals.commentsScanned}`,
    `Gedetecteerde vragen: ${insights.totals.detectedQuestions}`,
    `Onderwerpen: ${insights.totals.groupedTopics}`,
    "",
  ];

  for (const topic of insights.topics) {
    lines.push(`## ${topic.label} (${topic.questionCount})`);
    lines.push(`Keywords: ${topic.keywords.join(", ") || "algemeen"}`);
    lines.push("");
    for (const question of topic.questions) {
      lines.push(
        `- ${question.text} (${question.authorName}, ${new Date(question.createdAt).toLocaleDateString("nl-BE")}, ${question.sourceType})`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportCommunityQuestionInsightsAsCsv(
  insights: CommunityQuestionInsights
) {
  const rows = [
    ["topic", "keywords", "question", "author", "role", "source_type", "created_at", "post_url"],
  ];

  for (const topic of insights.topics) {
    for (const question of topic.questions) {
      rows.push([
        topic.label,
        topic.keywords.join(" | "),
        question.text,
        question.authorName,
        question.authorRole,
        question.sourceType,
        question.createdAt,
        question.href,
      ]);
    }
  }

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll(`"`, `""`)}"`)
        .join(",")
    )
    .join("\n");
}
