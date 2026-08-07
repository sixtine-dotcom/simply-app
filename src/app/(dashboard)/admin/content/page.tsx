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
      where: { userId: user.id, provider: { in: ["canva", "meta", "instagram"] } },
      select: { provider: true, accountName: true },
    });
  } catch (error) {
    // Keeps the local planner available until the additive integration migration is deployed.
    console.warn("Content integrations are not migrated yet", error);
  }
  const canva = integrations.find((item) => item.provider === "canva");
  const meta = integrations.find((item) => item.provider === "meta");
  const instagram = integrations.find((item) => item.provider === "instagram");

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="app-halo overflow-hidden rounded-[34px] border border-white/70 bg-white/85 p-6 md:p-8">
          <p className="app-kicker">Content Planner</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Agenda</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Plan een video uit Google Drive in op een of meerdere data, geef elke post een hoek en kleur, en zie in één oogopslag wat er klaarstaat.
          </p>
        </section>
        <ContentPlannerWorkspace
          googleConfigured={configured}
          googleConnected={Boolean(connection)}
          googleEmail={connection?.email || null}
          hasDriveReadScope={Boolean(connection?.scope?.includes("drive.readonly"))}
          canvaConfigured={Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET)}
          canvaConnected={Boolean(canva)}
          metaConfigured={Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET)}
          metaConnected={Boolean(meta)}
          metaAccountName={meta?.accountName || null}
          instagramConfigured={Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET)}
          instagramConnected={Boolean(instagram)}
          instagramAccountName={instagram?.accountName || null}
        />
      </div>
    </div>
  );
}
