import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>

      {/* Main Content */}
      <main className="md:ml-64">
        <div className="min-h-screen pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav user={user} />
    </div>
  );
}
