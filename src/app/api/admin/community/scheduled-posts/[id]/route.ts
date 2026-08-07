import { NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { cancelScheduledCommunityPost } from "@/lib/scheduled-community-posts";

async function requireAdminApi() {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Niet ingelogd" }, { status: 401 }) };
  }
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return { response: NextResponse.json({ error: "Geen toegang" }, { status: 403 }) };
  }
  return { user };
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const user = auth.user;
    const post = await cancelScheduledCommunityPost(params.id);

    await createAuditLog("community_post.schedule_cancelled", user.id, {
      scheduledPostId: params.id,
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Scheduled post cancel error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon geplande post niet annuleren" },
      { status: 500 }
    );
  }
}
