import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { voteOnPoll } from "@/lib/community";

const voteSchema = z.object({
  optionIndex: z.number().int().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = voteSchema.parse(await request.json());
    const post = await voteOnPoll(postId, user.id, body.optionIndex);

    if (!post) {
      return NextResponse.json({ error: "Post niet gevonden" }, { status: 404 });
    }

    await createAuditLog("post.poll_voted", user.id, {
      postId,
      optionIndex: body.optionIndex,
    });

    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
