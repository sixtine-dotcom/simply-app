import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ScriptsOverview, ScriptItem } from "./scripts-overview";

export const dynamic = "force-dynamic";

export default async function ReelScriptsPage() {
  const user = await requireAdminUser("/admin/content/scripts");
  const tenantId = user.tenantId ?? null;
  const scripts = await db.reelScript.findMany({
    where: { tenantId, createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } },
    orderBy: [{ weekStart: "desc" }, { createdAt: "asc" }],
  });
  const settings = await db.scriptSettings.findFirst({ where: { tenantId }, select: { generateRequestedAt: true, enabled: true, perWeek: true, myStory: true } });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="app-halo overflow-hidden rounded-[34px] border border-white/70 bg-white/85 p-6 md:p-8">
          <p className="app-kicker">Content · Reel Scripts</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Reel Scripts</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Scripts om in de camera te praten: hook, geloofwaardigheid, waarde en call-to-action. Pas ze aan, laat ze herschrijven en vink
            ze af als je ze opgenomen hebt.{" "}
            {settings?.enabled ? `Elke maandag staan er ${settings.perWeek ?? 7} nieuwe klaar.` : "Klik op Maak een week om nieuwe scripts te laten schrijven."}
          </p>
        </section>
        <ScriptsOverview
          items={JSON.parse(JSON.stringify(scripts)) as ScriptItem[]}
          generating={Boolean(settings?.generateRequestedAt)}
          hasStory={Boolean(settings?.myStory?.trim())}
        />
      </div>
    </div>
  );
}
