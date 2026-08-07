import Link from "next/link";
import { CheckCircle2, CircleDashed, Plug, Settings } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const integrations = [
  {
    name: "Stripe",
    description: "Checkout, abonnementen, customer portal en facturatie.",
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
    href: "/admin/billing",
  },
  {
    name: "Resend",
    description: "Transactionele e-mails, uitnodigingen en reminders.",
    configured: Boolean(process.env.RESEND_API_KEY),
    href: "/admin/test-email",
  },
  {
    name: "Shopify",
    description: "Productkoppelingen en recepten/product-sync.",
    configured: Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET),
    href: "/admin/recipes",
  },
  {
    name: "OpenAI",
    description: "AI kennisbank, inzichten en assistentfuncties.",
    configured: Boolean(process.env.OPENAI_API_KEY),
    href: "/admin/ai",
  },
  {
    name: "Daily",
    description: "Live video voor coaching rooms.",
    configured: Boolean(process.env.DAILY_API_KEY),
    href: "/admin/sessions",
  },
  {
    name: "Google Calendar + Drive",
    description: "Coach-agenda sync en automatische opslag van coachingopnames in Google Drive.",
    configured: Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET),
    href: "/api/calendar/connect/google",
  },
  {
    name: "Outlook Calendar",
    description: "Coach-agenda sync met externe Microsoft/Outlook afspraken.",
    configured: Boolean(process.env.MICROSOFT_CALENDAR_CLIENT_ID && process.env.MICROSOFT_CALENDAR_CLIENT_SECRET),
    href: "/api/calendar/connect/microsoft",
  },
  {
    name: "Calendly",
    description: "Calendly afspraken automatisch tonen in de coach-agenda.",
    configured: Boolean(process.env.CALENDLY_CLIENT_ID && process.env.CALENDLY_CLIENT_SECRET),
    href: "/api/calendar/connect/calendly",
  },
  {
    name: "Cloudflare R2",
    description: "Bestandsopslag voor uploads, media en bijlagen.",
    configured: Boolean(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID),
    href: "/admin/branding",
  },
];

export default async function AdminIntegrationsSettingsPage() {
  await requireAdminUser("/admin/settings/integrations");

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="app-kicker">Instellingen</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-4xl">
            Integraties
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Controleer welke externe diensten gekoppeld zijn en open meteen het bijhorende beheer.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => (
            <Card key={integration.name} className="app-halo">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5 text-primary" />
                  {integration.name}
                </CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-1 text-sm text-muted-foreground">
                  {integration.configured ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-amber-600" />
                  )}
                  {integration.configured ? "Geconfigureerd" : "Nog niet volledig ingesteld"}
                </span>
                <Button asChild variant="outline" className="w-full justify-center">
                  <Link href={integration.href}>
                    <Settings className="mr-2 h-4 w-4" />
                    Open beheer
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
