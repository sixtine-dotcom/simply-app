import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserSpaces } from "@/lib/community";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const spaces = await getUserSpaces(user.id);
  return NextResponse.json(
    spaces.map((space) => ({
      id: space.id,
      name: space.name,
      slug: space.slug,
      groupLabel: space.groupLabel,
      isHostOnly: space.isHostOnly,
      postCount: space.postCount,
    }))
  );
}
