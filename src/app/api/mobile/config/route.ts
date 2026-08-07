import { NextResponse } from "next/server";
import { getPublicUrl, publicAppConfig } from "@/lib/public-app";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    app: {
      name: publicAppConfig.name,
      locale: publicAppConfig.locale,
      url: getPublicUrl("/"),
      androidPackage: publicAppConfig.appId.android,
      iosBundleId: publicAppConfig.appId.ios,
    },
    links: {
      privacy: getPublicUrl("/privacy"),
      support: getPublicUrl("/support"),
      terms: getPublicUrl("/terms"),
      install: getPublicUrl("/app"),
    },
    capabilities: {
      desktop: true,
      pwa: true,
      nativeWrapper: true,
      authentication: "cookie-session",
    },
  });
}
