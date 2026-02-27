import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { getOrCreateConversation, getUserConversations } from "@/lib/messages";

const createConversationSchema = z.object({
  userId: z.string().min(1, "Gebruiker ID is verplicht"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const data = createConversationSchema.parse(body);

    if (data.userId === user.id) {
      return NextResponse.json(
        { error: "Je kunt geen gesprek met jezelf starten" },
        { status: 400 }
      );
    }

    const conversationId = await getOrCreateConversation(user.id, data.userId);

    return NextResponse.json({ conversationId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const conversations = await getUserConversations(user.id);

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
