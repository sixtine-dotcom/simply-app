import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCourseWithProgress } from "@/lib/courses";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const course = await getCourseWithProgress(slug, user.id);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.progressPercentage < 100) {
      return NextResponse.json(
        { error: "Course not completed yet" },
        { status: 403 }
      );
    }

    const completionDate = new Intl.DateTimeFormat("nl-BE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

    const fullName = `${user.firstName} ${user.lastName}`;

    // Generate SVG certificate
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="636" viewBox="0 0 900 636">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f7f4ed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#fff8f0;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2D5A27;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4a8c42;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="900" height="636" fill="url(#bg)"/>

  <!-- Decorative border -->
  <rect x="24" y="24" width="852" height="588" fill="none" stroke="#2D5A27" stroke-width="1.5" rx="16"/>
  <rect x="32" y="32" width="836" height="572" fill="none" stroke="#2D5A27" stroke-width="0.5" rx="12" stroke-dasharray="6,4"/>

  <!-- Top accent bar -->
  <rect x="24" y="24" width="852" height="6" fill="url(#accent)" rx="3"/>

  <!-- Corner ornaments -->
  <circle cx="60" cy="60" r="8" fill="#2D5A27" opacity="0.3"/>
  <circle cx="840" cy="60" r="8" fill="#2D5A27" opacity="0.3"/>
  <circle cx="60" cy="576" r="8" fill="#2D5A27" opacity="0.3"/>
  <circle cx="840" cy="576" r="8" fill="#2D5A27" opacity="0.3"/>

  <!-- Platform name -->
  <text x="450" y="100" font-family="Georgia, serif" font-size="13" font-weight="400" fill="#2D5A27" text-anchor="middle" letter-spacing="8">SIMPLY</text>

  <!-- Certificate label -->
  <text x="450" y="145" font-family="Georgia, serif" font-size="11" fill="#8a7a6a" text-anchor="middle" letter-spacing="4">CERTIFICAAT VAN VOLTOOIING</text>

  <!-- Divider line -->
  <line x1="320" y1="162" x2="580" y2="162" stroke="#2D5A27" stroke-width="0.8" opacity="0.4"/>

  <!-- "Dit certificeert dat" -->
  <text x="450" y="210" font-family="Georgia, serif" font-size="14" fill="#6b5d4f" text-anchor="middle">Dit certificeert dat</text>

  <!-- Name -->
  <text x="450" y="280" font-family="Georgia, serif" font-size="42" font-weight="400" fill="#1a1a1a" text-anchor="middle">${fullName}</text>

  <!-- Underline for name -->
  <line x1="180" y1="296" x2="720" y2="296" stroke="#2D5A27" stroke-width="1" opacity="0.3"/>

  <!-- "met succes heeft afgerond" -->
  <text x="450" y="340" font-family="Georgia, serif" font-size="14" fill="#6b5d4f" text-anchor="middle">met succes heeft afgerond</text>

  <!-- Course title -->
  <text x="450" y="395" font-family="Georgia, serif" font-size="28" font-weight="600" fill="#2D5A27" text-anchor="middle">${course.title}</text>

  <!-- Date -->
  <text x="450" y="450" font-family="Georgia, serif" font-size="13" fill="#8a7a6a" text-anchor="middle">${completionDate}</text>

  <!-- Bottom decoration -->
  <rect x="380" y="490" width="140" height="1" fill="#2D5A27" opacity="0.2"/>

  <!-- Signature line area -->
  <text x="280" y="540" font-family="Georgia, serif" font-size="11" fill="#8a7a6a" text-anchor="middle">Simply in Balance</text>
  <line x1="180" y1="520" x2="380" y2="520" stroke="#8a7a6a" stroke-width="0.8" opacity="0.5"/>

  <text x="620" y="540" font-family="Georgia, serif" font-size="11" fill="#8a7a6a" text-anchor="middle">${completionDate}</text>
  <line x1="520" y1="520" x2="720" y2="520" stroke="#8a7a6a" stroke-width="0.8" opacity="0.5"/>
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="certificaat-${slug}.svg"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("Certificate error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
