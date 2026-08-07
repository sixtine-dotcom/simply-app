import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getBrandingCssVariables, getTenantBrandingFromHeaders } from "@/lib/branding";
import { PwaRegister } from "@/components/pwa-register";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const viewport: Viewport = {
  themeColor: "#5f7f6f",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getTenantBrandingFromHeaders();

  return {
    applicationName: branding.platformName,
    title: `${branding.platformName} | Jouw persoonlijke platform`,
    description: `Online leerplatform en community van ${branding.platformName}`,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: branding.platformName,
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: branding.faviconUrl || [
        { url: "/favicon.png", sizes: "64x64", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getTenantBrandingFromHeaders();
  const hasClerkConfig = Boolean(
    process.env.ENABLE_CLERK_AUTH === "true" &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY
  );
  const content = (
    <>
      {branding.customCss ? (
        <style dangerouslySetInnerHTML={{ __html: branding.customCss }} />
      ) : null}
      <PwaRegister />
      {children}
      <Toaster />
    </>
  );

  return (
    <html lang="nl">
      <body
        className={`${montserrat.variable} font-sans antialiased`}
        style={getBrandingCssVariables(branding)}
      >
        {hasClerkConfig ? (
          <ClerkProvider>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
