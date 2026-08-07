import type { Metadata } from "next";
import { InstallPanel } from "./install-panel";

export const metadata: Metadata = {
  title: "Simply App installeren",
  description: "Installeer Simply App op smartphone, tablet of desktop.",
};

export default function AppInstallPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] py-6 text-[#172018] sm:py-10">
      <InstallPanel />
    </main>
  );
}
