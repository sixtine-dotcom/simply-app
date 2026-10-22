import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContentPlannerWorkspace } from "./workspace";

export default async function ContentPlannerPage() {
  const user = await requireAdminUser("/admin/content");
  const connection = await db.calendarConnection.findFirst({
    where: { userId: user.id, provider: "google", syncEnabled: true },
    select: { email: true, scope: true },
  });
  const configured = Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  );
  let integrations: Array<{ provider: string; accountName: string | null }> = [];
  try {
    integrations = await db.integrationConnection.findMany({
      where: { userId: user.id, provider: { in: ["canva", "meta", "instagram", "tiktok"] } },
      select: { provider: true, accountName: true },
    });
  } catch (error) {
    // Keeps the local planner available until the additive integration migration is deployed.
    console.warn("Content integrations are not migrated yet", error);
  }
  const canva = integrations.find((item) => item.provider === "canva");
  const meta = integrations.find((item) => item.provider === "meta");
  const instagram = integrations.find((item) => item.provider === "instagram");
  const tiktok = integrations.find((item) => item.provider === "tiktok");

  return (
    // Compact: the whole week fits on a small laptop screen without scrolling.
    <div className="p-3 md:p-4">
      <div className="mx-auto max-w-7xl space-y-3">
        <ContentPlannerWorkspace
          googleConfigured={configured}
          googleConnected={Boolean(connection)}
          googleEmail={connection?.email || null}
          hasDriveReadScope={Boolean(connection?.scope?.includes("drive.readonly"))}
          canvaConfigured={Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET)}
          canvaConnected={Boolean(canva)}
          metaConfigured={Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_LOGIN_CONFIG_ID)}
          metaConnected={Boolean(meta)}
          metaAccountName={meta?.accountName || null}
          instagramConfigured={Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET)}
          instagramConnected={Boolean(instagram)}
          instagramAccountName={instagram?.accountName || null}
          tiktokConfigured={Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET)}
          tiktokConnected={Boolean(tiktok)}
          tiktokAccountName={tiktok?.accountName || null}
        />
      </div>
    </div>
  );
}
