import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Simply | Jouw persoonlijke platform",
  description: "Online leerplatform en community van Simply in Balance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className={`${montserrat.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
