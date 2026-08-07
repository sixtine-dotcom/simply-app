import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN", "COACH"].includes(user.role)) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 3) return NextResponse.json({ suggestions: [] });
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const photonUrl = new URL("https://photon.komoot.io/api/");
    photonUrl.searchParams.set("q", query);
    photonUrl.searchParams.set("limit", "7");
    photonUrl.searchParams.set("bbox", "2.4,49.4,7.3,53.7");
    const photonResponse = await fetch(photonUrl, {
      headers: { "User-Agent": "SimplyApp/1.0 (simplyinbalance.com)" },
      cache: "no-store",
    });
    if (!photonResponse.ok) return NextResponse.json({ suggestions: [] });
    const photonData = await photonResponse.json();
    const seenLabels = new Set<string>();
    const suggestions = (photonData.features || [])
      .filter((feature: { properties?: { countrycode?: string } }) => ["BE", "NL"].includes(feature.properties?.countrycode || ""))
      .map((feature: { properties?: Record<string, string | undefined> }) => {
        const properties = feature.properties || {};
        const streetAddress = [properties.street, properties.housenumber].filter(Boolean).join(" ");
        const locality = [properties.postcode, properties.city || properties.locality].filter(Boolean).join(" ");
        const parts = [properties.name, streetAddress, locality, properties.country].filter(Boolean);
        const label = parts.filter((part, index) => part && parts.indexOf(part) === index).join(", ");
        return { id: `${properties.osm_type || "place"}-${properties.osm_id || label}`, label };
      })
      .filter((item: { label: string }) => {
        if (!item.label || seenLabels.has(item.label)) return false;
        seenLabels.add(item.label);
        return true;
      });
    return NextResponse.json({ suggestions });
  }

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text" },
    body: JSON.stringify({ input: query, includedRegionCodes: ["be", "nl"] }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ suggestions: [] });
  const data = await response.json();
  return NextResponse.json({
    suggestions: (data.suggestions || []).map((item: { placePrediction?: { placeId?: string; text?: { text?: string } } }) => ({
      id: item.placePrediction?.placeId,
      label: item.placePrediction?.text?.text,
    })).filter((item: { id?: string; label?: string }) => item.id && item.label),
  });
}
