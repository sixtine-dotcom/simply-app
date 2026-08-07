import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findOpenFoodFactsFoodByBarcode } from "@/lib/open-food-facts";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const barcode = request.nextUrl.searchParams.get("barcode")?.trim();
    const region = request.nextUrl.searchParams.get("region") || "BE";
    const language = request.nextUrl.searchParams.get("language") || "nl";

    if (!barcode) {
      return NextResponse.json({ error: "Barcode ontbreekt" }, { status: 400 });
    }

    const food = await findOpenFoodFactsFoodByBarcode(barcode, {
      region,
      language,
    });

    return NextResponse.json({ food });
  } catch (error) {
    console.error("Food barcode lookup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Barcode lookup mislukt" },
      { status: 500 }
    );
  }
}
