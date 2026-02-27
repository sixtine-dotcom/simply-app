import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getConversationMessages, sendMessage } from "@/lib/messages";

const sendMessageSchema = z.object({
  content: z.string().min(1, "Bericht is verplicht").max(5000),
  voiceUrl: z.string().optional(),
  voiceDuration: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const data = sendMessageSchema.parse(body);

    const message = await sendMessage(
      conversationId,
      user.id,
      data.content,
      data.voiceUrl,
      data.voiceDuration
    );

    return NextResponse.json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Geen toegang tot dit gesprek") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");

    const result = await getConversationMessages(conversationId, user.id, limit, cursor);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Geen toegang tot dit gesprek") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
