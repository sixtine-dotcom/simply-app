import { getTenantBrandingFromHeaders } from "@/lib/branding";
import { MagicLinkLoginForm } from "./magic-link-login-form";

type LoginPageProps = {
  searchParams?: {
    next?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = searchParams?.next || "/";
  const branding = await getTenantBrandingFromHeaders();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {branding.loginVideoUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={branding.loginVideoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${branding.loginBackgroundUrl || "/auth-login-bg.jpg"}')`,
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 42%, rgba(255, 255, 255, 0.22) 100%)",
        }}
      />

      <div className="relative z-10 grid min-h-screen gap-10 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 xl:px-16">
        <div className="hidden flex-col text-white lg:flex">
          <div className="flex items-center gap-4 pt-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.platformName} className="h-12 w-auto rounded-md" />
            ) : (
              <div className="font-display text-4xl tracking-wide text-[#1f4a29]">{branding.platformName}</div>
            )}
          </div>

          <div className="mx-auto mt-[22vh] max-w-4xl text-center">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-[#1f4a29]">The Simply Lifestyle</p>
            <h1 className="font-display text-3xl leading-[1.16] xl:text-[3.25rem]">
              Naar meer energie, hormonale balans en een leefstijl die je kan volhouden op lange termijn.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/82">
              In de Simply leeromgeving leer je hoe je die levensstijl van A tot Z in praktijk zet.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/35 bg-white/45 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.platformName} className="h-10 w-auto rounded" />
              ) : (
                <img
                  src="/simply-leaf-logo.jpg"
                  alt={branding.platformName}
                  className="h-11 w-11 rounded-full object-cover ring-1 ring-white/70"
                />
              )}
              <div>
                <p className="font-display text-2xl text-[#1f4a29]">{branding.platformName}</p>
                <p className="text-sm text-slate-600">Welkom terug</p>
              </div>
            </div>

            <MagicLinkLoginForm nextPath={nextPath} />

            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>{branding.footerText}</span>
              {!branding.hidePoweredBy ? <span>Powered by Simply in Balance</span> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
