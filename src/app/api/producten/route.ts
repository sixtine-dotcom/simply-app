import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** GET: categories met items + favoriete producten – voor iedereen (ingelogd) */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }
    const [categories, favorites] = await Promise.all([
      db.knowledgeCategory.findMany({
        orderBy: { position: "asc" },
        include: {
          items: {
            orderBy: { position: "asc" },
          },
        },
      }),
      db.favoriteProduct.findMany({
        orderBy: { position: "asc" },
      }),
    ]);

    return NextResponse.json({ categories, favorites });
  } catch (error) {
    console.error("Producten fetch error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
