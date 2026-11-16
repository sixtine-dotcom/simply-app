import { NextResponse } from "next/server";

/** Public self-registration is permanently disabled, including tenant creation. */
export async function POST() {
  return NextResponse.json({
    error: "Je krijgt toegang na aankoop van een cursus of traject. Gebruik de activatielink uit je e-mail.",
  }, { status: 403 });
}
