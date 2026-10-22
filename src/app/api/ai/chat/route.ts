import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  classifyQuestionRisk,
  getRelevantSources,
  isAiConfigured,
  streamAiChat,
  getOrCreateConversation,
} from "@/lib/ai";

function immediateSse(payload: Record<string, unknown>) {
  const donePayload = {
    done: true,
    conversationId: payload.conversationId,
    messageId: payload.messageId,
    escalated: payload.escalated,
    communityHref: payload.communityHref,
  };
  return new Response(`data: ${JSON.stringify(payload)}\n\ndata: ${JSON.stringify(donePayload)}\n\n`, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, conversationId: existingConversationId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.trim().length > 2000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    // Get or create conversation
    let conversation;
    if (existingConversationId) {
      conversation = await db.aiConversation.findFirst({
        where: { id: existingConversationId, userId: user.id },
      });
    }
    if (!conversation) {
      conversation = await getOrCreateConversation(user.id);
    }

    // Save user message
    await db.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message.trim(),
        sourceIds: [],
      },
    });

    const cleanMessage = message.trim();
    const risk = classifyQuestionRisk(cleanMessage);
    const relevantSources = risk ? [] : await getRelevantSources(cleanMessage, user.tenantId);

    if (risk || relevantSources.length === 0) {
      const reason = risk || "no_source";
      const priority = risk === "medical" ? "high" : "normal";
      const responseText = risk
        ? `Dag ${user.firstName}, bedankt om dit te delen. Dit is een persoonlijke of medische vraag die Sixtine best zelf bekijkt. Ik heb je vraag veilig voor haar klaargezet. Bij dringende of ernstige klachten neem je best meteen contact op met een arts.`
        : `Dag ${user.firstName}, bedankt voor je vraag. Sixtine heeft deze vraag nog niet beantwoord in mijn kennisbank. Stel ze gerust in de community, zodat zij persoonlijk kan antwoorden en andere deelnemers er ook iets aan hebben.`;

      await db.aiEscalation.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          conversationId: conversation.id,
          question: cleanMessage,
          reason,
          priority,
        },
      });

      const assistantMessage = await db.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: responseText,
          sourceIds: [],
        },
      });

      return immediateSse({
        text: responseText,
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        escalated: reason,
        communityHref: risk ? null : "/community",
      });
    }

    if (!isAiConfigured()) {
      return NextResponse.json(
        { error: "De FAQ-chat is klaar, maar de API-sleutel voor natuurlijke formulering ontbreekt nog." },
        { status: 503 }
      );
    }

    // Stream AI response
    const { stream, sourceIds } = await streamAiChat({
      conversationId: conversation.id,
      userMessage: cleanMessage,
      firstName: user.firstName,
      tenantId: user.tenantId,
    });

    // Collect the full response for saving to DB
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === "response.output_text.delta") {
              const text = chunk.delta;
              fullResponse += text;
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ text, conversationId: conversation.id })}\n\n`
                )
              );
            }
          }

          // Save assistant message after stream completes
          const assistantMessage = await db.aiMessage.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: fullResponse,
              sourceIds,
            },
          });

          // Update conversation timestamp
          await db.aiConversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                done: true,
                conversationId: conversation.id,
                messageId: assistantMessage.id,
              })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          console.error("AI stream error:", err);
          const message =
            err instanceof Error && err.message === "AI_NOT_CONFIGURED"
              ? "SIX AI is nog niet geconfigureerd. Voeg OPENAI_API_KEY toe aan de environment variables."
              : "Er is een fout opgetreden";
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ error: message })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("AI chat error:", err);
    if (err instanceof Error && err.message === "AI_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error:
            "SIX AI is nog niet geconfigureerd. Voeg OPENAI_API_KEY toe aan de environment variables.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (conversationId) {
      const conversation = await db.aiConversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!conversation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(conversation);
    }

    // Return recent conversations
    const conversations = await db.aiConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(conversations);
  } catch (err) {
    console.error("AI chat GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
